const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
console.log('Connecting to:', dbUrl.split('@')[1]);

const pool = new Pool({
  connectionString: dbUrl,
  ssl: false
});

async function listTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\nTables found:', result.rows.length);
    result.rows.forEach(row => console.log(' -', row.table_name));
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listTables();