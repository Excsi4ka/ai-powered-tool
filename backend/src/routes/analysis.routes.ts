import { Router } from "express";
import type { AnalysisController } from "../controllers/analysis.controller.js";
import { analysisController } from "../controllers/analysis.controller.js";
import { uploadResume } from "../middleware/upload.middleware.js";

export const createAnalysisRouter = (controller: AnalysisController = analysisController): Router => {
  const router = Router();

  router.get("/", controller.listAnalyses);
  router.post("/", uploadResume.single("resume"), controller.createAnalysis);
  router.get("/:id", controller.getAnalysis);
  router.delete("/:id", controller.deleteAnalysis);

  return router;
};
