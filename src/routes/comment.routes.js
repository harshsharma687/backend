import { Router } from "express";
import {
  createComment,
  getVideoComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/video/:videoId").get(getVideoComments).post(verifyJWT, createComment);
router.route("/:commentId").patch(verifyJWT, updateComment).delete(verifyJWT, deleteComment);

export default router;
