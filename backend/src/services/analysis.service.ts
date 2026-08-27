import { v4 as uuidv4 } from "uuid";
import { query } from "../config/database.js";
import type { AnalysisRecord, AnalysisResponseData, JobGapAnalysis } from "../types/analysis.types.js";
import { geminiService, type GeminiServiceContract } from "./gemini.service.js";
import { jobPostingService, type JobPostingServiceContract } from "./job.service.js";
import { resumeService, type ResumeServiceContract } from "./resume.service.js";

export interface CreateAnalysisInput {
  resumeFile: Express.Multer.File;
  jobDescription?: string;
  jobUrl?: string;
  jobTitle?: string;
  company?: string;
}

export interface AnalysisServiceContract {
  createAnalysis(input: CreateAnalysisInput): Promise<AnalysisResponseData>;
  getAnalysis(id: string): Promise<AnalysisResponseData | null>;
  listAnalyses(limit: number): Promise<AnalysisResponseData[]>;
  deleteAnalysis(id: string): Promise<boolean>;
}

type AnalysisRow = {
  id: string;
  job_title: string | null;
  company: string | null;
  job_url: string | null;
  resume_filename: string | null;
  match_score: number;
  result: JobGapAnalysis;
  created_at: Date | string;
};

const mapRowToRecord = (row: AnalysisRow): AnalysisRecord => ({
  id: row.id,
  jobTitle: row.job_title,
  company: row.company,
  jobUrl: row.job_url,
  resumeFilename: row.resume_filename,
  matchScore: row.match_score,
  result: row.result,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
});

const mapRecordToResponse = (record: AnalysisRecord): AnalysisResponseData => ({
  analysisId: record.id,
  jobTitle: record.jobTitle,
  company: record.company,
  jobUrl: record.jobUrl,
  resumeFilename: record.resumeFilename,
  analysis: record.result,
  createdAt: record.createdAt,
});

export class AnalysisService implements AnalysisServiceContract {
  constructor(
    private readonly resumeProcessor: ResumeServiceContract = resumeService,
    private readonly analyzer: GeminiServiceContract = geminiService,
    private readonly jobPostings: JobPostingServiceContract = jobPostingService,
  ) {}

  async createAnalysis(input: CreateAnalysisInput): Promise<AnalysisResponseData> {
    const jobInput = await this.resolveJobInput(input);
    const processedResume = await this.resumeProcessor.processResume(input.resumeFile);
    const analysis = await this.analyzer.generateAnalysis({
      resume: processedResume,
      jobDescription: jobInput.jobDescription,
      jobTitle: jobInput.jobTitle,
      company: jobInput.company,
    });

    const id = uuidv4();
    const result = await query<AnalysisRow>(
      `INSERT INTO analyses (
        id,
        job_title,
        company,
        job_url,
        resume_filename,
        match_score,
        result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, job_title, company, job_url, resume_filename, match_score, result, created_at`,
      [
        id,
        jobInput.jobTitle ?? null,
        jobInput.company ?? null,
        jobInput.jobUrl ?? null,
        input.resumeFile.originalname,
        analysis.matchScore,
        JSON.stringify(analysis),
      ],
    );

    return mapRecordToResponse(mapRowToRecord(result.rows[0]));
  }

  async getAnalysis(id: string): Promise<AnalysisResponseData | null> {
    const result = await query<AnalysisRow>(
      `SELECT id, job_title, company, job_url, resume_filename, match_score, result, created_at
       FROM analyses
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ? mapRecordToResponse(mapRowToRecord(result.rows[0])) : null;
  }

  async listAnalyses(limit: number): Promise<AnalysisResponseData[]> {
    const result = await query<AnalysisRow>(
      `SELECT id, job_title, company, job_url, resume_filename, match_score, result, created_at
       FROM analyses
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map((row) => mapRecordToResponse(mapRowToRecord(row)));
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    const result = await query("DELETE FROM analyses WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private async resolveJobInput(input: CreateAnalysisInput): Promise<{
    jobDescription: string;
    jobTitle?: string;
    company?: string;
    jobUrl?: string;
  }> {
    if (!input.jobUrl) {
      return {
        jobDescription: input.jobDescription ?? "",
        jobTitle: input.jobTitle,
        company: input.company,
      };
    }

    const extractedPosting = await this.jobPostings.extractFromUrl(input.jobUrl);

    return {
      jobDescription: input.jobDescription ?? extractedPosting.jobDescription,
      jobTitle: input.jobTitle ?? extractedPosting.jobTitle,
      company: input.company ?? extractedPosting.company,
      jobUrl: extractedPosting.sourceUrl,
    };
  }
}

export const analysisService = new AnalysisService();
