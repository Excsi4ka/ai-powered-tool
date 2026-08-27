# HireLens AI

AI-powered Resume -> Job Gap Analyzer backend using Node.js, TypeScript, Express, PostgreSQL, and Google Gemini.

The current production backend lives in `backend/`. The older root `server/` and Vite `client/` are kept in the repo for previous project context, but root `npm run dev`, `npm run build`, and `npm start` now delegate to the HireLens backend.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 16+ for local development
- Google Gemini API key

## Getting Started

Install backend dependencies:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your real PostgreSQL password and Gemini key:

```text
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/hirelens
DATABASE_SSL=false
GEMINI_API_KEY=your_real_gemini_api_key
FRONTEND_ORIGIN=http://localhost:3000,https://jobcheck.excsi.dev
```

Create the database and schema:

```bash
npm run db:setup
```

Run the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000` and exposes:

- `GET /api/health`
- `POST /api/analyses`
- `GET /api/analyses`
- `GET /api/analyses/:id`
- `DELETE /api/analyses/:id`

Full frontend API contract: `backend/API.md`.

A small backend-served tester is available at `http://localhost:5000/` and `http://localhost:5000/scanner`.

## Root Convenience Scripts

From the repo root:

```bash
npm run dev
npm run build
npm start
npm run backend:test
npm run backend:db:setup
npm run backend:db:init
```

The old root app can still be started explicitly:

```bash
npm run legacy:dev
npm run client
```

## Docker deployment

The Docker setup now runs the HireLens backend plus PostgreSQL. Export your Gemini key first:

```bash
export GEMINI_API_KEY=your_real_gemini_api_key
export FRONTEND_ORIGIN=http://localhost:3000,https://jobcheck.excsi.dev
```

On PowerShell:

```powershell
$env:GEMINI_API_KEY="your_real_gemini_api_key"
$env:FRONTEND_ORIGIN="http://localhost:3000,https://jobcheck.excsi.dev"
```

Build and start the application:

```bash
docker compose up --build -d
```

The API health check is available at `http://localhost:5000/api/health`.

The Docker PostgreSQL service is published on host port `55433` to avoid colliding with a local PostgreSQL install on `5432`. The backend container still connects to PostgreSQL internally at `postgres:5432`.

To view container logs or stop the deployment:

```bash
docker compose logs -f backend
docker compose down
```

If you need to recreate the Docker database from scratch:

```bash
docker compose down -v
docker compose up --build -d
```

## Backend Documentation

- Backend README: `backend/README.md`
- API contract: `backend/API.md`
- Response interfaces: `backend/src/types/analysis.types.ts`
