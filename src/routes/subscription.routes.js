import { Router } from "express";
import {
  getChannelSubscribers,
  getSubscribedChannels,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/user").get(verifyJWT, getSubscribedChannels);
router.route("/c/:channelId")
  .get(getChannelSubscribers)
  .post(verifyJWT, toggleSubscription);

export default router;
