// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ PostgreSQL connected successfully');
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  });

// Helper to make PostgreSQL results more MySQL-like for easier migration
// This wrapper handles the common pattern of expecting [rows] from mysql2
pool.queryRows = async function(text, params) {
  const result = await this.query(text, params);
  return [result.rows, result];
};

module.exports = pool;
