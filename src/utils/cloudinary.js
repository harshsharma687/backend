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
    const options = isVideo
      ? { resource_type: "video", chunk_size: 20_000_000 }
      : { resource_type: "image" };
    const response = isVideo
      ? await cloudinary.uploader.upload_large(localFilePath, options)
      : await cloudinary.uploader.upload(localFilePath, options);
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

export { uploadOnCloudinary };
