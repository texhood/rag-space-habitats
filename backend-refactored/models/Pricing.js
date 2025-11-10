// models/Pricing.js
const pool = require('../config/database');

class Pricing {
  /**
   * Get tier info with pricing and features
   */
  static async getByTierKey(tierKey) {
    const [tiers] = await pool.query(`
      SELECT t.*, p.price, p.currency, p.billing_period, p.stripe_price_id
      FROM subscription_tiers t
      LEFT JOIN tier_pricing p ON t.id = p.tier_id AND p.is_active = TRUE
      WHERE t.tier_key = ? AND t.is_active = TRUE
      LIMIT 1
    `, [tierKey]);

    if (tiers.length === 0) return null;

    const tier = tiers[0];

    // Get features for this tier
    const [features] = await pool.query(`
      SELECT feature_key, feature_value
      FROM tier_features
      WHERE tier_id = ?
    `, [tier.id]);

    // Convert features array to object
    const featureObj = {};
    features.forEach(f => {
      const key = f.feature_key;
      let value = f.feature_value;
      
      // Parse JSON strings
      if (value.startsWith('[') || value.startsWith('{')) {
        value = JSON.parse(value);
      } else if (!isNaN(value)) {
        value = parseInt(value);
      }
      
      featureObj[key] = value;
    });

    return {
      ...tier,
      features: featureObj
    };
  }

  /**
   * Get all active tiers with pricing
   */
  static async getAllTiers() {
    const [tiers] = await pool.query(`
      SELECT t.*, p.price, p.currency, p.billing_period, p.stripe_price_id
      FROM subscription_tiers t
      LEFT JOIN tier_pricing p ON t.id = p.tier_id AND p.is_active = TRUE
      WHERE t.is_active = TRUE
      ORDER BY t.sort_order
    `);

    // Get features for all tiers
    const tiersWithFeatures = [];
    for (const tier of tiers) {
      const [features] = await pool.query(`
        SELECT feature_key, feature_value
        FROM tier_features
        WHERE tier_id = ?
      `, [tier.id]);

      const featureObj = {};
      features.forEach(f => {
        const key = f.feature_key;
        let value = f.feature_value;
        
        if (value.startsWith('[') || value.startsWith('{')) {
          value = JSON.parse(value);
        } else if (!isNaN(value)) {
          value = parseInt(value);
        }
        
        featureObj[key] = value;
      });

      tiersWithFeatures.push({
        ...tier,
        features: featureObj
      });
    }

    return tiersWithFeatures;
  }

  /**
   * Update pricing for a tier
   */
  static async updatePrice(tierKey, price, stripeId = null) {
    await pool.query(`
      UPDATE tier_pricing p
      JOIN subscription_tiers t ON p.tier_id = t.id
      SET p.price = ?, p.stripe_price_id = ?
      WHERE t.tier_key = ? AND p.is_active = TRUE
    `, [price, stripeId, tierKey]);
  }

  /**
   * Update a feature for a tier
   */
  static async updateFeature(tierKey, featureKey, featureValue) {
    const valueStr = typeof featureValue === 'object' 
      ? JSON.stringify(featureValue) 
      : String(featureValue);

    await pool.query(`
      UPDATE tier_features f
      JOIN subscription_tiers t ON f.tier_id = t.id
      SET f.feature_value = ?
      WHERE t.tier_key = ? AND f.feature_key = ?
    `, [valueStr, tierKey, featureKey]);
  }

  /**
   * Get limits in UsageService format (for backward compatibility)
   */
  static async getLimits(tierKey) {
    const tier = await this.getByTierKey(tierKey);
    
    if (!tier) return null;

    return {
      queries_per_day: tier.features.queries_per_day || -1,
      uploads_per_month: tier.features.uploads_per_month || -1,
      max_file_size: (tier.features.max_file_size_mb || 100) * 1024 * 1024,
      llm_access: tier.features.llm_access || ['grok'],
      price: parseFloat(tier.price || 0)
    };
  }
}

module.exports = Pricing;