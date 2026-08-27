import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import { AppError } from "./error.middleware.js";

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

const uploadDir = path.join(os.tmpdir(), "hirelens-ai-resume-uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedFileTypes = new Map<string, Set<string>>([
  [".pdf", new Set(["application/pdf"])],
  [
    ".docx",
    new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  ],
  [".txt", new Set(["text/plain", "application/octet-stream"])],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeBaseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}-${safeBaseName}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedFileTypes.get(ext);

  if (!allowedMimeTypes || !allowedMimeTypes.has(file.mimetype)) {
    cb(new AppError("INVALID_FILE_TYPE", "Resume must be PDF, DOCX, or TXT.", 400));
    return;
  }

  cb(null, true);
};

export const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_RESUME_SIZE_BYTES,
    files: 1,
  },
});

export const deleteTemporaryUpload = async (file?: Express.Multer.File): Promise<void> => {
  if (!file?.path) {
    return;
  }

  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
};
