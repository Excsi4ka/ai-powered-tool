export type SkillImportance = "required" | "preferred" | "other";
export type Priority = "high" | "medium" | "low";

export interface JobGapAnalysis {
  matchScore: number;
  matchLevel: "low" | "moderate" | "good" | "strong" | "excellent";
  summary: string;
  matchingSkills: Array<{
    skill: string;
    evidence: string;
    importance: SkillImportance;
  }>;
  missingSkills: Array<{
    skill: string;
    importance: SkillImportance;
    reason: string;
  }>;
  partialMatches: Array<{
    skill: string;
    resumeEvidence: string;
    gap: string;
  }>;
  experienceAnalysis: {
    status: "meets" | "partially_meets" | "does_not_meet" | "unclear";
    explanation: string;
  };
  educationAnalysis: {
    status: "meets" | "partially_meets" | "does_not_meet" | "not_specified";
    explanation: string;
  };
  keywordGaps: string[];
  strengths: string[];
  resumeSuggestions: Array<{
    section: string;
    issue: string;
    suggestion: string;
    priority: Priority;
  }>;
  nextSteps: Array<{
    action: string;
    reason: string;
    priority: Priority;
  }>;
}

export interface AnalysisRecord {
  id: string;
  jobTitle: string | null;
  company: string | null;
  jobUrl: string | null;
  resumeFilename: string | null;
  matchScore: number;
  result: JobGapAnalysis;
  createdAt: string;
}

export interface AnalysisResponseData {
  analysisId: string;
  jobTitle: string | null;
  company: string | null;
  jobUrl: string | null;
  resumeFilename: string | null;
  analysis: JobGapAnalysis;
  createdAt: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type CreateAnalysisResponse = ApiSuccessResponse<AnalysisResponseData>;
