/**
 * Sequential SQL migration runner (_migrations ledger).
 * Same pattern as Business Manager / Swords: backend/migrations/NNN_snake_case.sql
 *
 *   npm run migrate
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const migrationsDir = path.join(__dirname, '..', 'migrations');

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
  });
}

function listMigrationFiles(dir = migrationsDir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    .sort();
}

async function runMigrations(pool = createPool()) {
  console.log('Space Habitats — Database Migration\n');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Migrations table ready\n');

    const files = listMigrationFiles();
    if (files.length === 0) {
      console.log('No migration files found in', migrationsDir);
      return;
    }

    const executedResult = await pool.query('SELECT name FROM _migrations ORDER BY id');
    const executed = executedResult.rows.map((row) => row.name);
    console.log(`Found ${files.length} migration file(s), ${executed.length} already executed\n`);

    let pendingCount = 0;
    for (const file of files) {
      if (executed.includes(file)) {
        console.log(`⏭  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        console.log(`✓  Completed ${file}\n`);
        pendingCount += 1;
      } catch (error) {
        console.error(`✗  Failed ${file}:`);
        console.error(error.message);
        throw error;
      }
    }

    if (pendingCount === 0) {
      console.log('\n✓ Database is up to date');
    } else {
      console.log(`\n✓ Successfully ran ${pendingCount} migration(s)`);
    }
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

module.exports = {
  migrationsDir,
  listMigrationFiles,
  runMigrations
};

if (require.main === module) {
  runMigrations();
}
