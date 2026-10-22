// Small Express server. Its ONLY jobs are:
//   1. keep the Gemini API key on the server (never in browser code)
//   2. in production, serve the built React app from /dist
// Eligibility is NOT decided here or by Gemini - see src/eligibility/index.js.
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import profileRoutes from './routes/profile.js';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(express.json({ limit: '10kb' }));
app.use('/api', profileRoutes);

// Production: serve the Vite build.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
});

app.listen(PORT, () => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  console.log(`SchemeSaathi API on http://localhost:${PORT}  (Gemini ${hasKey ? 'enabled' : 'OFF - app still works without it'})`);
});
