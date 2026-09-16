import { Router } from "express";
import { toggleLike, getLikeCount } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/toggle").post(verifyJWT, toggleLike);
router.route("/count").post(getLikeCount);

export default router;
