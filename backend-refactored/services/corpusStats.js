const pool = require('../config/database');
const { CORPUS_EXCLUDES_PRIVATE_SQL } = require('./submissionAccess');

function labelSourceKey(raw) {
  const key = String(raw || 'unknown').toLowerCase();
  if (key === 'ntrs' || key.includes('nasa')) return 'ntrs';
  if (key.includes('arxiv')) return 'arxiv';
  if (key === 'crawler') return 'corpus';
  if (key === 'mongodb_submission' || key === 'submission') return 'community';
  return key || 'unknown';
}

async function getCorpusStats() {
  const totals = await pool.query(`
    SELECT
      COUNT(*)::int AS chunks,
      COUNT(DISTINCT source_id)::int AS documents
    FROM document_chunks
    WHERE ${CORPUS_EXCLUDES_PRIVATE_SQL}
  `);

  const bySource = await pool.query(`
    SELECT
      COALESCE(metadata->>'source', source_type, 'unknown') AS source,
      COUNT(DISTINCT source_id)::int AS documents
    FROM document_chunks
    WHERE ${CORPUS_EXCLUDES_PRIVATE_SQL}
    GROUP BY 1
    ORDER BY documents DESC
  `);

  const sources = {};
  bySource.rows.forEach((row) => {
    const key = labelSourceKey(row.source);
    sources[key] = (sources[key] || 0) + Number(row.documents || 0);
  });

  return {
    documents: Number(totals.rows[0]?.documents || 0),
    chunks: Number(totals.rows[0]?.chunks || 0),
    sources
  };
}

module.exports = {
  getCorpusStats,
  labelSourceKey
};
