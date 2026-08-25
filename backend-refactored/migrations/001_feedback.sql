CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_id INTEGER REFERENCES query_log(id) ON DELETE SET NULL,
  feedback_type VARCHAR(20) NOT NULL
    CHECK (feedback_type IN ('reaction', 'rating', 'relevance', 'general')),
  reaction VARCHAR(20)
    CHECK (reaction IS NULL OR reaction IN ('thumbs_up', 'thumbs_down')),
  rating INTEGER
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  document_relevance VARCHAR(20)
    CHECK (document_relevance IS NULL OR document_relevance IN ('relevant', 'partial', 'not_relevant')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_user
  ON feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_query
  ON feedback (query_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_type
  ON feedback (feedback_type, created_at DESC);

ALTER TABLE query_log
  ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_query_log_helpful_count ON query_log (helpful_count);
