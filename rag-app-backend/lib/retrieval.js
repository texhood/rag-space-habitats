// lib/retrieval.js — LOOSENED KEYWORDS + FALLBACK
const pool = require('./db');
const { getExtractor, embeddingDim } = require('./embedding');

function escapeLikeValue(v) {
  return v.replace(/[\\%_']/g, m => ({ '\\': '\\\\', '%': '\\%', '_': '\\_', "'": "''" }[m] || m));
}

function extractNouns(q) {
  const words = q.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']);
  return words.filter(w => w.length > 2 && !stop.has(w));
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB)) || 0;
}

async function retrieveRelevantChunks(question) {
  const model = await getExtractor();
  const qOut = await model(question, { pooling: 'mean', normalize: true });
  const qVec = Array.from(qOut.data);
  if (qVec.length !== embeddingDim) return [];

  // LOOSENED SEED LIST + DYNAMIC
  const seed = [
    'cylinder', 'rotation', 'habitat', 'RPM', 'diameter', 'ecology', 'population',
    'O\'Neill', 'gravity', 'space settlement', 'centrifugal', 'spin', 'acceleration',
    'rpm', 'rotate', 'g-force', 'artificial gravity', 'pseudogravity', 'apparent gravity'
  ];

  const nouns = extractNouns(question);
  const keywords = Array.from(new Set([...seed, ...nouns]));

  console.log('Keywords:', keywords.join(', '));

  // TRY BROAD SEARCH FIRST
  let rows = [];
  const conn = await pool.getConnection();
  try {
    const likeClause = keywords.map(k => `LOWER(content) LIKE LOWER('%${escapeLikeValue(k)}%')`).join(' OR ');
    console.log('SQL LIKE:', likeClause);
    [rows] = await conn.query(`SELECT id, content, embedding FROM manual_chunks WHERE ${likeClause} LIMIT 200`);
  } catch (err) {
    console.warn('Keyword search failed:', err.message);
  } finally {
    conn.release();
  }

  // FALLBACK TO ALL CHUNKS IF NONE FOUND
  if (!rows.length) {
    console.log('No keyword matches — scanning all chunks');
    const scanConn = await pool.getConnection();
    [rows] = await scanConn.query(`SELECT id, content, embedding FROM manual_chunks LIMIT 200`);
    scanConn.release();
  }

  console.log(`Found ${rows.length} candidate chunks`);

  if (!rows.length) return [];

  const results = rows
    .map(r => {
      const buf = r.embedding;
      if (!buf || buf.length !== embeddingDim * 4) {
        console.warn(`Skip chunk ${r.id}: size ${buf?.length || 0}`);
        return null;
      }
      const aligned = Buffer.alloc(buf.length);
      buf.copy(aligned);
      try {
        const vec = Array.from(new Float32Array(aligned.buffer, aligned.byteOffset, embeddingDim));
        return { content: r.content, sim: cosineSimilarity(qVec, vec) };
      } catch (e) {
        console.warn(`Skip chunk ${r.id}: ${e.message}`);
        return null;
      }
    })
    .filter(r => r)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 10);

  console.log(`Top 5 similarity scores:`, results.slice(0, 5).map(r => r.sim.toFixed(3)));
  return results.slice(0, 5).map(r => r.content);
}

module.exports = { retrieveRelevantChunks };