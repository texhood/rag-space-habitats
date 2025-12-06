// models/Subscription.js
const pool = require('../config/database');

class Subscription {
  /**
   * Create a new subscription
   */
  static async create(userId, tier, stripeData = {}) {
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
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
      'UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3',
      [tier, 'active', userId]
    );

    return result.rows[0].id;
  }

  /**
   * Get user's current subscription
   */
  static async getByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update subscription
   */
  static async update(subscriptionId, updates) {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    // Build parameterized SET clause: "key1 = $1, key2 = $2, ..."
    const setClause = keys
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(', ');
    
    // subscriptionId is the last parameter
    values.push(subscriptionId);

    await pool.query(
      `UPDATE subscriptions SET ${setClause} WHERE id = $${values.length}`,
      values
    );
  }

  /**
   * Cancel subscription
   */
  static async cancel(userId) {
    await pool.query(
      'UPDATE subscriptions SET status = $1, cancel_at_period_end = TRUE WHERE user_id = $2',
      ['canceling', userId]
    );

    await pool.query(
      'UPDATE users SET subscription_status = $1 WHERE id = $2',
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
    let paramCount = 0;

    if (filters.tier) {
      paramCount++;
      conditions.push(`s.tier = $${paramCount}`);
      values.push(filters.tier);
    }

    if (filters.status) {
      paramCount++;
      conditions.push(`s.status = $${paramCount}`);
      values.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get subscription statistics
   */
  static async getStats() {
    const result = await pool.query(`
      SELECT 
        tier,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM subscriptions
      GROUP BY tier
    `);

    return result.rows;
  }
}

module.exports = Subscription;
