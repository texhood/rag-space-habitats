// models/QueryLog.js
const pool = require('../config/database');

class QueryLog {
  /**
   * Log a query
   */
  static async create(userId, question, responseTimeMs, chunksRetrieved = 0) {
    const result = await pool.query(
      'INSERT INTO query_log (user_id, question, response_time_ms, chunks_retrieved) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, question, responseTimeMs, chunksRetrieved]
    );
    return result.rows[0].id;
  }

  /**
   * Get recent queries
   */
  static async getRecent(limit = 50) {
    const result = await pool.query(`
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
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  /**
   * Get analytics for time period
   */
  static async getAnalytics(days = 7) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_queries,
        COUNT(DISTINCT user_id) as active_users,
        COALESCE(AVG(response_time_ms), 0) as avg_response_time,
        COALESCE(AVG(chunks_retrieved), 0) as avg_chunks_retrieved,
        MIN(created_at) as period_start,
        MAX(created_at) as period_end
      FROM query_log
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
    `, [days]);

    // Ensure numbers are actually numbers
    const row = result.rows[0];
    return {
      total_queries: parseInt(row.total_queries) || 0,
      active_users: parseInt(row.active_users) || 0,
      avg_response_time: parseFloat(row.avg_response_time) || 0,
      avg_chunks_retrieved: parseFloat(row.avg_chunks_retrieved) || 0,
      period_start: row.period_start,
      period_end: row.period_end
    };
  }

  /**
   * Get queries by user
   */
  static async getByUser(userId, limit = 20) {
    const result = await pool.query(`
      SELECT 
        id,
        question,
        response_time_ms,
        chunks_retrieved,
        created_at
      FROM query_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }
}

module.exports = QueryLog;
