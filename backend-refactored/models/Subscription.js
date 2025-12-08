// models/Subscription.js
const pool = require('../config/database');

class Subscription {
  /**
   * Create a new subscription
   */
  static async create(userId, tierKey, stripeData = {}) {
    const [result] = await pool.query(
      `INSERT INTO subscriptions 
       (user_id, tier_key, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        tierKey,
        stripeData.status || 'active',
        stripeData.stripe_customer_id || null,
        stripeData.stripe_subscription_id || null,
        stripeData.stripe_price_id || null,
        stripeData.current_period_start ? new Date(stripeData.current_period_start * 1000) : null,
        stripeData.current_period_end ? new Date(stripeData.current_period_end * 1000) : null
      ]
    );
    return result.rows ? result.rows[0] : result;
  }

  /**
   * Get subscription by user ID
   */
  static async getByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  static async getByStripeSubscriptionId(stripeSubscriptionId) {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update subscription
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Map tier to tier_key if provided
    if (updates.tier) {
      updates.tier_key = updates.tier;
      delete updates.tier;
    }

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE subscriptions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Update subscription by Stripe subscription ID
   */
  static async updateByStripeId(stripeSubscriptionId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Map tier to tier_key if provided
    if (updates.tier) {
      updates.tier_key = updates.tier;
      delete updates.tier;
    }

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    if (fields.length === 0) return null;

    values.push(stripeSubscriptionId);
    const result = await pool.query(
      `UPDATE subscriptions SET ${fields.join(', ')}, updated_at = NOW() WHERE stripe_subscription_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Update user's subscription tier
   */
  static async updateUserTier(userId, tierKey, status = 'active') {
    await pool.query(
      `UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3`,
      [tierKey, status, userId]
    );
  }

  /**
   * Delete subscription
   */
  static async delete(id) {
    await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
  }
}

module.exports = Subscription;