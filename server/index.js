import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

app.use(express.json());

app.get('/api/hello', (_req, res) => {
  res.json({
    message: 'Hello from Express!',
    client: 'React is ready to use this API.',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    next();
    return;
  }

  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) {
      next();
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
});
