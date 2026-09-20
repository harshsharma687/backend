import { Router } from "express";
import { toggleLike, getLikeCount, getLikedVideos } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/toggle").post(verifyJWT, toggleLike);
router.route("/count").post(getLikeCount);
router.route("/videos").get(verifyJWT, getLikedVideos);

export default router;
