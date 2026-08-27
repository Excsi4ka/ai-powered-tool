# HireLens AI Backend API

Base URL for local development:

```text
http://localhost:5000
```

Quick browser tester:

```text
http://localhost:5000/
http://localhost:5000/scanner
```

All responses use JSON. The Gemini API key is used only on the backend and is never returned to the frontend.

The main scanner accepts either a public job posting URL or pasted job description text. Gemini still performs the resume-to-job comparison and returns the 0-100 compatibility grade. URL extraction is best-effort because some job boards block automated server-side fetches, so the frontend should keep pasted description as a fallback.

## CORS

Allowed frontend origin comes from:

```text
FRONTEND_ORIGIN=http://localhost:3000,https://jobcheck.excsi.dev
```

To connect a different React/Next.js frontend, update `FRONTEND_ORIGIN` in `backend/.env`, then restart the backend. Multiple origins can be comma-separated:

```text
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173,https://jobcheck.excsi.dev
```

Allowed methods: `GET`, `POST`, `DELETE`, `OPTIONS`.

## Endpoints

### GET `/api`

Returns a small API index with available endpoints and the quick tester path.

### GET `/api/health`

Checks whether the API is running.

Example response:

```json
{
  "success": true,
  "status": "ok"
}
```

### POST `/api/analyses`

Creates a new resume-to-job gap analysis.

Content type:

```text
multipart/form-data
```

FormData fields:

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `resume` | Yes | File | PDF, DOCX, or TXT. Max 5 MB. |
| `jobUrl` | No | string | Public HTTP/HTTPS job posting URL. Required when `jobDescription` is omitted. |
| `jobDescription` | No | string | Full job description text. Required when `jobUrl` is omitted. |
| `jobTitle` | No | string | Optional job title metadata. |
| `company` | No | string | Optional company metadata. |

Example fetch:

```ts
const formData = new FormData();
formData.append("resume", file);
formData.append("jobUrl", jobUrl);

// Optional fallback/override fields:
if (jobDescription) formData.append("jobDescription", jobDescription);
if (jobTitle) formData.append("jobTitle", jobTitle);
if (company) formData.append("company", company);

const response = await fetch("http://localhost:5000/api/analyses", {
  method: "POST",
  body: formData,
});

const data = await response.json();
```

Example success response:

```json
{
  "success": true,
  "data": {
    "analysisId": "11111111-1111-4111-8111-111111111111",
    "jobTitle": "Junior Backend Developer",
    "company": "Example Company",
    "jobUrl": "https://example.com/jobs/backend-developer",
    "resumeFilename": "resume.pdf",
    "analysis": {
      "matchScore": 82,
      "matchLevel": "strong",
      "summary": "82% estimated resume-to-job compatibility based on the provided resume and job description.",
      "matchingSkills": [],
      "missingSkills": [],
      "partialMatches": [],
      "experienceAnalysis": {
        "status": "meets",
        "explanation": "The resume shows relevant backend experience."
      },
      "educationAnalysis": {
        "status": "not_specified",
        "explanation": "The job description does not specify an education requirement."
      },
      "keywordGaps": [],
      "strengths": [],
      "resumeSuggestions": [],
      "nextSteps": []
    },
    "createdAt": "2026-08-27T00:00:00.000Z"
  }
}
```

### GET `/api/analyses`

Lists recent analyses newest first.

Query parameters:

| Name | Required | Default | Max | Notes |
| --- | --- | --- | --- | --- |
| `limit` | No | `20` | `100` | Number of analyses to return. |

Example:

```text
GET http://localhost:5000/api/analyses?limit=20
```

### GET `/api/analyses/:id`

Returns one saved analysis.

Example:

```text
GET http://localhost:5000/api/analyses/11111111-1111-4111-8111-111111111111
```

If no record exists, the API returns `404`.

### DELETE `/api/analyses/:id`

Deletes one saved analysis record.

Example:

```text
DELETE http://localhost:5000/api/analyses/11111111-1111-4111-8111-111111111111
```

Example response:

```json
{
  "success": true,
  "message": "Analysis deleted."
}
```

## Error Format

Example:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Resume must be PDF, DOCX, or TXT."
  }
}
```

Common error codes:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `MISSING_RESUME` | The `resume` FormData file is missing. |
| 400 | `VALIDATION_ERROR` | Required fields are missing or invalid. |
| 400 | `INVALID_FILE_TYPE` | Resume is not PDF, DOCX, or TXT. |
| 400 | `INVALID_JOB_URL` | The job URL is invalid or points to a local/private host. |
| 400 | `JOB_URL_FETCH_FAILED` | The backend could not fetch the job posting URL. |
| 400 | `JOB_DESCRIPTION_NOT_FOUND` | The backend could not extract usable job text from the URL. |
| 404 | `ANALYSIS_NOT_FOUND` | No saved analysis exists for that UUID. |
| 413 | `FILE_TOO_LARGE` | Resume is larger than 5 MB. |
| 413 | `JOB_URL_TOO_LARGE` | The job URL response is too large to process. |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests from the same client. |
| 502 | `GEMINI_INVALID_RESPONSE` | Gemini returned data that did not match the API contract. |
| 503 | `GEMINI_UNAVAILABLE` | Gemini was unavailable or timed out. |

## TypeScript Contract

The same interfaces are exported from:

```text
backend/src/types/analysis.types.ts
```

Frontend-facing shape:

```ts
export interface JobGapAnalysis {
  matchScore: number;
  matchLevel: "low" | "moderate" | "good" | "strong" | "excellent";
  summary: string;
  matchingSkills: Array<{
    skill: string;
    evidence: string;
    importance: "required" | "preferred" | "other";
  }>;
  missingSkills: Array<{
    skill: string;
    importance: "required" | "preferred" | "other";
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
    priority: "high" | "medium" | "low";
  }>;
  nextSteps: Array<{
    action: string;
    reason: string;
    priority: "high" | "medium" | "low";
  }>;
}

export interface CreateAnalysisResponse {
  success: true;
  data: {
    analysisId: string;
    jobTitle: string | null;
    company: string | null;
    jobUrl: string | null;
    resumeFilename: string | null;
    analysis: JobGapAnalysis;
    createdAt: string;
  };
}
```

## Curl Example

```bash
curl -X POST http://localhost:5000/api/analyses \
  -F "resume=@./resume.pdf" \
  -F "jobUrl=https://example.com/jobs/backend-developer" \
  -F "jobTitle=Junior Backend Developer" \
  -F "company=Example Company"
```
