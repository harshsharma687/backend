import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const ownerFields = "username fullname avatar";

const normalisePagination = (value, fallback, maximum) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};

const getAllVideos = asyncHandler(async (req, res) => {
  const page = normalisePagination(req.query.page, 1, 100000);
  const limit = normalisePagination(req.query.limit, 12, 48);
  const query = req.query.query?.trim();
  const owner = req.query.userId;
  const sortBy = ["createdAt", "views", "title"].includes(req.query.sortBy)
    ? req.query.sortBy
    : "createdAt";
  const sortDirection = req.query.sortType === "asc" ? 1 : -1;

  const filter = { isPublished: true };
  // Backwards-compatible params: `userId` still works; `userIds` accepts a
  // comma-separated list (used by the subscriptions feed in one request), and
  // `username` resolves a channel page without a preceding user lookup.
  const ownerIds = [];
  if (owner) ownerIds.push(...owner.split(",").map((id) => id.trim()).filter(Boolean));
  if (req.query.userIds) ownerIds.push(...String(req.query.userIds).split(",").map((id) => id.trim()).filter(Boolean));
  if (ownerIds.length === 1) filter.owner = ownerIds[0];
  else if (ownerIds.length > 1) filter.owner = { $in: ownerIds };
  if (req.query.username?.trim()) filter.owner = { $in: await User.find({ username: req.query.username.trim().toLowerCase() }).select("_id").lean() };
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .populate("owner", ownerFields)
      .sort({ [sortBy]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit),
    Video.countDocuments(filter),
  ]);

  // Trim heavy/unused fields: `videofile` is a huge CDN URL the grid never
  // needs, and Mongoose bookkeeping (`__v`) is internal. `hasFile` lets the
  // UI know a playable file exists without shipping the URL.
  const payloadVideos = videos.map(({ _doc }) => {
    const { videofile, __v, ...rest } = _doc;
    return { ...rest, hasFile: Boolean(videofile) };
  });

  return res.status(200).json(
    new ApiResponse(200, {
      videos: payloadVideos,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }, "Videos fetched")
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  // Direct-upload path: the browser uploads the video/thumbnail to Cloudinary
  // itself (signed upload) and sends us the resulting URLs as JSON. Serverless
  // platforms cap request bodies at a few MB, which is what made uploads fail
  // with 413 in production — this path never streams media through the server.
  // The multipart path below keeps working for API clients that post files.
  const jsonVideoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl.trim() : "";
  const jsonThumbUrl = typeof req.body?.thumbnailUrl === "string" ? req.body.thumbnailUrl.trim() : "";
  if (jsonVideoUrl && jsonThumbUrl) {
    const isCloudinaryUrl = (value) => /^https:\/\/res\.cloudinary\.com\/[\w-]+\//.test(value);
    if (!isCloudinaryUrl(jsonVideoUrl) || !isCloudinaryUrl(jsonThumbUrl)) {
      throw new ApiError(400, "Upload URLs must be Cloudinary URLs");
    }
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) throw new ApiError(400, "Title is required");
    const requestedDuration = Number(req.body.duration);
    const video = await Video.create({
      videofile: jsonVideoUrl,
      thumbnail: jsonThumbUrl,
      title,
      description: typeof req.body.description === "string" ? req.body.description.trim() : "",
      duration:
        Number.isFinite(requestedDuration) && requestedDuration > 0
          ? Math.round(requestedDuration)
          : 1,
      owner: req.user._id,
    });
    const populatedVideo = await video.populate("owner", ownerFields);
    return res.status(201).json(new ApiResponse(201, populatedVideo, "Video published"));
  }

  const { title, description } = req.body;
  const videoFilePath = req.files?.videoFile?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }
  if (!videoFilePath || !thumbnailPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const [videoUpload, thumbnailUpload] = await Promise.all([
    uploadOnCloudinary(videoFilePath),
    uploadOnCloudinary(thumbnailPath),
  ]);

  if (!videoUpload?.url || !thumbnailUpload?.url) {
    throw new ApiError(500, "Video upload failed");
  }

  const requestedDuration = Number(req.body.duration);
  const video = await Video.create({
    videofile: videoUpload.secure_url || videoUpload.url,
    thumbnail: thumbnailUpload.secure_url || thumbnailUpload.url,
    title: title.trim(),
    // Cloudinary video upload gives duration in seconds; use it when the
    // client doesn't send one. Keep it > 0 or the model validation rejects
    // the video with a confusing "duration required" error.
    duration:
      Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.round(requestedDuration)
        : Math.max(1, Math.round(videoUpload.duration || 0)),
    owner: req.user._id,
  });

  const populatedVideo = await video.populate("owner", ownerFields);
  return res.status(201).json(new ApiResponse(201, populatedVideo, "Video published"));
});

const getVideoById = asyncHandler(async (req, res) => {
  // Malformed ids (stale links, "undefined") must 404, not crash as a 500
  // CastError inside Mongo.
  if (!mongoose.isValidObjectId(req.params.videoId)) {
    throw new ApiError(404, "Video not found");
  }
  const video = await Video.findOneAndUpdate(
    { _id: req.params.videoId, isPublished: true },
    { $inc: { views: 1 } },
    { new: true }
  ).populate("owner", ownerFields);

  if (!video) throw new ApiError(404, "Video not found");

  // Watch-history bookkeeping must never delay playback: the response is sent
  // immediately, the history update runs in the background (the catch keeps an
  // update failure from becoming an unhandled rejection).
  if (req.user) {
    User.findByIdAndUpdate(
      req.user._id,
      { $pull: { watchHistory: video._id } }
    )
      .then(() =>
        User.findByIdAndUpdate(
          req.user._id,
          { $push: { watchHistory: { $each: [video._id], $position: 0, $slice: 100 } } }
        )
      )
      .catch((error) => console.error("watch-history update failed:", error?.message || error));
  }

  return res.status(200).json(new ApiResponse(200, video, "Video fetched"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const updates = {};
  ["title", "description"].forEach((field) => {
    if (typeof req.body[field] === "string" && req.body[field].trim()) {
      updates[field] = req.body[field].trim();
    }
  });

  if (req.file?.path) {
    const thumbnail = await uploadOnCloudinary(req.file.path);
    if (!thumbnail?.url) throw new ApiError(500, "Thumbnail upload failed");
    updates.thumbnail = thumbnail.secure_url || thumbnail.url;
  }

  if (!Object.keys(updates).length) {
    throw new ApiError(400, "Provide a title, description, or thumbnail");
  }

  const video = await Video.findOneAndUpdate(
    { _id: req.params.videoId, owner: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate("owner", ownerFields);

  if (!video) throw new ApiError(404, "Video not found");
  return res.status(200).json(new ApiResponse(200, video, "Video updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findOneAndDelete({
    _id: req.params.videoId,
    owner: req.user._id,
  });

  if (!video) throw new ApiError(404, "Video not found");

  // Best-effort Cloudinary cleanup — a failed CDN delete should not block
  // the DB delete (the video is already gone for the user).
  await Promise.allSettled([
    deleteFromCloudinary(video.videofile, "video"),
    deleteFromCloudinary(video.thumbnail, "image"),
  ]);

  // Remove orphaned comments, likes and history references.
  await Promise.all([
    Comment.deleteMany({ video: video._id }),
    Like.deleteMany({ video: video._id }),
    User.updateMany(
      { watchHistory: video._id },
      { $pull: { watchHistory: video._id } }
    ),
  ]);

  return res.status(200).json(new ApiResponse(200, {}, "Video deleted"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.videoId, owner: req.user._id });
  if (!video) throw new ApiError(404, "Video not found");

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, video, "Publish status updated"));
});

// Signs a direct-to-Cloudinary upload for the signed-in creator. Only the
// derived signature is returned — the API secret never leaves the server.
const getUploadSignature = asyncHandler(async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "novaplay";
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        timestamp,
        signature,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      },
      "Upload signature generated"
    )
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getUploadSignature,
};
