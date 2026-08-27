import type { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/error.middleware.js";
import { deleteTemporaryUpload } from "../middleware/upload.middleware.js";
import {
  analysisIdParamSchema,
  createAnalysisBodySchema,
  listAnalysesQuerySchema,
} from "../schemas/analysis.schema.js";
import { analysisService, type AnalysisServiceContract } from "../services/analysis.service.js";
import { sendMessage, sendSuccess } from "../utils/apiResponse.js";

export class AnalysisController {
  constructor(private readonly service: AnalysisServiceContract = analysisService) {}

  createAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let result: Awaited<ReturnType<AnalysisServiceContract["createAnalysis"]>> | undefined;
    let requestError: unknown;

    try {
      if (!req.file) {
        throw new AppError("MISSING_RESUME", "Resume file is required.", 400);
      }

      const body = createAnalysisBodySchema.parse(req.body);
      result = await this.service.createAnalysis({
        resumeFile: req.file,
        jobDescription: body.jobDescription,
        jobTitle: body.jobTitle,
        company: body.company,
      });
    } catch (error) {
      requestError = error;
    }

    try {
      await deleteTemporaryUpload(req.file);
    } catch {
      if (!requestError) {
        requestError = new AppError("TEMP_FILE_CLEANUP_FAILED", "Temporary resume cleanup failed.", 500);
      } else {
        console.error("TEMP_FILE_CLEANUP_FAILED");
      }
    }

    if (requestError) {
      next(requestError);
      return;
    }

    sendSuccess(res, result, 201);
  };

  getAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = analysisIdParamSchema.parse(req.params);
      const result = await this.service.getAnalysis(id);

      if (!result) {
        throw new AppError("ANALYSIS_NOT_FOUND", "Analysis not found.", 404);
      }

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  listAnalyses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit } = listAnalysesQuerySchema.parse(req.query);
      const result = await this.service.listAnalyses(limit);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  deleteAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = analysisIdParamSchema.parse(req.params);
      const deleted = await this.service.deleteAnalysis(id);

      if (!deleted) {
        throw new AppError("ANALYSIS_NOT_FOUND", "Analysis not found.", 404);
      }

      sendMessage(res, "Analysis deleted.");
    } catch (error) {
      next(error);
    }
  };
}

export const analysisController = new AnalysisController();
