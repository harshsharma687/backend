import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!content?.trim()) throw new ApiError(400, "Comment content is required");

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, comment, "Comment created"));
});

const getVideoComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ video: req.params.videoId })
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, comments, "Comments fetched"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "Comment content is required");

  const comment = await Comment.findOneAndUpdate(
    { _id: req.params.commentId, owner: req.user._id },
    { $set: { content: content.trim() } },
    { new: true, runValidators: true }
  );

  if (!comment) throw new ApiError(404, "Comment not found");
  return res.status(200).json(new ApiResponse(200, comment, "Comment updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOneAndDelete({
    _id: req.params.commentId,
    owner: req.user._id,
  });

  if (!comment) throw new ApiError(404, "Comment not found");
  return res.status(200).json(new ApiResponse(200, {}, "Comment deleted"));
});

export { createComment, getVideoComments, updateComment, deleteComment };
