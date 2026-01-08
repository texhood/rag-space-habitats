// models/ProjectDocument.js
const pool = require('../config/database');

class ProjectDocument {
  /**
   * Create project document record
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
}

module.exports = ProjectDocument;
