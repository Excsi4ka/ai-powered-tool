import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { AppError } from "../middleware/error.middleware.js";

export type ResumeSourceType = "pdf" | "docx" | "txt";

export type ProcessedResume =
  | {
      type: "pdf";
      sourceType: "pdf";
      filePath: string;
      mimeType: "application/pdf";
      originalFilename: string;
    }
  | {
      type: "text";
      sourceType: "docx" | "txt";
      text: string;
      originalFilename: string;
    };

export interface ResumeServiceContract {
  processResume(file: Express.Multer.File): Promise<ProcessedResume>;
}

const MAX_EXTRACTED_TEXT_CHARS = 120000;

const extensionToSourceType = (filename: string): ResumeSourceType | null => {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") {
    return "pdf";
  }

  if (ext === ".docx") {
    return "docx";
  }

  if (ext === ".txt") {
    return "txt";
  }

  return null;
};

const normalizeExtractedText = (text: string): string => text.replace(/\r\n/g, "\n").trim();

export class ResumeService implements ResumeServiceContract {
  async processResume(file: Express.Multer.File): Promise<ProcessedResume> {
    const sourceType = extensionToSourceType(file.originalname);

    if (!sourceType) {
      throw new AppError("INVALID_FILE_TYPE", "Resume must be PDF, DOCX, or TXT.", 400);
    }

    if (sourceType === "pdf") {
      return {
        type: "pdf",
        sourceType,
        filePath: file.path,
        mimeType: "application/pdf",
        originalFilename: file.originalname,
      };
    }

    const text = sourceType === "docx" ? await this.extractDocxText(file.path) : await this.extractTxtText(file.path);

    if (!text) {
      throw new AppError("EMPTY_RESUME", "Resume text could not be extracted from the uploaded file.", 400);
    }

    return {
      type: "text",
      sourceType,
      text: text.slice(0, MAX_EXTRACTED_TEXT_CHARS),
      originalFilename: file.originalname,
    };
  }

  private async extractDocxText(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return normalizeExtractedText(result.value);
  }

  private async extractTxtText(filePath: string): Promise<string> {
    const text = await fs.readFile(filePath, "utf8");
    return normalizeExtractedText(text);
  }
}

export const resumeService = new ResumeService();
