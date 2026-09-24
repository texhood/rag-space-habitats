const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MIN_SIMILARITY = 0.3;
const MAX_PROJECT_CHUNKS = 4;

/**
 * Split upload text into overlapping pieces. A short document stays one piece.
 * @param {string} text
 * @param {number} [chunkSize]
 * @param {number} [overlap]
 * @returns {string[]}
 */
function splitText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const cleaned = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);
    if (end < cleaned.length) {
      const window = cleaned.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('. '));
      if (breakAt > chunkSize * 0.5) end = start + breakAt + 1;
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    const next = end - overlap;
    start = next > start ? next : end;
  }
  return chunks;
}

/**
 * Keep the closest project chunks and drop a whole-file dump.
 * @param {Array<{ content: string, similarity: number, kind?: string }>} pieces
 * @param {{ minSimilarity?: number, limit?: number }} [options]
 * @returns {Array<{ content: string, similarity: number, kind?: string }>}
 */
function rankProjectPieces(pieces, options = {}) {
  const minSimilarity = options.minSimilarity ?? MIN_SIMILARITY;
  const limit = options.limit ?? MAX_PROJECT_CHUNKS;
  return (pieces || [])
    .filter((piece) => piece && piece.kind !== 'full-file' && Number(piece.similarity) >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Objectives and constraints stay as a short note. Matching chunks follow.
 * @param {{ objectives?: string, constraints?: string }} project
 * @param {Array<{ file_name?: string, content: string }>} hits
 * @returns {string[]}
 */
function projectPromptPieces(project, hits) {
  const pieces = [];
  if (project && (project.objectives || project.constraints)) {
    let note = '[PROJECT CONTEXT]\n';
    if (project.objectives) note += `Objectives: ${project.objectives}\n`;
    if (project.constraints) note += `Constraints: ${project.constraints}\n`;
    pieces.push(note);
  }
  for (const hit of hits) {
    const name = hit.file_name || 'upload';
    pieces.push(`[${name}]\n${hit.content}`);
  }
  return pieces;
}

module.exports = {
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  MIN_SIMILARITY,
  MAX_PROJECT_CHUNKS,
  splitText,
  rankProjectPieces,
  projectPromptPieces
};
