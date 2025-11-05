USE manual_db;
ALTER TABLE users
ADD COLUMN llm_preference ENUM('grok', 'claude', 'both') DEFAULT 'grok' AFTER role;
