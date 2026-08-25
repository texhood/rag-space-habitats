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
);

CREATE TABLE IF NOT EXISTS project_filters (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  filter_type VARCHAR(50) NOT NULL,
  filter_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS project_pinned_documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  document_mongo_id VARCHAR(255) NOT NULL,
  document_title VARCHAR(500),
  document_source VARCHAR(100),
  pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, document_mongo_id)
);

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
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_project_filters_project ON project_filters (project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents (project_id);
CREATE INDEX IF NOT EXISTS idx_project_pinned_project ON project_pinned_documents (project_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_project ON project_bookmarks (project_id);
