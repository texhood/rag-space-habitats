-- One row per page-sized piece of an uploaded project file.
CREATE TABLE IF NOT EXISTS project_document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_project_document_chunks_project
  ON project_document_chunks (project_id);
