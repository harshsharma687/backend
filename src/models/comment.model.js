import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    owner:{
         type: Schema.Types.ObjectId,
      ref: "User",
    }
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

// Comments are always listed per video/post, newest first.
commentSchema.index({ video: 1, createdAt: -1 });
commentSchema.index({ post: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
