import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
  {
    image: {
      type: String, // cloudinary url
      required: true,
    },
    caption: {
      type: String,
      default: "",
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// The feed sorts by recency; My posts filters by owner.
postSchema.index({ createdAt: -1 });
postSchema.index({ owner: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);
