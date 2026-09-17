import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// Absolute path (not cwd-relative "./public/temp") so uploads work no matter
// which working directory the process is started from (pm2, systemd, Docker,
// hosting platforms). Also auto-created — many hosts start with a read-only-
// looking fresh checkout where public/temp does not exist yet.
// On read-only-filesystem hosts (Vercel serverless) fall back to the OS temp
// directory (/tmp), which is the only writable location there.
const projectTemp = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "temp");
let TEMP_DIR = projectTemp;
try {
  fs.mkdirSync(projectTemp, { recursive: true });
  fs.accessSync(projectTemp, fs.constants.W_OK);
} catch {
  // Read-only filesystem (Vercel serverless etc.) — /tmp is the only writable spot.
  TEMP_DIR = os.tmpdir();
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.warn(`public/temp not writable — using temp dir: ${TEMP_DIR}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
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
