import fs from "node:fs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisController } from "../src/controllers/analysis.controller.js";
import { MAX_RESUME_SIZE_BYTES } from "../src/middleware/upload.middleware.js";
import type { AnalysisServiceContract, CreateAnalysisInput } from "../src/services/analysis.service.js";
import type { AnalysisResponseData } from "../src/types/analysis.types.js";
import { createApp } from "../src/app.js";

const mockAnalysis: AnalysisResponseData = {
  analysisId: "11111111-1111-4111-8111-111111111111",
  jobTitle: "Backend Developer",
  company: "Example Company",
  resumeFilename: "resume.txt",
  createdAt: "2026-08-27T00:00:00.000Z",
  analysis: {
    matchScore: 82,
    matchLevel: "strong",
    summary: "82% estimated resume-to-job compatibility.",
    matchingSkills: [],
    missingSkills: [],
    partialMatches: [],
    experienceAnalysis: {
      status: "meets",
      explanation: "The resume shows relevant backend experience.",
    },
    educationAnalysis: {
      status: "not_specified",
      explanation: "The job description does not specify an education requirement.",
    },
    keywordGaps: [],
    strengths: [],
    resumeSuggestions: [],
    nextSteps: [],
  },
};

const createMockService = () => {
  const service: AnalysisServiceContract = {
    createAnalysis: vi.fn(async (_input: CreateAnalysisInput) => mockAnalysis),
    getAnalysis: vi.fn(async () => null),
    listAnalyses: vi.fn(async () => []),
    deleteAnalysis: vi.fn(async () => false),
  };

  return service;
};

describe("analysis routes", () => {
  let service: AnalysisServiceContract;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    service = createMockService();
    app = createApp({
      analysisController: new AnalysisController(service),
    });
  });

  it("rejects POST /api/analyses when resume is missing", async () => {
    const response = await request(app)
      .post("/api/analyses")
      .field("jobDescription", "Build and maintain backend APIs.");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "MISSING_RESUME",
      },
    });
    expect(service.createAnalysis).not.toHaveBeenCalled();
  });

  it("rejects POST /api/analyses when jobDescription is missing", async () => {
    const response = await request(app)
      .post("/api/analyses")
      .attach("resume", Buffer.from("Node.js and PostgreSQL experience."), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(service.createAnalysis).not.toHaveBeenCalled();
  });

  it("rejects unsupported resume file types", async () => {
    const response = await request(app)
      .post("/api/analyses")
      .field("jobDescription", "Build and maintain backend APIs.")
      .attach("resume", Buffer.from("not a supported resume"), {
        filename: "resume.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "INVALID_FILE_TYPE",
      },
    });
    expect(service.createAnalysis).not.toHaveBeenCalled();
  });

  it("rejects files larger than 5 MB", async () => {
    const oversizedResume = Buffer.alloc(MAX_RESUME_SIZE_BYTES + 1, "a");

    const response = await request(app)
      .post("/api/analyses")
      .field("jobDescription", "Build and maintain backend APIs.")
      .attach("resume", oversizedResume, {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
      },
    });
    expect(service.createAnalysis).not.toHaveBeenCalled();
  });

  it("returns 404 for a nonexistent analysis", async () => {
    const response = await request(app).get("/api/analyses/00000000-0000-4000-8000-000000000000");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "ANALYSIS_NOT_FOUND",
      },
    });
  });

  it("deletes temporary uploaded files after successful analysis creation", async () => {
    let uploadedPath = "";

    vi.mocked(service.createAnalysis).mockImplementationOnce(async (input: CreateAnalysisInput) => {
      uploadedPath = input.resumeFile.path;
      expect(fs.existsSync(uploadedPath)).toBe(true);
      return mockAnalysis;
    });

    const response = await request(app)
      .post("/api/analyses")
      .field("jobDescription", "Build and maintain backend APIs.")
      .field("jobTitle", "Backend Developer")
      .field("company", "Example Company")
      .attach("resume", Buffer.from("Node.js and PostgreSQL experience."), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        analysisId: mockAnalysis.analysisId,
      },
    });
    expect(uploadedPath).not.toBe("");
    expect(fs.existsSync(uploadedPath)).toBe(false);
  });
});
