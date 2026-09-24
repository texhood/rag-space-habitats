/**
 * Shape retrieved PostgreSQL chunks for the model prompt and the answer panel.
 */
const SOURCE_LABELS = {
  ntrs: 'NASA NTRS',
  arxiv: 'arXiv',
  crawler: 'Corpus',
  mongodb_submission: 'Library',
  submission: 'Library'
};

/**
 * Object form of chunk metadata. Invalid JSON becomes an empty object.
 * @param {*} raw
 * @returns {*}
 */
function parseMetadata(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

/**
 * Whether a source string is a file name rather than a publisher.
 * @param {*} value
 * @returns {*}
 */
function looksLikeFilename(value) {
  return typeof value === 'string' && /\.(pdf|docx?|txt)$/i.test(value);
}

/**
 * Display name for a corpus source key.
 * @param {*} source
 * @returns {*}
 */
function sourceLabel(source) {
  if (!source) return '';
  const key = String(source).toLowerCase();
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
  if (key.includes('ntrs') || key.includes('nasa')) return 'NASA NTRS';
  if (key.includes('arxiv')) return 'arXiv';
  if (looksLikeFilename(source)) return 'Corpus';
  return source;
}

/**
 * Passage text from a chunk row or a plain string.
 * @param {*} chunk
 * @returns {*}
 */
function chunkText(chunk) {
  if (!chunk) return '';
  if (typeof chunk === 'string') return chunk;
  return chunk.content || '';
}

/**
 * Chunk row shaped for prompts and the client source list.
 * @param {*} row
 * @returns {*}
 */
function normalizeRetrievedChunk(row) {
  if (!row) return null;
  if (typeof row === 'string') {
    return {
      content: row,
      title: null,
      source: null,
      sourceId: null,
      sourceType: null,
      chunkIndex: null,
      similarity: null,
      license: null,
      attribution: null,
      url: null,
      category: null
    };
  }

  const meta = parseMetadata(row.metadata);
  const rawSource = meta.source || row.source_type || null;
  return {
    content: row.content || '',
    title: meta.title || null,
    source: looksLikeFilename(rawSource) ? (row.source_type || 'corpus') : rawSource,
    sourceId: row.source_id || meta.source_id || null,
    sourceType: row.source_type || null,
    chunkIndex: row.chunk_index ?? meta.chunk_index ?? null,
    similarity: row.similarity == null ? null : Number(row.similarity),
    license: meta.license || null,
    attribution: meta.attribution || null,
    url: meta.url || meta.pdfUrl || null,
    category: meta.category || null
  };
}

/**
 * Browse route for a library document id.
 * @param {number} sourceId
 * @returns {*}
 */
function libraryHref(sourceId) {
  if (!sourceId) return null;
  return `/browse?doc=${encodeURIComponent(String(sourceId))}`;
}

/**
 * Numbered unique sources for the answer panel.
 * @param {Array} chunks
 * @returns {*}
 */
function formatSourcesForClient(chunks) {
  const sources = [];
  const seen = new Set();

  (chunks || []).forEach((chunk) => {
    const normalized = typeof chunk === 'string' ? null : (chunk.content !== undefined && chunk.title !== undefined
      ? chunk
      : normalizeRetrievedChunk(chunk));

    if (!normalized || !normalized.content) return;
    if (!normalized.title && !normalized.sourceId) return;

    const key = String(normalized.sourceId || normalized.title);
    if (seen.has(key)) return;
    seen.add(key);

    sources.push({
      index: sources.length + 1,
      title: normalized.title || 'Untitled document',
      source: sourceLabel(normalized.source),
      sourceKey: normalized.source || null,
      sourceId: normalized.sourceId,
      url: normalized.url,
      attribution: normalized.attribution,
      href: libraryHref(normalized.sourceId) || normalized.url || null
    });
  });

  return sources;
}

/**
 * Prompt text with numbered source headings.
 * @param {Array} chunks
 * @returns {*}
 */
function buildLabeledContext(chunks) {
  const parts = [];
  let sourceNum = 0;

  (chunks || []).forEach((chunk) => {
    if (typeof chunk === 'string') {
      if (chunk.trim()) parts.push(chunk);
      return;
    }

    const normalized = chunk.content !== undefined
      ? chunk
      : normalizeRetrievedChunk(chunk);
    const text = chunkText(normalized);
    if (!text.trim()) return;

    if (normalized.title || normalized.sourceId) {
      sourceNum += 1;
      const origin = sourceLabel(normalized.source);
      const heading = origin
        ? `[${sourceNum}] ${normalized.title || 'Untitled'} — ${origin}`
        : `[${sourceNum}] ${normalized.title || 'Untitled'}`;
      parts.push(`${heading}\n${text}`);
    } else {
      parts.push(text);
    }
  });

  return {
    text: parts.join('\n\n---\n\n'),
    sourceCount: sourceNum
  };
}

/**
 * Instruction telling the model to cite those source numbers.
 * @param {number} sourceCount
 * @returns {*}
 */
function citationInstruction(sourceCount) {
  if (!sourceCount) return '';
  return `\n\nCITE YOUR SOURCES: When you use a retrieved passage, add an inline citation like [1] that matches the numbered sources above. Do not invent source numbers. If the retrieved context is insufficient, say so.`;
}

module.exports = {
  SOURCE_LABELS,
  parseMetadata,
  sourceLabel,
  chunkText,
  normalizeRetrievedChunk,
  formatSourcesForClient,
  buildLabeledContext,
  citationInstruction,
  libraryHref
};
