USE manual_db;
DROP TABLE IF EXISTS processed_pdfs;
CREATE TABLE processed_pdfs (
  file_hash VARCHAR(64) PRIMARY KEY,
  file_path VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);