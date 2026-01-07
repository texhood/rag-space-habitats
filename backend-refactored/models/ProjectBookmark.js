// models/ProjectBookmark.js
const pool = require('../config/database');

class ProjectBookmark {
  /**
   * Create a bookmark
   */
  static async create(projectId, bookmarkData) {
    const {
      queryText,
      responseText,
      modelUsed,
      citedDocuments = [],
      userNotes = '',
      tags = []
    } = bookmarkData;

    const result = await pool.query(
      `INSERT INTO project_bookmarks (project_id, query_text, response_text, model_used, cited_documents, user_notes, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [projectId, queryText, responseText, modelUsed, JSON.stringify(citedDocuments), userNotes, tags]
    );

    return this._formatRow(result.rows[0]);
  }

  /**
   * Get bookmark by ID
   */
  static async getById(bookmarkId, projectId = null) {
    let query = `SELECT * FROM project_bookmarks WHERE id = $1`;
    let params = [bookmarkId];

    if (projectId) {
      query += ` AND project_id = $2`;
      params.push(projectId);
    }

    const result = await pool.query(query, params);
    return result.rows[0] ? this._formatRow(result.rows[0]) : null;
  }

  /**
   * Get bookmarks for project
   */
  static async getByProjectId(projectId, limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM project_bookmarks
       WHERE project_id = $1
       ORDER BY bookmarked_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );

    return result.rows.map(row => this._formatRow(row));
  }

  /**
   * Get bookmarks by tag
   */
  static async getByTag(projectId, tag, limit = 50) {
    const result = await pool.query(
      `SELECT * FROM project_bookmarks
       WHERE project_id = $1 AND $2 = ANY(tags)
       ORDER BY bookmarked_at DESC
       LIMIT $3`,
      [projectId, tag, limit]
    );

    return result.rows.map(row => this._formatRow(row));
  }

  /**
   * Search bookmarks by query or response text
   */
  static async search(projectId, searchText, limit = 50) {
    const result = await pool.query(
      `SELECT * FROM project_bookmarks
       WHERE project_id = $1 AND (query_text ILIKE $2 OR response_text ILIKE $2)
       ORDER BY bookmarked_at DESC
       LIMIT $3`,
      [projectId, `%${searchText}%`, limit]
    );

    return result.rows.map(row => this._formatRow(row));
  }

  /**
   * Update bookmark
   */
  static async update(bookmarkId, projectId, updateData) {
    const { userNotes, tags } = updateData;

    const result = await pool.query(
      `UPDATE project_bookmarks
       SET user_notes = COALESCE($1, user_notes),
           tags = COALESCE($2, tags)
       WHERE id = $3 AND project_id = $4
       RETURNING *`,
      [userNotes, tags ? tags : null, bookmarkId, projectId]
    );

    return result.rows[0] ? this._formatRow(result.rows[0]) : null;
  }

  /**
   * Add tag to bookmark
   */
  static async addTag(bookmarkId, projectId, tag) {
    const result = await pool.query(
      `UPDATE project_bookmarks
       SET tags = array_append(tags, $1)
       WHERE id = $2 AND project_id = $3 AND NOT $1 = ANY(tags)
       RETURNING *`,
      [tag, bookmarkId, projectId]
    );

    return result.rows[0] ? this._formatRow(result.rows[0]) : null;
  }

  /**
   * Remove tag from bookmark
   */
  static async removeTag(bookmarkId, projectId, tag) {
    const result = await pool.query(
      `UPDATE project_bookmarks
       SET tags = array_remove(tags, $1)
       WHERE id = $2 AND project_id = $3
       RETURNING *`,
      [tag, bookmarkId, projectId]
    );

    return result.rows[0] ? this._formatRow(result.rows[0]) : null;
  }

  /**
   * Delete bookmark
   */
  static async delete(bookmarkId, projectId) {
    const result = await pool.query(
      `DELETE FROM project_bookmarks WHERE id = $1 AND project_id = $2 RETURNING id`,
      [bookmarkId, projectId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get bookmark count for project
   */
  static async countByProjectId(projectId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM project_bookmarks WHERE project_id = $1`,
      [projectId]
    );

    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Get all tags for project
   */
  static async getAllTags(projectId) {
    const result = await pool.query(
      `SELECT DISTINCT unnest(tags) as tag FROM project_bookmarks WHERE project_id = $1 ORDER BY tag`,
      [projectId]
    );

    return result.rows.map(row => row.tag);
  }

  /**
   * Format database row to application object
   */
  static _formatRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      queryText: row.query_text,
      responseText: row.response_text,
      modelUsed: row.model_used,
      citedDocuments: typeof row.cited_documents === 'string' ? JSON.parse(row.cited_documents) : row.cited_documents,
      userNotes: row.user_notes,
      tags: row.tags || [],
      bookmarkedAt: row.bookmarked_at
    };
  }
}

module.exports = ProjectBookmark;
