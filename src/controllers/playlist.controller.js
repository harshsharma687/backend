import { Playlist } from "../models/playlist.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "Name and description are required");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, playlist, "Playlist created"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({ owner: req.user._id })
    .populate("video", "title thumbnail duration")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, playlists, "Playlists fetched"));
});

const getPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOne({
    _id: req.params.playlistId,
    owner: req.user._id,
  }).populate({
    path: "video",
    select: "title thumbnail duration owner views createdAt",
    populate: { path: "owner", select: "username fullname avatar" },
  });

  if (!playlist) throw new ApiError(404, "Playlist not found");
  return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOneAndUpdate(
    { _id: req.params.playlistId, owner: req.user._id },
    { $addToSet: { video: req.params.videoId } },
    { new: true }
  );

  if (!playlist) throw new ApiError(404, "Playlist not found");
  return res.status(200).json(new ApiResponse(200, playlist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOneAndUpdate(
    { _id: req.params.playlistId, owner: req.user._id },
    { $pull: { video: req.params.videoId } },
    { new: true }
  );

  if (!playlist) throw new ApiError(404, "Playlist not found");
  return res.status(200).json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const playlist = await Playlist.findOneAndDelete({
    _id: req.params.playlistId,
    owner: req.user._id,
  });

  if (!playlist) throw new ApiError(404, "Playlist not found");
  return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
};
