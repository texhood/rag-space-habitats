// models/SystemSettings.js
const pool = require('../config/database');

class SystemSettings {
  /**
   * Get a setting by key
   */
  static async get(key) {
    const result = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      [key]
    );
    
    if (result.rows.length === 0) return null;
    
    // PostgreSQL JSONB returns as object, TEXT needs parsing
    const value = result.rows[0].setting_value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Update a setting (upsert)
   */
  static async set(key, value, updatedBy) {
    // For PostgreSQL JSONB, we can store objects directly
    // But to maintain compatibility, we'll use JSON string
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (setting_key) DO UPDATE 
       SET setting_value = EXCLUDED.setting_value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
      [key, jsonValue, updatedBy]
    );
  }

  /**
   * Get beta mode configuration
   */
  static async getBetaMode() {
    const betaSettings = await this.get('beta_mode');
    
    if (!betaSettings) {
      return {
        enabled: false,
        price: 1.00,
        stripe_price_id: null,
        benefits: 'All Pro features at beta pricing'
      };
    }
    
    // Ensure enabled is a boolean
    return {
      ...betaSettings,
      enabled: betaSettings.enabled === true || betaSettings.enabled === 'true' || betaSettings.enabled === 1
    };
  }

  /**
   * Update beta mode
   */
  static async setBetaMode(config, updatedBy) {
    // Ensure enabled is a boolean in the stored JSON
    const configToStore = {
      ...config,
      enabled: config.enabled === true || config.enabled === 'true' || config.enabled === 1
    };
    
    await this.set('beta_mode', configToStore, updatedBy);
  }

  /**
   * Check if beta mode is enabled
   */
  static async isBetaModeEnabled() {
    const betaSettings = await this.getBetaMode();
    return betaSettings.enabled === true;
  }

  /**
   * Get all settings
   */
  static async getAll() {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description, updated_at FROM system_settings'
    );
    
    return result.rows.map(row => {
      let value = row.setting_value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }
      return {
        ...row,
        setting_value: value
      };
    });
  }
}

module.exports = SystemSettings;
