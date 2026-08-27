# Ai Powered Tool

A small Node.js + Express API with a React frontend powered by Vite.

## Requirements

- Node.js 20 or newer
- npm

## Getting Started

Install dependencies:

```bash
npm install
```

Run the Express API and React dev server:

```bash
npm run dev
```

Open the React app at `http://localhost:5173`.

The API runs at `http://localhost:5000` and exposes:

- `GET /api/hello`
- `GET /api/health`

## Production Build

Build the React app:

```bash
npm run build
```

Start Express, which serves the built React files and API:

```bash
npm start
```

## Docker deployment

The Docker image builds the React client into `dist` and packages it with the
Express server and production Node.js dependencies. Vite is not run in the
production container.

Build and start the application:

```bash
docker compose up --build -d
```

Open `http://localhost:5000`. The API health check is available at
`http://localhost:5000/api/health`.

To view container logs or stop the deployment:

```bash
docker compose logs -f app
docker compose down
```
