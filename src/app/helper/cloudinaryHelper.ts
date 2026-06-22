import { v2 as cloudinary } from "cloudinary";
import config from "../config";

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

const uploadImage = async (
  filePath: string,
  folder: string
): Promise<{ url: string; publicId: string }> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `krishibari/${folder}`,
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
  return { url: result.secure_url, publicId: result.public_id };
};

const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

export const cloudinaryHelper = {
  uploadImage,
  deleteImage,
};
