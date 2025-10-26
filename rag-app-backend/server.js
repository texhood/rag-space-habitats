// server.js — FULLY WORKING WITH GROK-3 AND FORMATTING
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const pdf = require('pdf-parse');
const mysql = require('mysql2/promise');
const { pipeline } = require('@xenova/transformers');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- MODEL CACHE ----------
let extractor = null;
async function getExtractor() {
  if (!extractor) {
    console.log('Loading all-MiniLM-L6-v2 (local only)...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      local_files_only: true
    });
    console.log('Model loaded.');
  }
  return extractor;
}

// ---------- PDF → TEXT ----------
async function extractTextFromPDF(pdfPath) {
  const data = await fs.readFile(pdfPath);
  const result = await pdf(data);
  return result.text;
}

// ---------- CHUNK TEXT ----------
function chunkText(text, size = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// ---------- EMBEDDINGS ----------
async function generateEmbeddings(chunks) {
  const model = await getExtractor();
  const embeddings = [];
  for (const c of chunks) {
    const out = await model(c, { pooling: 'mean', normalize: true });
    embeddings.push({ text: c, vector: Array.from(out.data) });
  }
  return embeddings;
}

// ---------- STORE IN MariaDB (BLOB) ----------
async function storeEmbeddings(embeddings) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  for (const { text, vector } of embeddings) {
    const buffer = Buffer.from(new Float32Array(vector).buffer);
    await conn.execute(
      `INSERT INTO manual_chunks (content, embedding, metadata) VALUES (?, ?, ?)`,
      [text, buffer, JSON.stringify({ source: 'manual' })]
    );
  }
  await conn.end();
  console.log(`Stored ${embeddings.length} chunks in BLOB`);
}

// ---------- PREPROCESS MANUAL ----------
async function preprocessManual(pdfPath) {
  console.log('1. Extracting text...');
  const text = await extractTextFromPDF(pdfPath);
  console.log('2. Chunking...');
  const chunks = chunkText(text);
  console.log('3. Generating embeddings...');
  const embeddings = await generateEmbeddings(chunks);
  console.log('4. Storing in MariaDB...');
  await storeEmbeddings(embeddings);
  console.log('Preprocessing DONE.');
}
module.exports.preprocessManual = preprocessManual;

// ---------- COSINE SIMILARITY ----------
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB)) || 0;
}

// ---------- RETRIEVE RELEVANT CHUNKS (BLOB + JS) ----------
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

  // Pre-filter chunks with keywords
  const keywords = ['cylinder', 'rotation', 'habitat', 'RPM', 'diameter'];
  const likeClause = keywords.map(k => `content LIKE '%${k}%'`).join(' OR ');
  const [rows] = await conn.execute(
    `SELECT id, content, embedding FROM manual_chunks WHERE ${likeClause}`
  );
  await conn.end();

  // Initial cosine similarity (10 chunks)
  const initialResults = rows
    .map(row => {
      const embBuffer = row.embedding;
      const aligned = Buffer.alloc(embBuffer.length);
      embBuffer.copy(aligned);
      const embArray = Array.from(new Float32Array(aligned.buffer, aligned.byteOffset, 384));
      const sim = cosineSimilarity(qVec, embArray);
      return { content: row.content, sim };
    })
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 10);

  // Rerank with Grok (if key available)
  if (process.env.XAI_API_KEY) {
    const rerankPrompt = `Rank these 10 chunks from the 1975 NASA Space Settlements: A Design Study (NASA SP-413) by relevance to the question: "${question}". Focus on cylindrical habitats and rotation dynamics. Return only a numbered list 1-10 (most to least relevant), no explanation. Chunks: ${initialResults.map((r, i) => `${i+1}. ${r.content.slice(0, 100)}...`).join('\n')}`;
    try {
      const rerankRes = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: 'grok-3',
          messages: [{ role: 'user', content: rerankPrompt }],
          max_tokens: 100,
          temperature: 0.1
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.XAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const rerankOrder = rerankRes.data.choices[0].message.content.trim().split('\n').map(line => parseInt(line.trim().match(/\d+/)?.[0]) - 1);
      return initialResults
        .sort((a, b) => rerankOrder.indexOf(initialResults.indexOf(a)) - rerankOrder.indexOf(b))
        .slice(0, 5)
        .map(r => r.content);
    } catch (e) {
      console.warn('Rerank failed, using cosine:', e.message);
    }
  }

  return initialResults.slice(0, 5).map(r => r.content);
}

// ---------- GENERATE ANSWER (WITH GROK API) ----------
async function generateAnswer(question, chunks) {
  if (chunks.length === 0) {
    return "No relevant information found in the 1975 NASA Space Settlements study.";
  }

  const context = chunks.join('\n\n');
  const prompt = `You are an expert on the 1975 NASA/Stanford Space Settlements: A Design Study (NASA SP-413). Using ONLY the provided chunks, analyze the specified habitat design and extrapolate for a cylindrical habitat with a 4-mile major diameter spinning at 0.95 RPM. Structure your answer as:

1. Strengths (bullet points, cite chunks, e.g., [Chunk 1])
2. Weaknesses (bullet points, cite chunks)
3. Comparison to other geometries (torus, sphere) in the study
4. Extrapolated feasibility (calculate gravity if possible, e.g., g ≈ RPM² × radius)

Be concise, accurate, and cite chunk numbers. If the chunks lack specific details, infer from similar designs (e.g., ~1 RPM cylinders) and note limitations.

Context chunks:
${chunks.map((c, i) => `[Chunk ${i+1}]\n${c}`).join('\n\n')}

Question: ${question}

Answer:`;

  if (!process.env.XAI_API_KEY) {
    console.warn('Grok API key not set — returning raw chunks.');
    return chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n');
  }

  try {
    const res = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048, // Increased for full answers
        temperature: 0.3 // Low for factual accuracy
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.data.choices[0].message.content.trim();
  } catch (e) {
    console.error('Grok API error:', e.response?.data || e.message);
    return `Grok API unavailable. Raw chunks:\n\n${chunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n')}`;
  }
}

// ---------- API ----------
app.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });

  try {
    console.log(`Processing question: "${question}"`);
    const chunks = await retrieveRelevantChunks(question);
    const answer = await generateAnswer(question, chunks);
    res.json({ answer });
  } catch (e) {
    console.error('Ask error:', e);
    res.status(500).json({ error: 'internal error' });
  }
});

// ---------- START ----------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
  console.log(`Open frontend at http://localhost:3000`);
});