import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "node:path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const videoExtensions = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);
    const isVideo = videoExtensions.has(path.extname(localFilePath).toLowerCase());
    // NOTE: cloudinary SDK's upload_large() is broken here — it resolves to its
    // internal stream object instead of the upload result, so callers always
    // got an empty object (=> "Video upload failed"). Plain upload() works and
    // also returns the video duration. It supports files up to ~100MB, which
    // matches the Cloudinary free tier.
    const options = isVideo
      ? { resource_type: "video" }
      : { resource_type: "image" };
    const response = await cloudinary.uploader.upload(localFilePath, options);
    // file uploaded successfully
   // console.log("File uploaded successfully to Cloudinary:", response.url);
  if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

// Delete a Cloudinary asset given its full URL. Best-effort: failures are
// logged but not thrown so callers (e.g. video delete) never break on them.
const deleteFromCloudinary = async (fileUrl, resourceType = "image") => {
  try {
    if (!fileUrl) return;
    const match = String(fileUrl).match(/\/upload\/(?:v\d+\/)?([A-Za-z0-9_-]+)(?:\.\w+)?(?:\?.*)?$/);
    const publicId = match?.[1];
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error?.message || error);
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
