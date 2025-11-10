#!/usr/bin/env node
require('dotenv').config();
const pool = require('../config/database');

async function fixBetaMode() {
  try {
    // Get current value
    const [rows] = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['beta_mode']
    );

    if (rows.length === 0) {
      console.log('❌ Beta mode setting not found');
      process.exit(1);
    }

    // Parse current value (it's a string, not JSON type)
    const currentValue = JSON.parse(rows[0].setting_value);
    console.log('Current value:', currentValue);

    // Update with proper boolean
    const updatedValue = {
      ...currentValue,
      enabled: true, // Force to boolean true
      price: parseFloat(currentValue.price || 1.00)
    };

    console.log('Updated value:', updatedValue);

    // Store back as JSON string
    await pool.query(
      'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
      [JSON.stringify(updatedValue), 'beta_mode']
    );

    console.log('✅ Beta mode fixed!');

    // Verify
    const [verifyRows] = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['beta_mode']
    );
    
    console.log('Verified value:', JSON.parse(verifyRows[0].setting_value));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixBetaMode();