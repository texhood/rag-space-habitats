const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function exportData() {
  const tables = [
    'users',
    'subscription_tiers',
    'subscriptions',
    'system_settings',
    'tier_features',
    'tier_pricing',
    'document_chunks',
    'query_log',
    'queries'
    // Skip: sessions, password_resets (sensitive/temporary)
    // Skip: feedback (empty in production)
    // Skip: daily_usage, usage_logs, processed_pdfs (can regenerate)
  ];

  const data = {};

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table}`);
      data[table] = result.rows;
      console.log(`✅ ${table}: ${result.rows.length} rows`);
    } catch (err) {
      console.log(`⚠️  ${table}: ${err.message}`);
      data[table] = [];
    }
  }

  fs.writeFileSync('seed-data.json', JSON.stringify(data, null, 2));
  console.log('\n✅ Exported to seed-data.json');
  
  await pool.end();
  process.exit(0);
}

exportData();