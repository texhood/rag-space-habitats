// models/SystemSettings.js
const pool = require('../config/database');

class SystemSettings {
  /**
   * Get a setting by key
   */
  static async get(key) {
    const [rows] = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    
    if (rows.length === 0) return null;
    
    // Parse JSON properly - MariaDB returns JSON as object
    const value = rows[0].setting_value;
    return typeof value === 'string' ? JSON.parse(value) : value;
  }

  /**
   * Update a setting
   */
  static async set(key, value, updatedBy) {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         setting_value = VALUES(setting_value),
         updated_by = VALUES(updated_by)`,
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
    const [rows] = await pool.query(
      'SELECT setting_key, setting_value, description, updated_at FROM system_settings'
    );
    
    return rows.map(row => ({
      ...row,
      setting_value: typeof row.setting_value === 'string' ? JSON.parse(row.setting_value) : row.setting_value
    }));
  }
}

module.exports = SystemSettings;