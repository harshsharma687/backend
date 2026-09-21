import mongoose, { Schema } from "mongoose";

// A live stream starts life as "scheduled" or goes straight "live" when the
// host joins the LiveKit room. When the host ends it we flip to "processing"
// while the browser-side recording uploads to Cloudinary, then "ended" once
// the recording is registered as a normal Video. "failed" means finalisation
// broke and the host can retry from the dashboard.
const LIVE_STATUSES = ["scheduled", "live", "processing", "ended", "failed"];

const liveStreamSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    thumbnail: { type: String, default: "" },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // LiveKit room identity — unique per stream so room names can never collide
    // between concurrent hosts.
    roomName: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: LIVE_STATUSES,
      default: "scheduled",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "unlisted"],
      default: "public",
    },
    scheduledFor: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    peakViewers: { type: Number, default: 0 },
    // ─── Chat moderation (host controls) ───
    // chatLocked: nobody except the host may send messages.
    // mutedViewerIds: these users cannot send messages (until stream ends).
    // blockedViewerIds: these users are removed on join and cannot re-join.
    chatLocked: { type: Boolean, default: false },
    mutedViewerIds: { type: [String], default: [] },
    blockedViewerIds: { type: [String], default: [] },
    // Recording finalisation bookkeeping (see live.controller.js → finalize).
    recording: {
      status: {
        type: String,
        enum: ["none", "processing", "ready", "failed"],
        default: "none",
      },
      video: { type: Schema.Types.ObjectId, ref: "Video", default: null },
      error: { type: String, default: "" },
      attempts: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Dashboard queries (my streams by recency) and the public "live now" rail.
liveStreamSchema.index({ owner: 1, createdAt: -1 });
liveStreamSchema.index({ status: 1, createdAt: -1 });
liveStreamSchema.index({ visibility: 1, status: 1, createdAt: -1 });

export const LiveStream = mongoose.model("LiveStream", liveStreamSchema);
