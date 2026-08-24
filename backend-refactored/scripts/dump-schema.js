const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function dumpSchema() {
  try {
    // Get all table definitions
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('-- Production Schema Dump');
    console.log('-- Generated:', new Date().toISOString());
    console.log('-- Tables:', tables.rows.length);
    console.log('');
    console.log('-- Enable pgvector extension');
    console.log('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('');

    for (const { table_name } of tables.rows) {
      // Get column definitions
      const columns = await pool.query(`
        SELECT 
          column_name,
          data_type,
          udt_name,
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table_name]);

      // Get primary key
      const pk = await pool.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary
      `, [table_name]);

      const pkColumns = pk.rows.map(r => r.attname);

      console.log(`-- Table: ${table_name}`);
      console.log(`CREATE TABLE IF NOT EXISTS ${table_name} (`);
      
      const colDefs = columns.rows.map(col => {
        let type = col.udt_name === 'vector' ? 'vector(1024)' : col.data_type;
        if (col.character_maximum_length) {
          type = `${col.data_type}(${col.character_maximum_length})`;
        }
        if (col.udt_name === 'int4') type = 'INTEGER';
        if (col.udt_name === 'int8') type = 'BIGINT';
        if (col.udt_name === 'bool') type = 'BOOLEAN';
        if (col.udt_name === 'float8') type = 'DOUBLE PRECISION';
        if (col.udt_name === 'timestamptz') type = 'TIMESTAMP WITH TIME ZONE';
        if (col.udt_name === 'timestamp') type = 'TIMESTAMP';
        if (col.udt_name === 'jsonb') type = 'JSONB';
        if (col.udt_name === 'text') type = 'TEXT';
        if (col.udt_name === 'varchar') type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
        
        let def = `  ${col.column_name} ${type}`;
        if (col.column_default && col.column_default.includes('nextval')) {
          def = `  ${col.column_name} SERIAL`;
        } else if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        if (col.is_nullable === 'NO' && !col.column_default?.includes('nextval')) {
          def += ' NOT NULL';
        }
        return def;
      });

      if (pkColumns.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
      }

      console.log(colDefs.join(',\n'));
      console.log(');');
      console.log('');
    }

    // Get indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `);

    if (indexes.rows.length > 0) {
      console.log('-- Indexes');
      indexes.rows.forEach(idx => {
        console.log(idx.indexdef + ';');
      });
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

dumpSchema();