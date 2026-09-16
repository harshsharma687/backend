import { Tweet } from "../models/tweet.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "Tweet content is required");

  const tweet = await Tweet.create({ content: content.trim(), owner: req.user._id });
  return res.status(201).json(new ApiResponse(201, tweet, "Tweet created"));
});

const getTweets = asyncHandler(async (req, res) => {
  const tweets = await Tweet.find()
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, tweets, "Tweets fetched"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw new ApiError(400, "Tweet content is required");

  const tweet = await Tweet.findOneAndUpdate(
    { _id: req.params.tweetId, owner: req.user._id },
    { $set: { content: content.trim() } },
    { new: true, runValidators: true }
  );

  if (!tweet) throw new ApiError(404, "Tweet not found");
  return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const tweet = await Tweet.findOneAndDelete({
    _id: req.params.tweetId,
    owner: req.user._id,
  });

  if (!tweet) throw new ApiError(404, "Tweet not found");
  return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted"));
});

export { createTweet, getTweets, updateTweet, deleteTweet };
