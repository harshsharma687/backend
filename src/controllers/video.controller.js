import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
  if (owner) filter.owner = owner;
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

  return res.status(200).json(
    new ApiResponse(200, {
      videos,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }, "Videos fetched")
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videoFilePath = req.files?.videoFile?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
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
    description: description.trim(),
    duration: Number.isFinite(requestedDuration) && requestedDuration > 0
      ? requestedDuration
      : Math.round(videoUpload.duration || 0),
    owner: req.user._id,
  });

  const populatedVideo = await video.populate("owner", ownerFields);
  return res.status(201).json(new ApiResponse(201, populatedVideo, "Video published"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findOneAndUpdate(
    { _id: req.params.videoId, isPublished: true },
    { $inc: { views: 1 } },
    { new: true }
  ).populate("owner", ownerFields);

  if (!video) throw new ApiError(404, "Video not found");

  if (req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      user.watchHistory = [
        video._id,
        ...user.watchHistory.filter((id) => id.toString() !== video._id.toString()),
      ].slice(0, 100);
      await user.save({ validateBeforeSave: false });
    }
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
  return res.status(200).json(new ApiResponse(200, {}, "Video deleted"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const video = await Video.findOne({ _id: req.params.videoId, owner: req.user._id });
  if (!video) throw new ApiError(404, "Video not found");

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, video, "Publish status updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
