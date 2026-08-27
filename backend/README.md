# HireLens AI

AI-powered Resume -> Job Gap Analyzer using Google Gemini.

HireLens AI accepts a resume and a job description, sends the resume/job pair to Gemini from the backend, validates Gemini's structured response, stores the generated analysis metadata in PostgreSQL, and exposes a REST API for a separate React/Next.js frontend.

The match score is an AI-generated resume-to-job compatibility estimate based only on the uploaded resume and pasted job description. It is not a hiring prediction.

## Architecture

- Express REST API handles requests, CORS, rate limiting, upload validation, and errors.
- Multer stores uploaded resumes temporarily while one request is processed.
- `resume.service.ts` handles PDF/DOCX/TXT processing. PDF resumes are sent to Gemini through Gemini file/document capabilities. DOCX and TXT resumes are converted to text first.
- `gemini.service.ts` owns all Google Gemini API calls and structured output validation.
- PostgreSQL stores only analysis results and basic metadata.

## Technology Stack

- Node.js 20+
- TypeScript
- Express
- PostgreSQL
- Google Gemini API via `@google/genai`
- Zod
- Multer
- pg
- dotenv
- cors
- helmet
- express-rate-limit
- UUIDs
- Vitest
- Supertest

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL
- Google Gemini API key

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then update:

```text
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/hirelens
DATABASE_SSL=false
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash
FRONTEND_ORIGIN=http://localhost:3000
NODE_ENV=development
```

Never expose `GEMINI_API_KEY` to the frontend.

## PostgreSQL Setup

Create the database:

```bash
npm run db:create
```

Initialize the schema:

```bash
npm run db:init
```

Or run both:

```bash
npm run db:setup
```

The schema creates:

- `analyses`: stores UUID, job metadata, original resume filename, match score, Gemini result JSON, and creation timestamp.

## Gemini API Setup

1. Create a Gemini API key in Google AI Studio.
2. Put the key in `backend/.env` as `GEMINI_API_KEY`.
3. Keep `GEMINI_MODEL=gemini-3.7-flash` or change it to another compatible Gemini model.

Gemini is called only from the backend.

## Installation

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

A small browser tester is served at:

```text
http://localhost:5000/
http://localhost:5000/scanner
```

## Development Commands

```bash
npm run dev
npm run build
npm start
npm test
npm run test:watch
npm run db:init
```

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check. |
| POST | `/api/analyses` | Upload resume and job description for Gemini analysis. |
| GET | `/api/analyses` | List recent analyses. |
| GET | `/api/analyses/:id` | Get one saved analysis. |
| DELETE | `/api/analyses/:id` | Delete one saved analysis record. |

See `API.md` for the full frontend contract.

## Example Request

```bash
curl -X POST http://localhost:5000/api/analyses \
  -F "resume=@./resume.pdf" \
  -F "jobDescription=Build and maintain Node.js APIs backed by PostgreSQL." \
  -F "jobTitle=Junior Backend Developer" \
  -F "company=Example Company"
```

## Privacy Behavior

- Uploaded resumes are stored only as temporary files during request processing.
- Temporary local files are deleted after the request completes, including error paths.
- The database stores only generated analysis JSON and basic metadata.
- Raw resume text is not stored.
- Resume data is sent only to the Gemini API for the requested analysis.
- Gemini API keys and database credentials are never returned in API responses.

For PDF analysis, the backend uploads the PDF to Gemini file/document capabilities so Gemini can analyze the document. The backend attempts to delete the Gemini uploaded file after analysis; Google may still apply its own temporary processing behavior according to Gemini API service rules.

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── database/
│   └── schema.sql
├── scripts/
│   └── initDb.ts
├── tests/
├── .env.example
├── API.md
├── package.json
└── tsconfig.json
```
