-- Active: 1762551206609@@127.0.0.1@3307@space_habitats_rag
-- Add subscription tier to users table
ALTER TABLE users 
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free',
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN stripe_customer_id VARCHAR(255),
ADD COLUMN stripe_subscription_id VARCHAR(255);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_stripe_customer (stripe_customer_id),
  INDEX idx_stripe_subscription (stripe_subscription_id)
);

-- Create usage logs table
CREATE TABLE usage_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_action (user_id, action),
  INDEX idx_timestamp (timestamp)
);

-- Create daily usage summary table for faster queries
CREATE TABLE daily_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  queries INT DEFAULT 0,
  uploads INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, date)
);