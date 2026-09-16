import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getTarget = (req) => {
  const target = {};
  const { videoId, commentId, tweetId } = req.body;
  if (videoId) target.video = videoId;
  if (commentId) target.comment = commentId;
  if (tweetId) target.tweet = tweetId;
  if (Object.keys(target).length !== 1) {
    throw new ApiError(400, "Provide exactly one of videoId, commentId, or tweetId");
  }
  return target;
};

const toggleLike = asyncHandler(async (req, res) => {
  const target = getTarget(req);
  const filter = { ...target, likedBy: req.user._id };
  const existingLike = await Like.findOne(filter);

  if (existingLike) {
    await existingLike.deleteOne();
    return res.status(200).json(new ApiResponse(200, { liked: false }, "Like removed"));
  }

  const like = await Like.create(filter);
  return res.status(201).json(new ApiResponse(201, { liked: true, like }, "Like added"));
});

const getLikeCount = asyncHandler(async (req, res) => {
  const target = getTarget(req);
  const count = await Like.countDocuments(target);
  return res.status(200).json(new ApiResponse(200, { count }, "Like count fetched"));
});

export { toggleLike, getLikeCount };
