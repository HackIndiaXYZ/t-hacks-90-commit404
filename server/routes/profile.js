import { Router } from 'express';
import { extractProfileFromText, geminiAvailable } from '../services/gemini.js';

const router = Router();

// Lets the browser know whether the optional sentence feature can be used.
router.get('/status', (req, res) => res.json({ gemini: geminiAvailable() }));

// Free text in, CANDIDATE profile fields out. The browser shows them to the
// user to confirm; nothing here decides eligibility.
router.post('/parse-profile', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'empty_text' });
  if (text.length > 600) return res.status(400).json({ error: 'text_too_long' });
  if (!geminiAvailable()) return res.status(503).json({ error: 'gemini_unavailable' });

  try {
    const fields = await extractProfileFromText(text);
    res.json({ fields });
  } catch (err) {
    console.error('Gemini parse failed:', err.message);
    res.status(502).json({ error: 'gemini_failed' });
  }
});

export default router;
