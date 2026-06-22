import multer from "multer";
import { existsSync, mkdirSync } from "fs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists (use /tmp for Vercel serverless)
const uploadDir = "/tmp/uploads";
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }
  cb(new Error("Only image uploads are allowed."));
};

export const imageUpload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: imageFileFilter,
});
