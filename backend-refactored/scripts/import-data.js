const { Pool } = require('pg');
const fs = require('fs');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function importData() {
  const data = JSON.parse(fs.readFileSync('seed-data.json', 'utf8'));
  
  // Order matters for foreign keys
  const tableOrder = [
    'users',
    'subscription_tiers',
    'tier_features',
    'tier_pricing',
    'subscriptions',
    'system_settings',
    'document_chunks',
    'query_log',
    'queries'
  ];

  for (const table of tableOrder) {
    const rows = data[table];
    if (!rows || rows.length === 0) {
      console.log(`⏭️  ${table}: no data`);
      continue;
    }

    try {
      // Clear existing data
      await pool.query(`TRUNCATE ${table} CASCADE`);
      
      // Get column names from first row
      const columns = Object.keys(rows[0]);
      
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await pool.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }
      
      // Reset sequence to max id + 1
      await pool.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 0) + 1, false) 
        FROM ${table}
      `).catch(() => {}); // Ignore if no serial column
      
      console.log(`✅ ${table}: ${rows.length} rows imported`);
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n✅ Import complete');
  await pool.end();
  process.exit(0);
}

importData();