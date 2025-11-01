// models/QueryLog.js
const pool = require('../config/database');

class QueryLog {
  /**
   * Log a query
   */
  static async create(userId, question, responseTimeMs, chunksRetrieved = 0) {
    const [result] = await pool.query(
      'INSERT INTO query_log (user_id, question, response_time_ms, chunks_retrieved) VALUES (?, ?, ?, ?)',
      [userId, question, responseTimeMs, chunksRetrieved]
    );
    return result.insertId;
  }

  /**
   * Get recent queries
   */
  static async getRecent(limit = 50) {
    const [rows] = await pool.query(`
      SELECT 
        ql.id,
        ql.question,
        ql.response_time_ms,
        ql.chunks_retrieved,
        ql.created_at,
        u.username
      FROM query_log ql
      JOIN users u ON ql.user_id = u.id
      ORDER BY ql.created_at DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  /**
 * Get analytics for time period
 */
  static async getAnalytics(days = 7) {
    const [rows] = await pool.query(`
    SELECT 
      COUNT(*) as total_queries,
      COUNT(DISTINCT user_id) as active_users,
      COALESCE(AVG(response_time_ms), 0) as avg_response_time,
      COALESCE(AVG(chunks_retrieved), 0) as avg_chunks_retrieved,
      MIN(created_at) as period_start,
      MAX(created_at) as period_end
    FROM query_log
    WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [days]);

    // Ensure numbers are actually numbers
    const result = rows[0];
    return {
      total_queries: parseInt(result.total_queries) || 0,
      active_users: parseInt(result.active_users) || 0,
      avg_response_time: parseFloat(result.avg_response_time) || 0,
      avg_chunks_retrieved: parseFloat(result.avg_chunks_retrieved) || 0,
      period_start: result.period_start,
      period_end: result.period_end
    };
  }

  /**
   * Get queries by user
   */
  static async getByUser(userId, limit = 20) {
    const [rows] = await pool.query(`
      SELECT 
        id,
        question,
        response_time_ms,
        chunks_retrieved,
        created_at
      FROM query_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);
    return rows;
  }
}

module.exports = QueryLog;
