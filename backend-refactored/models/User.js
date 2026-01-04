// models/User.js
const bcrypt = require('bcrypt');
const pool = require('../config/database');

class User {
  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, role, subscription_tier, subscription_status FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all users
   */
  static async findAll() {
    const result = await pool.query(
      'SELECT id, username, email, role, subscription_tier, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Create a new user
   */
  static async create(username, password, role = 'user', email = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, role, email) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, hashedPassword, role, email]
    );
    return result.rows[0].id;
  }

  /**
   * Update user role
   */
  static async updateRole(id, role) {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if user exists
   */
  static async exists(username) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Update user's LLM preference
   */
  static async updateLLMPreference(id, preference) {
    const validPreferences = ['grok', 'claude', 'both'];
    if (!validPreferences.includes(preference)) {
      throw new Error('Invalid LLM preference. Must be: grok, claude, or both');
    }

    const result = await pool.query(
      'UPDATE users SET llm_preference = $1 WHERE id = $2',
      [preference, id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get user's LLM preference
   */
  static async getLLMPreference(id) {
    const result = await pool.query(
      'SELECT llm_preference FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0]?.llm_preference || 'grok';
  }
}

module.exports = User;