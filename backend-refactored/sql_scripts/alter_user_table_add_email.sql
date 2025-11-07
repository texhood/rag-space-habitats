ALTER TABLE users 
ADD COLUMN email VARCHAR(255) UNIQUE,
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_token_expires DATETIME;

-- Add indexes
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE users ADD INDEX idx_reset_token (reset_token);