// server.js – FIXED LATEX DELIMITERS FOR WEB
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
    const [rows] = await pool.query('SELECT id, username, role, llm_preference FROM users WHERE id = ?', [id]);
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
  if (req.user) res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role, llm_preference: req.user.llm_preference || 'grok' } });
  else res.status(401).json({ error: 'Not logged in' });
});

// ---------- SETTINGS: UPDATE LLM PREFERENCE ----------
app.post('/settings/llm', requireAuth, async (req, res) => {
  const { llm_preference } = req.body;
  const valid = ['grok', 'claude', 'both'];
  if (!llm_preference || !valid.includes(llm_preference)) {
    return res.status(400).json({ error: 'Invalid LLM preference' });
  }
  try {
    await pool.query('UPDATE users SET llm_preference = ? WHERE id = ?', [llm_preference, req.user.id]);
    req.user.llm_preference = llm_preference;
    res.json({ success: true, llm_preference });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    const llmPref = req.user.llm_preference || 'grok';
    console.log(`User ${req.user.username} asks: "${question}" (LLM: ${llmPref})`);
    const chunks = await retrieveRelevantChunks(question);
    const answer = await generateAnswer(question, chunks, llmPref);
    res.json({ answer });
  } catch (e) {
    console.error('Ask error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------- SYSTEM PROMPT ----------
const SYSTEM_PROMPT = `You are an expert on space habitats from NASA SP-413. Answer using **markdown with LaTeX math**:

CRITICAL: Use these exact delimiters for math:
- Inline math: $x = 2$
- Display math: $$E = mc^2$$

NEVER use \\( \\) or \\[ \\] delimiters - always use $ and $$.

Format your response in clean markdown:
- Use **bold** for emphasis
- Use proper paragraphs
- Structure calculations as numbered steps

Include:
1. **Strengths** (bullets, cite chunks)
2. **Weaknesses** (bullets, cite chunks)
3. **Comparison** to other geometries
4. **Exact Gravity Calculation** (show all steps with LaTeX)

Example math formatting:
- Inline: The radius is $r = 250$ meters
- Display: $$a = \\omega^2 r$$`;

// ---------- GROK API ----------
async function queryGrok(prompt) {
  if (!process.env.XAI_API_KEY) return null;
  try {
    const res = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3
    }, { headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` } });
    return res.data.choices[0].message.content.trim();
  } catch (e) {
    console.error('Grok error:', e.message);
    return null;
  }
}

// ---------- CLAUDE API ----------
async function queryClaude(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY } });
    return res.data.content[0].text.trim();
  } catch (e) {
    console.error('Claude error:', e.message);
    return null;
  }
}

// ---------- GENERATE ANSWER (WITH PROPER WEB LATEX DELIMITERS) ----------
async function generateAnswer(question, chunks, llmPref = 'grok') {
  const context = chunks.map((c, i) => `[Chunk ${i+1}]\n${c}`).join('\n\n');
  const prompt = `${SYSTEM_PROMPT}

Context from NASA SP-413:
${context}

Question: ${question}

Answer (use $ and $$ for all math):`;

  if (llmPref === 'grok') {
    const answer = await queryGrok(prompt);
    return answer || chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');
  } else if (llmPref === 'claude') {
    const answer = await queryClaude(prompt);
    return answer || chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');
  } else if (llmPref === 'both') {
    const [grokAnswer, claudeAnswer] = await Promise.all([
      queryGrok(prompt),
      queryClaude(prompt)
    ]);

    let result = '';
    if (grokAnswer) {
      result += '## Grok Response\n\n' + grokAnswer;
    }
    if (claudeAnswer) {
      if (result) result += '\n\n---\n\n';
      result += '## Claude Response\n\n' + claudeAnswer;
    }
    if (!result) {
      result = chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');
    }
    return result;
  }

  return chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');
}

// ---------- START ----------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
  console.log(`Open frontend at http://localhost:3000`);
});