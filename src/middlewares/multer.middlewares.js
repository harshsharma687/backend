import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const imageFields = new Set(["avatar", "coverImage", "thumbnail", "image"]);

const fileFilter = (req, file, cb) => {
  const isAllowedImage = imageFields.has(file.fieldname) && file.mimetype.startsWith("image/");
  const isAllowedVideo = file.fieldname === "videoFile" && file.mimetype.startsWith("video/");

  if (isAllowedImage || isAllowedVideo) return cb(null, true);
  return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Posts accept a single image only.
export const postImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
