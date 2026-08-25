CREATE TABLE IF NOT EXISTS project_conversations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'New conversation',
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES project_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  query_id INTEGER,
  sources JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE project_conversation_messages
  ADD COLUMN IF NOT EXISTS sources JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_conversations_one_active
  ON project_conversations (project_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_conversation_messages_conv
  ON project_conversation_messages (conversation_id, created_at);
