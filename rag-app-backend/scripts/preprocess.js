// scripts/preprocess.js
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const pool = require('../lib/db');
const { generateEmbeddings } = require('../lib/embedding');

async function extractText(pdfPath) {
  const data = await fs.readFile(pdfPath);
  const result = await pdf(data, { max: 0, normalizeWhitespace: true });
  return result.text || '';
}

function chunkText(text, size = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

async function getFileHash(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

(async () => {
  if (process.env.RUN_BY_ADMIN !== 'true') {
    console.error('Only admins can run preprocessing');
    process.exit(1);
  }

  const incoming = path.join(__dirname, '../documents/incoming');
  const extracted = path.join(__dirname, '../documents/extracted');
  await fs.mkdir(extracted, { recursive: true });

  const files = (await fs.readdir(incoming)).filter(f => f.endsWith('.pdf'));
  if (!files.length) { console.log('No PDFs'); process.exit(0); }

  for (const file of files) {
    const pdfPath = path.join(incoming, file);
    const hash = await getFileHash(pdfPath);

    const conn = await pool.getConnection();
    const [exists] = await conn.query('SELECT 1 FROM processed_pdfs WHERE file_hash = ?', [hash]);
    conn.release();

    if (exists.length) { console.log(`Skipping ${file}`); continue; }

    console.log(`Processing ${file}...`);
    const text = await extractText(pdfPath);
    const chunks = chunkText(text);
    const embeddings = await generateEmbeddings(chunks);

    const storeConn = await pool.getConnection();
    for (const { text, vector } of embeddings) {
      const buf = Buffer.from(new Float32Array(vector).buffer);
      await storeConn.execute(
        'INSERT INTO manual_chunks (content, embedding, metadata) VALUES (?, ?, ?)',
        [text, buf, JSON.stringify({ source: file })]
      );
    }
    await storeConn.execute('INSERT INTO processed_pdfs (file_hash, file_path) VALUES (?, ?)', [hash, file]);
    storeConn.release();

    await fs.rename(pdfPath, path.join(extracted, file));
    console.log(`→ ${file} done`);
  }
  console.log('Preprocessing complete');
  process.exit(0);
})();