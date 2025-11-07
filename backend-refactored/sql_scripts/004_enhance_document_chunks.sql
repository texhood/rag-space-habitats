-- Enhance document_chunks table with source tracking
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'mongodb_submission',
ADD COLUMN IF NOT EXISTS chunk_index INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS embedding JSON,
ADD INDEX idx_source_id (source_id);