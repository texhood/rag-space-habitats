-- Add beta mode settings table
CREATE TABLE system_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSON NOT NULL,
  description TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insert default beta mode setting (disabled)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'beta_mode',
  JSON_OBJECT(
    'enabled', false,
    'price', 1.00,
    'stripe_price_id', NULL,
    'benefits', 'All Pro features at beta pricing'
  ),
  'Beta mode configuration - when enabled, all new subscriptions are $1/month with Pro features'
);

-- Add beta_user flag to users table
ALTER TABLE users
ADD COLUMN is_beta_user BOOLEAN DEFAULT FALSE,
ADD COLUMN beta_enrolled_at DATETIME NULL;

-- Add beta_tier column to subscriptions
ALTER TABLE subscriptions
ADD COLUMN is_beta BOOLEAN DEFAULT FALSE;