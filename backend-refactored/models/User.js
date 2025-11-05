// models/User.js
const bcrypt = require('bcrypt');
const pool = require('../config/database');

class User {
  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  /**
   * Get all users
   */
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  /**
   * Create a new user
   */
  static async create(username, password, role = 'user') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    return result.insertId;
  }

  /**
   * Update user role
   */
  static async updateRole(id, role) {
    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Check if user exists
   */
  static async exists(username) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      [username]
    );
    return rows[0].count > 0;
  }

  /**
   * Update user's LLM preference
   */
  static async updateLLMPreference(id, preference) {
    const validPreferences = ['grok', 'claude', 'both'];
    if (!validPreferences.includes(preference)) {
      throw new Error('Invalid LLM preference. Must be: grok, claude, or both');
    }
    
    const [result] = await pool.query(
      'UPDATE users SET llm_preference = ? WHERE id = ?',
      [preference, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get user's LLM preference
   */
  static async getLLMPreference(id) {
    const [rows] = await pool.query(
      'SELECT llm_preference FROM users WHERE id = ?',
      [id]
    );
    return rows[0]?.llm_preference || 'grok';
  }
}

module.exports = User;