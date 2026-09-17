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

export const Post = mongoose.model("Post", postSchema);
