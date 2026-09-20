import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Like lookups are always keyed by target + liker, and the liked-videos page
// sorts by recency. Plain (non-unique) indexes — no migration or data change.
likeSchema.index({ video: 1, likedBy: 1 });
likeSchema.index({ post: 1, likedBy: 1 });
likeSchema.index({ likedBy: 1, createdAt: -1 });

export const Like = mongoose.model("Like", likeSchema);
