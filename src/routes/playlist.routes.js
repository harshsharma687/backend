import { Router } from "express";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createPlaylist).get(verifyJWT, getUserPlaylists);
router.route("/:playlistId").get(verifyJWT, getPlaylist).delete(verifyJWT, deletePlaylist);
router.route("/:playlistId/videos/:videoId").post(verifyJWT, addVideoToPlaylist).delete(verifyJWT, removeVideoFromPlaylist);

export default router;
