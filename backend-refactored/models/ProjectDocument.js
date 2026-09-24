// models/ProjectDocument.js
const pool = require('../config/database');

class ProjectDocument {
  /**
   * Create project document record
   *
   * @param {number} projectId
   * @param {object} documentData
   * @returns {Promise<*>}
   */
  static async create(projectId, documentData) {
    const {
      gridfsId,
      fileName,
      originalName,
      fileSize,
      mimeType,
      contentText,
      processingStatus = 'pending'
    } = documentData;

    const result = await pool.query(
      `INSERT INTO project_documents (project_id, gridfs_id, file_name, original_name, file_size, mime_type, content_text, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [projectId, gridfsId, fileName, originalName, fileSize, mimeType, contentText, processingStatus]
    );

    return result.rows[0];
  }

  /**
   * Get document by ID
   *
   * @param {number} docId
   * @param {number} projectId
   * @returns {Promise<*>}
   */
  static async getById(docId, projectId = null) {
    let query = `SELECT * FROM project_documents WHERE id = $1`;
    let params = [docId];

    if (projectId) {
      query += ` AND project_id = $2`;
      params.push(projectId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get documents for project
   *
   * @param {number} projectId
   * @param {number} limit
   * @returns {Promise<*>}
   */
  static async getByProjectId(projectId, limit = 100) {
    const result = await pool.query(
      `SELECT * FROM project_documents
       WHERE project_id = $1
       ORDER BY uploaded_at DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows;
  }

  /**
   * Get document count for project
   *
   * @param {number} projectId
   * @returns {Promise<*>}
   */
  static async countByProjectId(projectId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM project_documents WHERE project_id = $1`,
      [projectId]
    );

    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Update document processing status
   *
   * @param {number} docId
   * @param {*} processingStatus
   * @param {*} errorMessage
   * @returns {Promise<*>}
   */
  static async updateStatus(docId, processingStatus, errorMessage = null) {
    const result = await pool.query(
      `UPDATE project_documents
       SET processing_status = $1, error_message = $2
       WHERE id = $3
       RETURNING *`,
      [processingStatus, errorMessage, docId]
    );

    return result.rows[0];
  }

  /**
   * Update document with extracted content and embedding
   *
   * @param {number} docId
   * @param {*} contentText
   * @param {Array} embedding
   * @returns {Promise<*>}
   */
  static async updateContent(docId, contentText, embedding = null) {
      const result = await pool.query(
        `UPDATE project_documents
        SET content_text = $1, embedding = $2, processing_status = 'completed'
        WHERE id = $3
        RETURNING *`,
        [contentText, embedding || null, docId]  // Remove JSON.stringify
      );

      return result.rows[0];
    }

  /**
   * Delete document
   *
   * @param {number} docId
   * @param {number} projectId
   * @returns {Promise<*>}
   */
  static async delete(docId, projectId) {
    const result = await pool.query(
      `DELETE FROM project_documents WHERE id = $1 AND project_id = $2 RETURNING gridfs_id`,
      [docId, projectId]
    );

    return result.rows[0]?.gridfs_id || null;
  }

  /**
   * Search documents in project
   *
   * @param {number} projectId
   * @param {string} searchText
   * @param {number} limit
   * @returns {Promise<*>}
   */
  static async searchByContent(projectId, searchText, limit = 10) {
    const result = await pool.query(
      `SELECT id, file_name, original_name, content_text
       FROM project_documents
       WHERE project_id = $1 AND content_text IS NOT NULL
       AND content_text ILIKE $2
       ORDER BY uploaded_at DESC
       LIMIT $3`,
      [projectId, `%${searchText}%`, limit]
    );

    return result.rows;
  }

  /**
   * Get document stats for project
   *
   * @param {number} projectId
   * @returns {Promise<*>}
   */
  static async getStats(projectId) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_count,
        COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_count,
        COALESCE(SUM(file_size), 0) as total_size
       FROM project_documents
       WHERE project_id = $1`,
      [projectId]
    );

    return result.rows[0];
  }

  /**
   * Replace the searchable pieces of one upload.
   * @param {number} docId
   * @param {number} projectId
   * @param {Array<{ index: number, content: string, embedding: string }>} chunks
   * @returns {Promise<void>}
   */
  static async replaceChunks(docId, projectId, chunks) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM project_document_chunks WHERE document_id = $1', [docId]);
      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO project_document_chunks
             (document_id, project_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [docId, projectId, chunk.index, chunk.content, chunk.embedding]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Nearest stored pieces in one project. Older uploads that only have a
   * document-level vector contribute their first 1000 characters.
   * @param {number} projectId
   * @param {string} embeddingStr
   * @param {number} minSimilarity
   * @param {number} [limit]
   * @returns {Promise<Array<{ content: string, similarity: number, kind: string, file_name: string }>>}
   */
  static async searchChunks(projectId, embeddingStr, minSimilarity, limit = 8) {
    const chunks = await pool.query(
      `SELECT c.content, c.chunk_index, d.file_name,
              1 - (c.embedding <=> $1::vector) AS similarity
       FROM project_document_chunks c
       JOIN project_documents d ON d.id = c.document_id
       WHERE c.project_id = $2
         AND c.embedding IS NOT NULL
         AND 1 - (c.embedding <=> $1::vector) >= $3
       ORDER BY c.embedding <=> $1::vector
       LIMIT $4`,
      [embeddingStr, projectId, minSimilarity, limit]
    );

    const legacy = await pool.query(
      `SELECT LEFT(d.content_text, 1000) AS content, d.file_name,
              1 - (d.embedding <=> $1::vector) AS similarity
       FROM project_documents d
       WHERE d.project_id = $2
         AND d.embedding IS NOT NULL
         AND d.content_text IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM project_document_chunks c WHERE c.document_id = d.id
         )
         AND 1 - (d.embedding <=> $1::vector) >= $3
       ORDER BY d.embedding <=> $1::vector
       LIMIT $4`,
      [embeddingStr, projectId, minSimilarity, limit]
    );

    return chunks.rows.map((row) => ({ ...row, kind: 'chunk', similarity: Number(row.similarity) }))
      .concat(legacy.rows.map((row) => ({ ...row, kind: 'chunk', similarity: Number(row.similarity) })));
  }
}

module.exports = ProjectDocument;
