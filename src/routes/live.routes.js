import { Router } from "express";
import {
  getLiveNow,
  getMyStreams,
  getStream,
  scheduleStream,
  updateStream,
  deleteStream,
  getLiveConfig,
  goLive,
  endLive,
  uploadRecording,
  markRecordingFailed,
  joinStream,
  moderateChat,
  reportViewers,
} from "../controllers/live.controller.js";
import { verifyJWT, optionalJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

// Public rail of currently-live streams + config probe for the Go Live button.
router.route("/").get(getLiveNow);
router.route("/config").get(getLiveConfig);

router.route("/mine").get(verifyJWT, getMyStreams);
router.route("/").post(verifyJWT, scheduleStream);

// Declared before "/:id" so Express doesn't treat "recording" as an id.
router.route("/:id/recording").post(verifyJWT, upload.single("recording"), uploadRecording);
router.route("/:id/recording-failed").post(verifyJWT, markRecordingFailed);
router.route("/:id/go-live").post(verifyJWT, goLive);
router.route("/:id/end").post(verifyJWT, endLive);
router.route("/:id/join").post(optionalJWT, joinStream);
router.route("/:id/moderate").post(verifyJWT, moderateChat);
router.route("/:id/viewers").post(verifyJWT, reportViewers);

router
  .route("/:id")
  .get(optionalJWT, getStream)
  .patch(verifyJWT, updateStream)
  .delete(verifyJWT, deleteStream);

export default router;
