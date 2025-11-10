// models/Subscription.js
const pool = require('../config/database');

class Subscription {
  /**
   * Create a new subscription
   */
  static async create(userId, tier, stripeData = {}) {
    const [result] = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        tier,
        'active',
        stripeData.customerId || null,
        stripeData.subscriptionId || null,
        stripeData.priceId || null,
        stripeData.currentPeriodStart || null,
        stripeData.currentPeriodEnd || null
      ]
    );

    // Update user's subscription tier
    await pool.query(
      'UPDATE users SET subscription_tier = ?, subscription_status = ? WHERE id = ?',
      [tier, 'active', userId]
    );

    return result.insertedId;
  }

  /**
   * Get user's current subscription
   */
  static async getByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Update subscription
   */
  static async update(subscriptionId, updates) {
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(updates), subscriptionId];

    await pool.query(
      `UPDATE subscriptions SET ${setClause} WHERE id = ?`,
      values
    );
  }

  /**
   * Cancel subscription
   */
  static async cancel(userId) {
    await pool.query(
      'UPDATE subscriptions SET status = ?, cancel_at_period_end = TRUE WHERE user_id = ?',
      ['canceling', userId]
    );

    await pool.query(
      'UPDATE users SET subscription_status = ? WHERE id = ?',
      ['canceling', userId]
    );
  }

  /**
   * Get all subscriptions (admin)
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT s.*, u.username, u.email 
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
    `;

    const conditions = [];
    const values = [];

    if (filters.tier) {
      conditions.push('s.tier = ?');
      values.push(filters.tier);
    }

    if (filters.status) {
      conditions.push('s.status = ?');
      values.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.created_at DESC';

    const [rows] = await pool.query(query, values);
    return rows;
  }

  /**
   * Get subscription statistics
   */
  static async getStats() {
    const [stats] = await pool.query(`
      SELECT 
        tier,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM subscriptions
      GROUP BY tier
    `);

    return stats;
  }
}

module.exports = Subscription;