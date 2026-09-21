import mongoose from "mongoose";
import { LiveStream } from "../models/liveStream.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { removeParticipant } from "../utils/livekit.js";
import {
  isLivekitConfigured,
  livekitMissingMessage,
  livekitUrlForClient,
  createHostToken,
  createViewerToken,
  deleteRoom,
} from "../utils/livekit.js";

const hostFields = "username fullname avatar";
const MAX_TITLE = 140;
const MAX_DESCRIPTION = 5000;

// ─── Helpers ────────────────────────────────────────────────────────────────

const ownedStreamOr404 = async (streamId, userId) => {
  if (!mongoose.isValidObjectId(streamId)) throw new ApiError(404, "Stream not found");
  const stream = await LiveStream.findOne({ _id: streamId, owner: userId });
  if (!stream) throw new ApiError(404, "Stream not found");
  return stream;
};

const isCloudinaryUrl = (value) => /^https:\/\/res\.cloudinary\.com\/[\w-]+\//.test(value);

const pickMetadata = (body = {}) => {
  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE) : "";
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, MAX_DESCRIPTION) : "";
  return { title, description };
};

// ─── Dashboard & listing ────────────────────────────────────────────────────

// GET /api/v1/live — public: currently-live streams for the Live page rail.
const getLiveNow = asyncHandler(async (req, res) => {
  const streams = await LiveStream.find({ status: "live", visibility: "public" })
    .populate("owner", hostFields)
    .sort({ startedAt: -1 })
    .limit(24)
    .lean();
  return res.status(200).json(new ApiResponse(200, { streams }, "Live streams fetched"));
});

// GET /api/v1/live/mine — the signed-in creator's dashboard listing.
const getMyStreams = asyncHandler(async (req, res) => {
  const streams = await LiveStream.find({ owner: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("recording.video", "title thumbnail duration views isPublished")
    .lean();
  const now = Date.now();
  const groups = {
    live: streams.filter((s) => s.status === "live"),
    scheduled: streams.filter((s) => s.status === "scheduled" && (!s.scheduledFor || new Date(s.scheduledFor).getTime() - now < 15 * 60_000)),
    completed: streams.filter((s) => ["ended", "failed"].includes(s.status)),
    processing: streams.filter((s) => s.status === "processing"),
  };
  // Upcoming = scheduled streams further than 15 minutes away.
  groups.upcoming = streams.filter(
    (s) => s.status === "scheduled" && s.scheduledFor && new Date(s.scheduledFor).getTime() - now >= 15 * 60_000
  );
  return res.status(200).json(new ApiResponse(200, { streams, groups }, "My streams fetched"));
});

// GET /api/v1/live/:id — single stream (public metadata; used by watch page).
const getStream = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Stream not found");
  const stream = await LiveStream.findById(req.params.id).populate("owner", hostFields).populate("recording.video");
  if (!stream) throw new ApiError(404, "Stream not found");
  const isOwner = String(stream.owner._id) === String(req.user?._id || "");
  if (stream.visibility !== "public" && !isOwner) throw new ApiError(404, "Stream not found");
  return res.status(200).json(new ApiResponse(200, { stream, isOwner }, "Stream fetched"));
});

// POST /api/v1/live — schedule a stream (title/description/thumbnail/visibility).
const scheduleStream = asyncHandler(async (req, res) => {
  const { title, description } = pickMetadata(req.body);
  if (!title) throw new ApiError(400, "Stream title is required");
  const thumbnail =
    typeof req.body.thumbnail === "string" && isCloudinaryUrl(req.body.thumbnail)
      ? req.body.thumbnail
      : "";
  const visibility = req.body.visibility === "unlisted" ? "unlisted" : "public";
  const scheduledFor =
    typeof req.body.scheduledFor === "string" && !Number.isNaN(Date.parse(req.body.scheduledFor))
      ? new Date(req.body.scheduledFor)
      : null;

  const stream = await LiveStream.create({
    title,
    description,
    thumbnail,
    visibility,
    scheduledFor,
    owner: req.user._id,
    roomName: `live-${req.user.username}-${Date.now().toString(36)}`,
  });
  return res.status(201).json(new ApiResponse(201, stream, "Stream scheduled"));
});

// PATCH /api/v1/live/:id — edit metadata/visibility while scheduled, live, or ended.
const updateStream = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  const { title, description } = pickMetadata(req.body);
  if (title) stream.title = title;
  if (typeof req.body.description === "string") stream.description = description;
  if (req.body.visibility === "public" || req.body.visibility === "unlisted") {
    stream.visibility = req.body.visibility;
  }
  if (typeof req.body.thumbnail === "string" && isCloudinaryUrl(req.body.thumbnail)) {
    stream.thumbnail = req.body.thumbnail;
  }
  if (typeof req.body.scheduledFor === "string" && !Number.isNaN(Date.parse(req.body.scheduledFor))) {
    stream.scheduledFor = new Date(req.body.scheduledFor);
  }
  await stream.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, stream, "Stream updated"));
});

// DELETE /api/v1/live/:id — delete a scheduled or completed stream (never a
// live one — end it first). Keeps Cloudinary thumbnails tidy best-effort.
const deleteStream = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  if (stream.status === "live") {
    throw new ApiError(400, "End the live stream before deleting it");
  }
  if (stream.thumbnail) await deleteFromCloudinary(stream.thumbnail, "image");
  await stream.deleteOne();
  return res.status(200).json(new ApiResponse(200, {}, "Stream deleted"));
});

// ─── Go live / end ──────────────────────────────────────────────────────────

// GET /api/v1/live/config — frontends probe this before showing "Go Live" so
// an unconfigured server shows an honest message instead of a broken button.
const getLiveConfig = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, { configured: isLivekitConfigured() }, "Live config fetched"));
});

// POST /api/v1/live/:id/go-live — host joins the LiveKit room; stream goes live.
const goLive = asyncHandler(async (req, res) => {
  if (!isLivekitConfigured()) throw new ApiError(503, livekitMissingMessage);
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  if (stream.status === "live") throw new ApiError(409, "Stream is already live");
  if (stream.status === "processing") throw new ApiError(409, "Recording is still finalising");

  stream.status = "live";
  stream.startedAt = stream.startedAt || new Date();
  await stream.save({ validateBeforeSave: false });

  const hostToken = await createHostToken({ userId: String(req.user._id), username: req.user.username, roomName: stream.roomName });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stream,
        wsUrl: livekitUrlForClient(),
        token: hostToken,
      },
      "You are live"
    )
  );
});

// POST /api/v1/live/:id/end — host ends the broadcast; recording finalisation
// happens in a separate finalize call from the host's browser.
const endLive = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  if (stream.status !== "live") throw new ApiError(409, "Stream is not live");

  stream.status = stream.recording.attempts > 0 || req.body?.hasRecording === false ? "ended" : "processing";
  stream.endedAt = new Date();
  await stream.save({ validateBeforeSave: false });
  await deleteRoom(stream.roomName);

  return res.status(200).json(new ApiResponse(200, stream, "Stream ended"));
});

// ─── Recording finalisation ─────────────────────────────────────────────────

// POST /api/v1/live/:id/recording — multipart: the host's browser captured the
// broadcast with MediaRecorder and now uploads the file. The server uploads it
// to Cloudinary and creates the Video record. Idempotent-ish: retries replace
// the previous failed attempt's data.
const uploadRecording = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  if (stream.recording.status === "ready") {
    throw new ApiError(409, "Recording already finalised");
  }
  const filePath = req.file?.path;
  if (!filePath) throw new ApiError(400, "Recording file is required");

  stream.recording.status = "processing";
  stream.recording.attempts += 1;
  stream.recording.error = "";
  stream.status = "processing";
  await stream.save({ validateBeforeSave: false });

  // Catch every upload failure (bad file, Cloudinary outage, network) here so
  // the stream is always marked "failed" with a retry — never stuck in
  // "processing". The raw MediaRecorder capture stays uploaded for retry.
  let recording = null;
  try {
    recording = await uploadOnCloudinary(filePath);
  } catch {
    recording = null;
  }
  if (!recording?.secure_url && !recording?.url) {
    stream.recording.status = "failed";
    stream.recording.error = "Cloudinary upload failed — try again from the dashboard";
    stream.status = "failed";
    await stream.save({ validateBeforeSave: false });
    throw new ApiError(502, "Could not store the recording. You can retry from the dashboard.");
  }

  const duration = Math.max(1, Math.round(Number(recording.duration) || 0));
  // Cloudinary can generate a poster frame from the video itself when no
  // thumbnail was captured on the live page: insert `so_auto` after /video/upload.
  const rawUrl = recording.secure_url || recording.url;
  const videoUrl = String(rawUrl);
  const derivedThumbnail = stream.thumbnail || videoUrl.replace("/video/upload/", "/video/upload/so_auto,w_640,h_360,c_fill,q_auto,f_jpg/");
  let video = null;
  try {
    video = await Video.create({
      videofile: videoUrl,
      // derivedThumbnail always matches the videofile URL (same public id), so
      // the required-thumbnail validation can never fail here.
      thumbnail: derivedThumbnail,
      title: stream.title,
      description: stream.description,
      duration,
      owner: req.user._id,
      isPublished: true,
    });
  } catch (videoError) {
    // Never leave the recording as "processing" with orphaned media: roll the
    // uploaded file back and mark the stream failed with a retry available.
    await deleteFromCloudinary(videoUrl, "video").catch(() => {});
    stream.recording.status = "failed";
    stream.recording.error = "Could not create the video record: " + String(videoError.message || "validation failed").slice(0, 200);
    stream.status = "failed";
    await stream.save({ validateBeforeSave: false });
    throw new ApiError(500, "Recording stored but saving the video failed. You can retry from the dashboard.");
  }

  stream.recording.status = "ready";
  stream.recording.video = video._id;
  stream.status = "ended";
  await stream.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, { stream, video }, "Recording saved"));
});

// POST /api/v1/live/:id/recording-failed — the browser hit an unrecoverable
// recorder error; mark the stream failed so the dashboard offers a retry.
const markRecordingFailed = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  if (stream.recording.status === "ready") throw new ApiError(409, "Recording already finalised");
  stream.recording.status = "failed";
  stream.recording.error = String(req.body?.error || "Recording failed on the host device").slice(0, 500);
  if (stream.status === "processing") stream.status = "failed";
  await stream.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, stream, "Recording marked failed"));
});

// ─── Viewing & chat ─────────────────────────────────────────────────────────

// POST /api/v1/live/:id/join — viewers get a LiveKit subscribe token + the
// stream snapshot. Guests may join public streams (req.user may be undefined);
// private streams still require the owner.
const joinStream = asyncHandler(async (req, res) => {
  if (!isLivekitConfigured()) throw new ApiError(503, livekitMissingMessage);
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Stream not found");
  const stream = await LiveStream.findById(req.params.id);
  if (!stream || (stream.visibility !== "public" && String(stream.owner) !== String(req.user?._id))) {
    throw new ApiError(404, "Stream not found");
  }
  if (stream.status !== "live") throw new ApiError(409, "Stream is not live");

  // Blocked users cannot re-join a running stream.
  const userIdStr = req.user ? String(req.user._id) : null;
  if (userIdStr && stream.blockedViewerIds?.includes(userIdStr)) {
    throw new ApiError(403, "You have been removed from this stream by the host.");
  }

  const viewerToken = await createViewerToken({ userId: userIdStr, username: req.user?.username, roomName: stream.roomName });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stream,
        wsUrl: livekitUrlForClient(),
        token: viewerToken,
        // Moderation state so the client can grey out the chat input correctly.
        moderation: {
          chatLocked: Boolean(stream.chatLocked),
          isMuted: userIdStr ? Boolean(stream.mutedViewerIds?.includes(userIdStr)) : false,
          canChat: !(stream.chatLocked && String(stream.owner) !== userIdStr) && !(userIdStr && stream.mutedViewerIds?.includes(userIdStr)),
        },
      },
      "Joined stream"
    )
  );
});

// POST /api/v1/live/:id/moderate — host-only chat moderation actions.
// body: { action: "mute"|"unmute"|"block"|"unblock"|"lock-chat"|"unlock-chat", viewerId? }
// "block" also ejects the viewer from the running LiveKit room immediately.
const moderateChat = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  if (stream.status !== "live") throw new ApiError(409, "Stream is not live");

  const action = String(req.body?.action || "");
  const viewerId = req.body?.viewerId ? String(req.body.viewerId) : null;
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Stream not found");

  stream.mutedViewerIds = stream.mutedViewerIds || [];
  stream.blockedViewerIds = stream.blockedViewerIds || [];

  switch (action) {
    case "mute": {
      if (!viewerId) throw new ApiError(400, "viewerId is required");
      if (viewerId === String(stream.owner)) throw new ApiError(400, "The host cannot be muted");
      if (!stream.mutedViewerIds.includes(viewerId)) stream.mutedViewerIds.push(viewerId);
      break;
    }
    case "unmute": {
      if (!viewerId) throw new ApiError(400, "viewerId is required");
      stream.mutedViewerIds = stream.mutedViewerIds.filter((id) => id !== viewerId);
      break;
    }
    case "block": {
      if (!viewerId) throw new ApiError(400, "viewerId is required");
      if (viewerId === String(stream.owner)) throw new ApiError(400, "The host cannot be blocked");
      if (!stream.blockedViewerIds.includes(viewerId)) stream.blockedViewerIds.push(viewerId);
      stream.mutedViewerIds = stream.mutedViewerIds.filter((id) => id !== viewerId);
      // Eject immediately: identity matches createViewerToken's pattern.
      removeParticipant(stream.roomName, `viewer-${viewerId}`).catch(() => {});
      break;
    }
    case "unblock": {
      if (!viewerId) throw new ApiError(400, "viewerId is required");
      stream.blockedViewerIds = stream.blockedViewerIds.filter((id) => id !== viewerId);
      break;
    }
    case "lock-chat":
      stream.chatLocked = true;
      break;
    case "unlock-chat":
      stream.chatLocked = false;
      break;
    default:
      throw new ApiError(400, "Unknown moderation action");
  }

  await stream.save({ validateBeforeSave: false });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        moderation: {
          chatLocked: stream.chatLocked,
          mutedViewerIds: stream.mutedViewerIds,
          blockedViewerIds: stream.blockedViewerIds,
        },
      },
      "Moderation updated"
    )
  );
});

// POST /api/v1/live/:id/viewers { count } — host reports its LiveKit stats so
// viewers and dashboards can show real numbers without a stats server.
const reportViewers = asyncHandler(async (req, res) => {
  const stream = await ownedStreamOr404(req.params.id, req.user._id);
  const count = Number(req.body?.count);
  if (Number.isFinite(count) && count >= 0) {
    stream.peakViewers = Math.max(stream.peakViewers || 0, Math.round(count));
    await stream.save({ validateBeforeSave: false });
  }
  return res.status(200).json(new ApiResponse(200, { peakViewers: stream.peakViewers }, "Viewer count updated"));
});

export {
  getLiveNow,
  getMyStreams,
  getStream,
  scheduleStream,
  updateStream,
  deleteStream,
  getLiveConfig,
  goLive,
  endLive,
  uploadRecording,
  markRecordingFailed,
  joinStream,
  moderateChat,
  reportViewers,
};
