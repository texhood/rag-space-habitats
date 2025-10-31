-- Database Migration: Add query_log table for analytics
-- Run this SQL script to add query logging functionality

CREATE TABLE IF NOT EXISTS query_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  question TEXT NOT NULL,
  response_time_ms INT NOT NULL,
  chunks_retrieved INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add created_at to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Optional: Add indexes for better performance
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_username (username),
ADD INDEX IF NOT EXISTS idx_role (role);

-- Verify tables
SHOW TABLES;
DESCRIBE users;
DESCRIBE query_log;
