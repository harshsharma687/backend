import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const channel = await User.findById(channelId);
  if (!channel) throw new ApiError(404, "Channel not found");

  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (existingSubscription) {
    await existingSubscription.deleteOne();
    return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Subscription removed"));
  }

  await Subscription.create({ subscriber: req.user._id, channel: channelId });
  return res.status(201).json(new ApiResponse(201, { subscribed: true }, "Subscribed to channel"));
});

const getChannelSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscription.find({ channel: req.params.channelId })
    .populate("subscriber", "username fullname avatar")
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ subscriber: req.user._id })
    .populate("channel", "username fullname avatar coverImage")
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, subscriptions, "Subscribed channels fetched"));
});

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels };
