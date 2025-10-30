// lib/embedding.js
const { pipeline } = require('@xenova/transformers');

let extractor = null;
let embeddingDim = null;

async function getExtractor() {
  if (!extractor) {
    console.log('Loading multi-qa-mpnet-base-cos-v1 (local only)...');
    extractor = await pipeline('feature-extraction', 'Xenova/multi-qa-mpnet-base-cos-v1', {
      local_files_only: true
    });
    const test = await extractor('test', { pooling: 'mean', normalize: true });
    embeddingDim = test.data.length;
    console.log(`Embedding dim: ${embeddingDim}`);
  }
  return extractor;
}

async function generateEmbeddings(chunks) {
  const model = await getExtractor();
  const embeddings = [];
  for (const c of chunks) {
    if (!c) continue;
    const out = await model(c, { pooling: 'mean', normalize: true });
    const vec = Array.from(out.data);
    if (vec.length !== embeddingDim) continue;
    embeddings.push({ text: c, vector: vec });
  }
  return embeddings;
}

module.exports = { getExtractor, generateEmbeddings, embeddingDim };