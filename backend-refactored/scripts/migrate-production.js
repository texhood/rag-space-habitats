require('dotenv').config();
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        objectives TEXT,
        constraints TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ projects');

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_filters (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        filter_type VARCHAR(50) NOT NULL,
        filter_value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ project_filters');

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        gridfs_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        content_text TEXT,
        embedding vector(1024),
        processing_status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ project_documents');

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_pinned_documents (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        document_mongo_id VARCHAR(255) NOT NULL,
        document_title VARCHAR(500),
        document_source VARCHAR(100),
        pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, document_mongo_id)
      )
    `);
    console.log('✅ project_pinned_documents');

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_bookmarks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        query_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        model_used VARCHAR(50),
        cited_documents JSONB,
        user_notes TEXT,
        tags VARCHAR(255)[],
        bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ project_bookmarks');

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_conversations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL DEFAULT 'New conversation',
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ project_conversations');

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_conversation_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES project_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        query_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ project_conversation_messages');

    await client.query('CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_project_filters_project ON project_filters(project_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_project_pinned_project ON project_pinned_documents(project_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_project_bookmarks_project ON project_bookmarks(project_id)');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_conversations_one_active
        ON project_conversations (project_id)
        WHERE archived_at IS NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_conversation_messages_conv
        ON project_conversation_messages (conversation_id, created_at)
    `);
    console.log('✅ indexes');

    await client.query('COMMIT');
    console.log('✅ Migration complete!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e.message);
  } finally {
    client.release();
    process.exit(0);
  }
}
migrate();