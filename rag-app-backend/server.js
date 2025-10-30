// server.js — ALWAYS CALL GROK + LOOSENED RETRIEVAL
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const axios = require('axios');
const pool = require('./lib/db');
const { retrieveRelevantChunks } = require('./lib/retrieval');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'space-habitats-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// ---------- PASSPORT ----------
passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) return done(null, false);
    const match = await bcrypt.compare(password, rows[0].password);
    return match ? done(null, rows[0]) : done(null, false);
  } catch (err) { done(err); }
}));
passport.serializeUser((u, done) => done(null, u.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (err) { done(err); }
});

// ---------- MIDDLEWARE ----------
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ---------- AUTH ROUTES ----------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) return res.status(400).json({ error: 'Username taken' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, 'user']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

app.post('/logout', (req, res) => { req.logout(() => res.json({ success: true })); });

app.get('/me', (req, res) => {
  if (req.user) res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } });
  else res.status(401).json({ error: 'Not logged in' });
});

// ---------- ADMIN: PREPROCESS ----------
app.post('/admin/preprocess', requireAdmin, async (req, res) => {
  try {
    require('../scripts/preprocess.js')();
    res.json({ success: true, message: 'Preprocessing started in background' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- /ask ----------
app.post('/ask', requireAuth, async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });
  try {
    console.log(`User ${req.user.username} asks: "${question}"`);
    const chunks = await retrieveRelevantChunks(question);
    const answer = await generateAnswer(question, chunks);
    res.json({ answer });
  } catch (e) {
    console.error('Ask error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------- GENERATE ANSWER (WITH LATEX DELIMITERS) ----------
async function generateAnswer(question, chunks) {
  const context = chunks.map((c, i) => `[Chunk ${i+1}]\n${c}`).join('\n\n');
  const prompt = `You are an expert on space habitats from NASA SP-413. Answer using **LaTeX math delimiters**:

- Inline math: \( x = 2 \)
- Display math: \[ E = mc^2 \]

Use LaTeX for all equations. Structure your answer as:

1. Strengths (bullets, cite chunks)
2. Weaknesses (bullets, cite chunks)
3. Comparison to other geometries
4. **Exact Gravity Calculation** (use LaTeX, show steps)

Context: ${context}

Question: ${question}

Answer:`;

  if (!process.env.XAI_API_KEY) {
    return chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');
  }

  try {
    const res = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3
    }, { headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` } });
    return res.data.choices[0].message.content.trim();
  } catch (e) {
    return `Grok error: ${e.message}`;
  }
}

// ---------- START ----------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
  console.log(`Open frontend at http://localhost:3000`);
});