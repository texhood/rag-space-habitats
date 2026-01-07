// models/Feedback.js
const pool = require('../config/database');

class Feedback {
  /**
   * Create feedback record
   */
  static async create(userId, feedbackData) {
    const { queryId, feedbackType, reaction, rating, documentRelevance, comment } = feedbackData;

    const result = await pool.query(
      `INSERT INTO feedback (user_id, query_id, feedback_type, reaction, rating, document_relevance, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [userId, queryId, feedbackType, reaction, rating, documentRelevance, comment]
    );

    return result.rows[0];
  }

  /**
   * Get feedback by ID
   */
  static async getById(feedbackId) {
    const result = await pool.query(
      `SELECT
        f.id,
        f.user_id,
        f.query_id,
        f.feedback_type,
        f.reaction,
        f.rating,
        f.document_relevance,
        f.comment,
        f.created_at,
        f.updated_at,
        u.username,
        u.email
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.id = $1`,
      [feedbackId]
    );

    return result.rows[0];
  }

  /**
   * Get all feedback for a query
   */
  static async getByQuery(queryId) {
    const result = await pool.query(
      `SELECT
        f.id,
        f.user_id,
        f.feedback_type,
        f.reaction,
        f.rating,
        f.document_relevance,
        f.comment,
        f.created_at,
        u.username
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.query_id = $1
       ORDER BY f.created_at DESC`,
      [queryId]
    );

    return result.rows;
  }

  /**
   * Get user's feedback
   */
  static async getByUser(userId, limit = 20) {
    const result = await pool.query(
      `SELECT
        f.id,
        f.query_id,
        f.feedback_type,
        f.reaction,
        f.rating,
        f.document_relevance,
        f.comment,
        f.created_at,
        ql.question
       FROM feedback f
       LEFT JOIN query_log ql ON f.query_id = ql.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get recent feedback for admin dashboard
   */
  static async getRecent(limit = 50, feedbackType = null) {
    let query = `
      SELECT
        f.id,
        f.user_id,
        f.query_id,
        f.feedback_type,
        f.reaction,
        f.rating,
        f.document_relevance,
        f.comment,
        f.created_at,
        u.username,
        u.email,
        ql.question
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       LEFT JOIN query_log ql ON f.query_id = ql.id
    `;

    let params = [];

    if (feedbackType) {
      query += ` WHERE f.feedback_type = $1`;
      params.push(feedbackType);
      query += ` ORDER BY f.created_at DESC LIMIT $2`;
      params.push(limit);
    } else {
      query += ` ORDER BY f.created_at DESC LIMIT $1`;
      params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Update feedback
   */
  static async update(feedbackId, updateData) {
    const { comment, reaction, rating, documentRelevance } = updateData;

    const result = await pool.query(
      `UPDATE feedback
       SET comment = COALESCE($1, comment),
           reaction = COALESCE($2, reaction),
           rating = COALESCE($3, rating),
           document_relevance = COALESCE($4, document_relevance),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [comment, reaction, rating, documentRelevance, feedbackId]
    );

    return result.rows[0];
  }

  /**
   * Delete feedback
   */
  static async delete(feedbackId) {
    const result = await pool.query(
      'DELETE FROM feedback WHERE id = $1 RETURNING id',
      [feedbackId]
    );

    return result.rows[0] !== undefined;
  }

  /**
   * Get feedback analytics
   */
  static async getAnalytics(days = 7) {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_feedback,
        COUNT(DISTINCT user_id) as users_provided_feedback,

        -- Reaction stats
        COUNT(CASE WHEN feedback_type = 'reaction' THEN 1 END) as reaction_count,
        COUNT(CASE WHEN feedback_type = 'reaction' AND reaction = 'thumbs_up' THEN 1 END) as thumbs_up_count,
        COUNT(CASE WHEN feedback_type = 'reaction' AND reaction = 'thumbs_down' THEN 1 END) as thumbs_down_count,

        -- Rating stats
        COUNT(CASE WHEN feedback_type = 'rating' THEN 1 END) as rating_count,
        ROUND(AVG(CASE WHEN feedback_type = 'rating' THEN rating ELSE NULL END)::numeric, 2) as avg_rating,

        -- Relevance stats
        COUNT(CASE WHEN feedback_type = 'relevance' THEN 1 END) as relevance_count,
        COUNT(CASE WHEN feedback_type = 'relevance' AND document_relevance = 'relevant' THEN 1 END) as relevant_count,
        COUNT(CASE WHEN feedback_type = 'relevance' AND document_relevance = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN feedback_type = 'relevance' AND document_relevance = 'not_relevant' THEN 1 END) as not_relevant_count,

        -- General feedback stats
        COUNT(CASE WHEN feedback_type = 'general' THEN 1 END) as general_feedback_count,
        COUNT(CASE WHEN feedback_type = 'general' AND comment IS NOT NULL THEN 1 END) as general_comments_count
      FROM feedback
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
    `, [days]);

    const row = result.rows[0];

    // Convert to camelCase for consistency with frontend
    return {
      totalFeedback: parseInt(row.total_feedback) || 0,
      usersProvidedFeedback: parseInt(row.users_provided_feedback) || 0,

      reactions: {
        total: parseInt(row.reaction_count) || 0,
        thumbsUp: parseInt(row.thumbs_up_count) || 0,
        thumbsDown: parseInt(row.thumbs_down_count) || 0
      },

      ratings: {
        total: parseInt(row.rating_count) || 0,
        average: parseFloat(row.avg_rating) || 0
      },

      relevance: {
        total: parseInt(row.relevance_count) || 0,
        relevant: parseInt(row.relevant_count) || 0,
        partial: parseInt(row.partial_count) || 0,
        notRelevant: parseInt(row.not_relevant_count) || 0
      },

      generalFeedback: {
        total: parseInt(row.general_feedback_count) || 0,
        withComments: parseInt(row.general_comments_count) || 0
      }
    };
  }

  /**
   * Get sentiment from feedback (positive/negative/neutral)
   */
  static async getSentimentSummary(days = 7) {
    const result = await pool.query(`
      SELECT
        CASE
          WHEN feedback_type = 'reaction' AND reaction = 'thumbs_up' THEN 'positive'
          WHEN feedback_type = 'reaction' AND reaction = 'thumbs_down' THEN 'negative'
          WHEN feedback_type = 'rating' AND rating >= 4 THEN 'positive'
          WHEN feedback_type = 'rating' AND rating <= 2 THEN 'negative'
          WHEN feedback_type = 'rating' AND rating = 3 THEN 'neutral'
          WHEN feedback_type = 'relevance' AND document_relevance = 'relevant' THEN 'positive'
          WHEN feedback_type = 'relevance' AND document_relevance = 'not_relevant' THEN 'negative'
          WHEN feedback_type = 'relevance' AND document_relevance = 'partial' THEN 'neutral'
          ELSE 'neutral'
        END as sentiment,
        COUNT(*) as count
      FROM feedback
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY sentiment
    `, [days]);

    const sentiments = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    result.rows.forEach(row => {
      sentiments[row.sentiment] = parseInt(row.count) || 0;
    });

    return sentiments;
  }
}

module.exports = Feedback;
