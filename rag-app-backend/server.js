// server.js – DYNAMIC KEYWORD + STATIC SEED
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const mysql = require('mysql2/promise');
const { pipeline } = require('@xenova/transformers');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'space-habitats-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

/* -------------------------------------------------
   1. MODEL & EMBEDDING
   ------------------------------------------------- */
let extractor = null;
let embeddingDim = null;
async function getExtractor() {
  if (!extractor) {
    console.log('Loading multi-qa-mpnet-base-cos-v1 (local only)...');
    extractor = await pipeline('feature-extraction', 'Xenova/multi-qa-mpnet-base-cos-v1', {
      local_files_only: true
    });
    console.log('Model loaded.');
    const testOut = await extractor('test', { pooling: 'mean', normalize: true });
    embeddingDim = testOut.data.length;
    console.log(`Detected embedding dimension: ${embeddingDim}`);
  }
  return extractor;
}

/* -------------------------------------------------
   2. PDF → TEXT → CHUNKS → EMBEDDINGS
   ------------------------------------------------- */
async function extractTextFromPDF(pdfPath) {
  try {
    const data = await fs.readFile(pdfPath);
    const result = await pdf(data, { max: 0, normalizeWhitespace: true });
    return result.text || '';
  } catch (e) {
    console.error(`Error extracting ${pdfPath}:`, e.message);
    return '';
  }
}
function chunkText(text, size = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
async function generateEmbeddings(chunks) {
  const model = await getExtractor();
  const embeddings = [];
  for (const c of chunks) {
    if (!c) continue;
    const out = await model(c, { pooling: 'mean', normalize: true });
    const vector = Array.from(out.data);
    if (vector.length !== embeddingDim) continue;
    embeddings.push({ text: c, vector });
  }
  return embeddings;
}

/* -------------------------------------------------
   3. PDF HASHING & DB STORAGE
   ------------------------------------------------- */
function getFileHash(filePath) {
  return fs.readFile(filePath).then(data => crypto.createHash('md5').update(data).digest('hex'));
}
async function storeEmbeddings(embeddings, sourceFile) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });
  for (const { text, vector } of embeddings) {
    const buffer = Buffer.from(new Float32Array(vector).buffer);
    if (buffer.length !== embeddingDim * 4) continue;
    await conn.execute(
      `INSERT INTO manual_chunks (content, embedding, metadata) VALUES (?, ?, ?)`,
      [text, buffer, JSON.stringify({ source: sourceFile })]
    );
  }
  await conn.end();
  console.log(`Stored ${embeddings.length} chunks from ${sourceFile}`);
}
async function isPdfProcessed(hash) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });
  const [rows] = await conn.execute('SELECT 1 FROM processed_pdfs WHERE file_hash = ?', [hash]);
  await conn.end();
  return rows.length > 0;
}
async function markPdfProcessed(hash, filePath) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });
  await conn.execute('INSERT INTO processed_pdfs (file_hash, file_path) VALUES (?, ?)', [hash, filePath]);
  await conn.end();
}

/* -------------------------------------------------
   4. PREPROCESS ALL PDFs (unchanged)
   ------------------------------------------------- */
async function preprocessManual() {
  const incomingDir = path.join(__dirname, 'documents', 'incoming');
  const extractedDir = path.join(__dirname, 'documents', 'extracted');
  await fs.mkdir(extractedDir, { recursive: true });

  const files = (await fs.readdir(incomingDir)).filter(f => f.endsWith('.pdf'));
  if (!files.length) { console.log('No PDFs in incoming'); return; }

  for (const file of files) {
    const pdfPath = path.join(incomingDir, file);
    const hash = await getFileHash(pdfPath);
    if (await isPdfProcessed(hash)) { console.log(`Skipping ${file}`); continue; }

    console.log(`Processing ${file}...`);
    const text = await extractTextFromPDF(pdfPath);
    const chunks = chunkText(text);
    const embeddings = await generateEmbeddings(chunks);
    await storeEmbeddings(embeddings, file);
    await markPdfProcessed(hash, file);
    await fs.rename(pdfPath, path.join(extractedDir, file));
    console.log(`Moved ${file} → extracted`);
  }
  console.log('Preprocessing DONE');
}
module.exports.preprocessManual = preprocessManual;

/* -------------------------------------------------
   5. COSINE SIMILARITY
   ------------------------------------------------- */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB)) || 0;
}

/* -------------------------------------------------
   6. DYNAMIC KEYWORD HELPERS
   ------------------------------------------------- */
// Escape for LIKE ( % _ \ ' )
function escapeLikeValue(v) {
  return v
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''");
}

// Very lightweight noun extractor – good enough for English technical text
function extractNouns(question) {
  const words = question.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  // Simple stop-word list (add more if you like)
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']);
  return words.filter(w => w.length > 2 && !stop.has(w));
}

/* -------------------------------------------------
   7. RETRIEVE RELEVANT CHUNKS – DYNAMIC KEYWORDS
   ------------------------------------------------- */
async function retrieveRelevantChunks(question) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  const model = await getExtractor();
  const qOut = await model(question, { pooling: 'mean', normalize: true });
  const qVec = Array.from(qOut.data);
  if (qVec.length !== embeddingDim) {
    console.error(`Query embedding size ${qVec.length} ≠ ${embeddingDim}`);
    await conn.end();
    return [];
  }

  // 1. Static seed (domain-specific)
  const seedKeywords = [
    'cylinder', 'rotation', 'habitat', 'RPM', 'diameter',
    'ecology', 'population', 'O\'Neill', 'gravity', 'space settlement',
    'centrifugal', 'spin', 'angular'
  ];

  // 2. Extract nouns from the user question
  const questionNouns = extractNouns(question);

  // 3. Merge & dedupe
  const finalKeywords = Array.from(new Set([...seedKeywords, ...questionNouns]));

  // 4. Build safe LIKE clause
  const likeClause = finalKeywords
    .map(k => `content LIKE '%${escapeLikeValue(k)}%'`)
    .join(' OR ');

  console.log('Dynamic keywords →', finalKeywords.join(', '));

  let rows = [];
  try {
    [rows] = await conn.execute(
      `SELECT id, content, embedding FROM manual_chunks WHERE ${likeClause}`
    );
  } catch (err) {
    console.warn('Keyword search failed → full scan');
    [rows] = await conn.execute(`SELECT id, content, embedding FROM manual_chunks`);
  }

  if (!rows.length) { await conn.end(); return []; }

  const results = rows
    .map(row => {
      const buf = row.embedding;
      if (!buf || buf.length !== embeddingDim * 4) return null;
      const aligned = Buffer.alloc(buf.length);
      buf.copy(aligned);
      const vec = Array.from(new Float32Array(aligned.buffer, aligned.byteOffset, embeddingDim));
      return { content: row.content, sim: cosineSimilarity(qVec, vec) };
    })
    .filter(r => r !== null)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 10);

  await conn.end();
  return results.slice(0, 5).map(r => r.content);
}

/* -------------------------------------------------
   8. GENERATE ANSWER (unchanged)
   ------------------------------------------------- */
async function generateAnswer(question, chunks) {
  if (!chunks.length) return "No relevant information found.";

  const context = chunks.join('\n\n');
  const prompt = `You are an expert on space habitats from the 1975 NASA SP-413 and the Mars-biosphere design study. Using ONLY the chunks, answer the question. Show every step of any calculation.

Context:
${chunks.map((c, i) => `[Chunk ${i+1}]\n${c}`).join('\n\n')}

Question: ${question}

Answer:`;

  if (!process.env.XAI_API_KEY) return chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');

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

/* -------------------------------------------------
   9. AUTHENTICATION (unchanged)
   ------------------------------------------------- */
passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
  const conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT || 3306 });
  try {
    const [rows] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) return done(null, false);
    const match = await bcrypt.compare(password, rows[0].password);
    return match ? done(null, rows[0]) : done(null, false);
  } catch (err) { done(err); } finally { await conn.end(); }
}));
passport.serializeUser((u, done) => done(null, u.id));
passport.deserializeUser(async (id, done) => {
  const conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT || 3306 });
  try { const [rows] = await conn.execute('SELECT * FROM users WHERE id = ?', [id]); done(null, rows[0]); }
  catch (err) { done(err); } finally { await conn.end(); }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT || 3306 });
  try {
    const [exists] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) return res.status(400).json({ error: 'Username taken' });
    const hash = await bcrypt.hash(password, 10);
    await conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); } finally { await conn.end(); }
});
app.post('/login', passport.authenticate('local'), (req, res) => res.json({ success: true, user: { id: req.user.id, username: req.user.username } }));
app.post('/logout', (req, res) => { req.logout(() => res.json({ success: true })); });
app.get('/me', (req, res) => req.user ? res.json({ user: { id: req.user.id, username: req.user.username } }) : res.status(401).json({ error: 'Not logged in' }));

/* -------------------------------------------------
   10. PROTECTED /ask
   ------------------------------------------------- */
app.post('/ask', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
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

/* -------------------------------------------------
   11. START SERVER
   ------------------------------------------------- */
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
  console.log(`Open frontend at http://localhost:3000`);
});