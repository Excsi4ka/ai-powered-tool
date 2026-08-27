import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(max).optional(),
  );

export const createAnalysisBodySchema = z.object({
  jobDescription: z
    .string({ error: "Job description is required." })
    .trim()
    .min(1, "Job description is required.")
    .max(30000, "Job description must be 30,000 characters or fewer."),
  jobTitle: optionalText(255),
  company: optionalText(255),
});

export const analysisIdParamSchema = z.object({
  id: z.uuid("Analysis id must be a valid UUID."),
});

export const listAnalysesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const importanceSchema = z.enum(["required", "preferred", "other"]);
const prioritySchema = z.enum(["high", "medium", "low"]);

export const jobGapAnalysisSchema = z
  .object({
    matchScore: z.number().min(0).max(100).transform((score) => Math.round(score)),
    matchLevel: z.enum(["low", "moderate", "good", "strong", "excellent"]),
    summary: z.string().min(1),
    matchingSkills: z.array(
      z
        .object({
          skill: z.string().min(1),
          evidence: z.string().min(1),
          importance: importanceSchema,
        })
        .strict(),
    ),
    missingSkills: z.array(
      z
        .object({
          skill: z.string().min(1),
          importance: importanceSchema,
          reason: z.string().min(1),
        })
        .strict(),
    ),
    partialMatches: z.array(
      z
        .object({
          skill: z.string().min(1),
          resumeEvidence: z.string().min(1),
          gap: z.string().min(1),
        })
        .strict(),
    ),
    experienceAnalysis: z
      .object({
        status: z.enum(["meets", "partially_meets", "does_not_meet", "unclear"]),
        explanation: z.string().min(1),
      })
      .strict(),
    educationAnalysis: z
      .object({
        status: z.enum(["meets", "partially_meets", "does_not_meet", "not_specified"]),
        explanation: z.string().min(1),
      })
      .strict(),
    keywordGaps: z.array(z.string().min(1)),
    strengths: z.array(z.string().min(1)),
    resumeSuggestions: z.array(
      z
        .object({
          section: z.string().min(1),
          issue: z.string().min(1),
          suggestion: z.string().min(1),
          priority: prioritySchema,
        })
        .strict(),
    ),
    nextSteps: z.array(
      z
        .object({
          action: z.string().min(1),
          reason: z.string().min(1),
          priority: prioritySchema,
        })
        .strict(),
    ),
  })
  .strict();

export const jobGapAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    matchScore: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Estimated resume-to-job compatibility score from 0 to 100. This is not a hiring probability.",
    },
    matchLevel: {
      type: "string",
      enum: ["low", "moderate", "good", "strong", "excellent"],
    },
    summary: {
      type: "string",
      description: "Concise summary of job-related fit, gaps, and the meaning of the score.",
    },
    matchingSkills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string" },
          evidence: { type: "string" },
          importance: { type: "string", enum: ["required", "preferred", "other"] },
        },
        required: ["skill", "evidence", "importance"],
      },
    },
    missingSkills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string" },
          importance: { type: "string", enum: ["required", "preferred", "other"] },
          reason: { type: "string" },
        },
        required: ["skill", "importance", "reason"],
      },
    },
    partialMatches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string" },
          resumeEvidence: { type: "string" },
          gap: { type: "string" },
        },
        required: ["skill", "resumeEvidence", "gap"],
      },
    },
    experienceAnalysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: {
          type: "string",
          enum: ["meets", "partially_meets", "does_not_meet", "unclear"],
        },
        explanation: { type: "string" },
      },
      required: ["status", "explanation"],
    },
    educationAnalysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: {
          type: "string",
          enum: ["meets", "partially_meets", "does_not_meet", "not_specified"],
        },
        explanation: { type: "string" },
      },
      required: ["status", "explanation"],
    },
    keywordGaps: {
      type: "array",
      items: { type: "string" },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    resumeSuggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          section: { type: "string" },
          issue: { type: "string" },
          suggestion: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["section", "issue", "suggestion", "priority"],
      },
    },
    nextSteps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string" },
          reason: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["action", "reason", "priority"],
      },
    },
  },
  required: [
    "matchScore",
    "matchLevel",
    "summary",
    "matchingSkills",
    "missingSkills",
    "partialMatches",
    "experienceAnalysis",
    "educationAnalysis",
    "keywordGaps",
    "strengths",
    "resumeSuggestions",
    "nextSteps",
  ],
  propertyOrdering: [
    "matchScore",
    "matchLevel",
    "summary",
    "matchingSkills",
    "missingSkills",
    "partialMatches",
    "experienceAnalysis",
    "educationAnalysis",
    "keywordGaps",
    "strengths",
    "resumeSuggestions",
    "nextSteps",
  ],
} as const;

export type CreateAnalysisBody = z.infer<typeof createAnalysisBodySchema>;
