// services/usageService.js
const pool = require('../config/database');
const Pricing = require('../models/Pricing');
const { LIMITS, getLimits, canPerformAction } = require('./usageLimits');

class UsageService {
  static LIMITS = LIMITS;

  /**
   * Log a usage action
   */
  static async logUsage(userId, action, metadata = {}) {
    await pool.query(
      'INSERT INTO usage_logs (user_id, action, metadata) VALUES ($1, $2, $3)',
      [userId, action, JSON.stringify(metadata)]
    );

    // Update daily usage summary using PostgreSQL UPSERT
    const today = new Date().toISOString().split('T')[0];
    
    if (action === 'query') {
      await pool.query(
        `INSERT INTO daily_usage (user_id, date, queries) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (user_id, date) DO UPDATE 
         SET queries = daily_usage.queries + 1`,
        [userId, today]
      );
    } else if (action === 'upload') {
      await pool.query(
        `INSERT INTO daily_usage (user_id, date, uploads) 
         VALUES ($1, $2, 1) 
         ON CONFLICT (user_id, date) DO UPDATE 
         SET uploads = daily_usage.uploads + 1`,
        [userId, today]
      );
    }
  }

  /**
   * Get user's usage for today
   */
  static async getTodayUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'SELECT queries, uploads FROM daily_usage WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    return result.rows[0] || { queries: 0, uploads: 0 };
  }

  /**
   * Get user's usage for current month
   */
  static async getMonthUsage(userId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(queries), 0) as queries,
        COALESCE(SUM(uploads), 0) as uploads
       FROM daily_usage 
       WHERE user_id = $1 AND date >= $2`,
      [userId, startOfMonth.toISOString().split('T')[0]]
    );

    const row = result.rows[0];
    return { 
      queries: parseInt(row.queries) || 0, 
      uploads: parseInt(row.uploads) || 0 
    };
  }

  /**
   * Check if user can perform action
   */
  static async canPerformAction(userId, action, tier) {
    const limits = getLimits(tier);

    if (action === 'query') {
      if (limits.queries_per_day === -1) {
        return canPerformAction(action, tier);
      }
      const usage = await this.getTodayUsage(userId);
      return canPerformAction(action, tier, usage);
    }

    if (action === 'upload') {
      if (limits.uploads_per_month === -1) {
        return canPerformAction(action, tier);
      }
      const usage = await this.getMonthUsage(userId);
      return canPerformAction(action, tier, usage);
    }

    return canPerformAction(action, tier);
  }

  /**
   * Get tier limits for a user (from database with fallback to hardcoded)
   */
  static async getLimits(tier) {
    try {
      // Try to get from database first
      const dbLimits = await Pricing.getLimits(tier);
      if (dbLimits) {
        console.log(`[Pricing] Loaded limits for ${tier} from database`);
        return dbLimits;
      }
    } catch (err) {
      console.error('[Pricing] Failed to load from database:', err.message);
    }
    
    console.log(`[Pricing] Using hardcoded limits for ${tier}`);
    return getLimits(tier);
  }
}

module.exports = UsageService;
