import { Router } from "express";
import {
  createPost,
  getPosts,
  deletePost,
  togglePostLike,
  getPostComments,
  createPostComment,
  deletePostComment,
} from "../controllers/post.controller.js";
import { verifyJWT, optionalJWT } from "../middlewares/auth.middleware.js";
import { upload, postImage } from "../middlewares/multer.middlewares.js";

const router = Router();

router.route("/").post(verifyJWT, postImage.single("image"), createPost).get(optionalJWT, getPosts);

router.route("/:postId").delete(verifyJWT, deletePost);

router.route("/:postId/like").post(verifyJWT, togglePostLike);

router
  .route("/:postId/comments")
  .get(getPostComments)
  .post(verifyJWT, createPostComment);

router.route("/comments/:commentId").delete(verifyJWT, deletePostComment);

export default router;
