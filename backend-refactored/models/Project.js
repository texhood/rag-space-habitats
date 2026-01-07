// models/Project.js
const pool = require('../config/database');

class Project {
  /**
   * Create a new project
   */
  static async create(userId, projectData) {
    const { name, description, objectives, constraints } = projectData;

    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, objectives, constraints)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, description, objectives, constraints]
    );

    return result.rows[0];
  }

  /**
   * Get project by ID
   */
  static async getById(projectId, userId = null) {
    let query = `SELECT * FROM projects WHERE id = $1`;
    let params = [projectId];

    // If userId provided, ensure user owns the project
    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get all projects for a user
   */
  static async getByUserId(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM projects
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get project count for user
   */
  static async countByUserId(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM projects WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Update project
   */
  static async update(projectId, userId, updateData) {
    const { name, description, objectives, constraints, is_active } = updateData;

    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           objectives = COALESCE($3, objectives),
           constraints = COALESCE($4, constraints),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, description, objectives, constraints, is_active, projectId, userId]
    );

    return result.rows[0];
  }

  /**
   * Delete project
   */
  static async delete(projectId, userId) {
    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id`,
      [projectId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Add filter to project
   */
  static async addFilter(projectId, filterType, filterValue) {
    const result = await pool.query(
      `INSERT INTO project_filters (project_id, filter_type, filter_value)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, filterType, filterValue]
    );

    return result.rows[0];
  }

  /**
   * Get project filters
   */
  static async getFilters(projectId) {
    const result = await pool.query(
      `SELECT * FROM project_filters WHERE project_id = $1 ORDER BY created_at`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Remove filter from project
   */
  static async removeFilter(filterId, projectId) {
    const result = await pool.query(
      `DELETE FROM project_filters WHERE id = $1 AND project_id = $2 RETURNING id`,
      [filterId, projectId]
    );

    return result.rows.length > 0;
  }

  /**
   * Pin a document to project
   */
  static async pinDocument(projectId, mongoId, documentTitle, documentSource) {
    const result = await pool.query(
      `INSERT INTO project_pinned_documents (project_id, document_mongo_id, document_title, document_source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, document_mongo_id) DO NOTHING
       RETURNING *`,
      [projectId, mongoId, documentTitle, documentSource]
    );

    return result.rows[0];
  }

  /**
   * Get pinned documents
   */
  static async getPinnedDocuments(projectId) {
    const result = await pool.query(
      `SELECT * FROM project_pinned_documents WHERE project_id = $1 ORDER BY pinned_at DESC`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Unpin a document from project
   */
  static async unpinDocument(pinnedId, projectId) {
    const result = await pool.query(
      `DELETE FROM project_pinned_documents WHERE id = $1 AND project_id = $2 RETURNING id`,
      [pinnedId, projectId]
    );

    return result.rows.length > 0;
  }

  /**
   * Count pinned documents
   */
  static async countPinnedDocuments(projectId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM project_pinned_documents WHERE project_id = $1`,
      [projectId]
    );

    return parseInt(result.rows[0].count) || 0;
  }
}

module.exports = Project;
