// server.js — UPDATED FOR multi-qa-mpnet-base-cos-v1
// server.js — FIXED SQL SYNTAX FOR O'NEILL
// server.js — WITH REGEX-BASED SPECIAL CHARACTER ESCAPING
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const mysql = require('mysql2/promise');
const { pipeline } = require('@xenova/transformers');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- MODEL CACHE ----------
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

// ---------- PDF → TEXT ----------
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
    if (!c) continue;
    const out = await model(c, { pooling: 'mean', normalize: true });
    const vector = Array.from(out.data);
    if (vector.length !== embeddingDim) {
      console.warn(`Invalid embedding size for chunk: ${vector.length}, expected ${embeddingDim}`);
      continue;
    }
    embeddings.push({ text: c, vector });
  }
  return embeddings;
}

// ---------- HASH PDF CONTENT ----------
function getFileHash(filePath) {
  return fs.readFile(filePath).then(data => {
    return crypto.createHash('md5').update(data).digest('hex');
  });
}

// ---------- STORE IN MariaDB (BLOB) ----------
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
    if (buffer.length !== embeddingDim * 4) {
      console.warn(`Invalid buffer size for chunk: ${buffer.length}, expected ${embeddingDim * 4}`);
      continue;
    }
    await conn.execute(
      `INSERT INTO manual_chunks (content, embedding, metadata) VALUES (?, ?, ?)`,
      [text, buffer, JSON.stringify({ source: sourceFile })]
    );
  }
  await conn.end();
  console.log(`Stored ${embeddings.length} chunks from ${sourceFile}`);
}

// ---------- CHECK IF PDF PROCESSED ----------
async function isPdfProcessed(hash) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  const [rows] = await conn.execute(
    `SELECT 1 FROM processed_pdfs WHERE file_hash = ?`,
    [hash]
  );
  await conn.end();
  return rows.length > 0;
}

// ---------- MARK PDF AS PROCESSED ----------
async function markPdfProcessed(hash, filePath) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  await conn.execute(
    `INSERT INTO processed_pdfs (file_hash, file_path) VALUES (?, ?)`,
    [hash, filePath]
  );
  await conn.end();
}

// ---------- PREPROCESS ALL PDFs ----------
async function preprocessManual() {
  const incomingDir = path.join(__dirname, 'documents', 'incoming');
  const extractedDir = path.join(__dirname, 'documents', 'extracted');
  await fs.mkdir(extractedDir, { recursive: true });

  const files = (await fs.readdir(incomingDir)).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.log('No PDFs found in documents/incoming');
    return;
  }

  for (const file of files) {
    const pdfPath = path.join(incomingDir, file);
    const hash = await getFileHash(pdfPath);

    if (await isPdfProcessed(hash)) {
      console.log(`Skipping ${file} (already processed)`);
      continue;
    }

    console.log(`Processing ${file}...`);
    console.log('1. Extracting text...');
    const text = await extractTextFromPDF(pdfPath);
    console.log('2. Chunking...');
    const chunks = chunkText(text);
    console.log('3. Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks);
    console.log('4. Storing in MariaDB...');
    await storeEmbeddings(embeddings, file);
    await markPdfProcessed(hash, file);

    const newPath = path.join(extractedDir, file);
    await fs.rename(pdfPath, newPath);
    console.log(`Moved ${file} to documents/extracted`);
  }
  console.log('Preprocessing DONE for all PDFs.');
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
  if (qVec.length !== embeddingDim) {
    console.error(`Invalid query embedding size: ${qVec.length}, expected ${embeddingDim}`);
    await conn.end();
    return [];
  }

  const keywords = ['cylinder', 'rotation', 'habitat', 'RPM', 'diameter', 'ecology', 'population', 'O\'Neill', 'gravity', 'space settlement'];
  let likeClause = keywords.map(k => {
    // Escape special characters using regex
    const escaped = k.replace(/[\\%_']/g, match => {
      switch (match) {
        case '\\': return '\\\\';
        case '%': return '\\%';
        case '_': return '\\_';
        case "'": return "''";
        default: return match;
      }
    });
    return `content LIKE '%${escaped}%'`;
  }).join(' OR ');
  let rows = [];

  [rows] = await conn.execute(
    `SELECT id, content, embedding FROM manual_chunks WHERE ${likeClause}`
  );

  if (rows.length === 0) {
    console.warn('No chunks matched keywords, retrieving all chunks');
    [rows] = await conn.execute(`SELECT id, content, embedding FROM manual_chunks`);
  }
  await conn.end();

  const initialResults = rows
    .map(row => {
      const embBuffer = row.embedding;
      if (!embBuffer || embBuffer.length !== embeddingDim * 4) {
        console.warn(`Skipping chunk ${row.id}: Invalid BLOB size ${embBuffer ? embBuffer.length : 'null'}, expected ${embeddingDim * 4}`);
        return null;
      }
      const aligned = Buffer.alloc(embBuffer.length);
      embBuffer.copy(aligned);
      try {
        const embArray = Array.from(new Float32Array(aligned.buffer, aligned.byteOffset, embeddingDim));
        const sim = cosineSimilarity(qVec, embArray);
        return { content: row.content, sim };
      } catch (e) {
        console.warn(`Skipping chunk ${row.id}: ${e.message}`);
        return null;
      }
    })
    .filter(r => r !== null)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 10);

  if (process.env.XAI_API_KEY && initialResults.length > 0) {
    const rerankPrompt = `Rank these 10 chunks from space habitat documents, including the 1975 NASA Space Settlements: A Design Study (NASA SP-413), by relevance to the question: "${question}". Focus on cylindrical habitats, rotation dynamics, and population support. Return only a numbered list 1-10 (most to least relevant), no explanation. Chunks: ${initialResults.map((r, i) => `${i+1}. ${r.content.slice(0, 100)}...`).join('\n')}`;
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
    return "No relevant information found in the space habitats documents.";
  }

  const context = chunks.join('\n\n');
  const prompt = `You are an expert on space habitats, including the 1975 NASA/Stanford Space Settlements: A Design Study (NASA SP-413). Using ONLY the provided chunks, analyze the specified habitat design and extrapolate for a cylindrical habitat with a 6437m major diameter, 6237m minor diameter, 10,000m long, spinning at 0.95 RPM, designed to sustain 1,000,000 humans and a viable ecology. Structure your answer as:

1. Strengths (bullet points, cite chunks, e.g., [Chunk 1])
2. Weaknesses (bullet points, cite chunks)
3. Comparison to other geometries (torus, sphere) in the documents
4. Extrapolated feasibility (calculate gravity, e.g., g ≈ RPM² × radius; assess population support)

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
        max_tokens: 2048,
        temperature: 0.3
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