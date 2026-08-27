# HireLens AI Backend API

Base URL for local development:

```text
http://localhost:5000
```

Quick browser tester:

```text
http://localhost:5000/
```

All responses use JSON. The Gemini API key is used only on the backend and is never returned to the frontend.

## CORS

Allowed frontend origin comes from:

```text
FRONTEND_ORIGIN=http://localhost:3000
```

To connect a different React/Next.js frontend, update `FRONTEND_ORIGIN` in `backend/.env`, then restart the backend. Multiple local origins can be comma-separated:

```text
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173
```

Allowed methods: `GET`, `POST`, `DELETE`, `OPTIONS`.

## Endpoints

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
| `jobDescription` | Yes | string | Full job description text. |
| `jobTitle` | No | string | Optional job title metadata. |
| `company` | No | string | Optional company metadata. |

Example fetch:

```ts
const formData = new FormData();
formData.append("resume", file);
formData.append("jobDescription", jobDescription);
formData.append("jobTitle", jobTitle);
formData.append("company", company);

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
| 404 | `ANALYSIS_NOT_FOUND` | No saved analysis exists for that UUID. |
| 413 | `FILE_TOO_LARGE` | Resume is larger than 5 MB. |
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
  -F "jobDescription=Build and maintain Node.js APIs backed by PostgreSQL." \
  -F "jobTitle=Junior Backend Developer" \
  -F "company=Example Company"
```
