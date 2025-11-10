-- Subscription tiers (what tiers exist)
CREATE TABLE subscription_tiers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tier_key VARCHAR(50) UNIQUE NOT NULL,  -- 'free', 'basic', 'pro', 'enterprise', 'beta'
  name VARCHAR(100) NOT NULL,             -- 'Professional Plan'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pricing (allows multiple prices per tier)
CREATE TABLE tier_pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tier_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_period VARCHAR(20) NOT NULL,
  stripe_price_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATETIME,
  valid_until DATETIME,
  promo_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id),
  INDEX idx_tier_active (tier_id, is_active),
  INDEX idx_valid_dates (valid_from, valid_until)
);

-- Tier features/limits
CREATE TABLE tier_features (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tier_id INT NOT NULL,
  feature_key VARCHAR(100) NOT NULL,      -- 'queries_per_day', 'uploads_per_month'
  feature_value TEXT NOT NULL,            -- JSON or simple value
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id),
  UNIQUE KEY unique_tier_feature (tier_id, feature_key)
);

-- Seed data for tiers
INSERT INTO subscription_tiers (tier_key, name, description, sort_order) VALUES
('free', 'Free', 'Free tier with basic access', 1),
('basic', 'Basic', 'Basic subscription plan', 2),
('pro', 'Professional', 'Professional subscription plan', 3),
('enterprise', 'Enterprise', 'Enterprise subscription plan', 4),
('beta', 'Beta Access', 'Beta testing with Pro features', 5);

-- Seed pricing for each tier (monthly)
INSERT INTO tier_pricing (tier_id, price, billing_period, is_active) VALUES
((SELECT id FROM subscription_tiers WHERE tier_key = 'free'), 0.00, 'month', TRUE),
((SELECT id FROM subscription_tiers WHERE tier_key = 'basic'), 9.00, 'month', TRUE),
((SELECT id FROM subscription_tiers WHERE tier_key = 'pro'), 29.00, 'month', TRUE),
((SELECT id FROM subscription_tiers WHERE tier_key = 'enterprise'), 99.00, 'month', TRUE),
((SELECT id FROM subscription_tiers WHERE tier_key = 'beta'), 0.00, 'month', TRUE);

-- Seed features for each tier
INSERT INTO tier_features (tier_id, feature_key, feature_value) VALUES
-- Free tier
((SELECT id FROM subscription_tiers WHERE tier_key = 'free'), 'queries_per_day', '10'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'free'), 'uploads_per_month', '0'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'free'), 'max_file_size_mb', '0'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'free'), 'llm_access', '["grok"]'),
-- Basic tier
((SELECT id FROM subscription_tiers WHERE tier_key = 'basic'), 'queries_per_day', '100'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'basic'), 'uploads_per_month', '5'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'basic'), 'max_file_size_mb', '50'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'basic'), 'llm_access', '["grok"]'),
-- Pro tier
((SELECT id FROM subscription_tiers WHERE tier_key = 'pro'), 'queries_per_day', '-1'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'pro'), 'uploads_per_month', '50'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'pro'), 'max_file_size_mb', '100'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'pro'), 'llm_access', '["grok","claude"]'),
-- Enterprise tier
((SELECT id FROM subscription_tiers WHERE tier_key = 'enterprise'), 'queries_per_day', '-1'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'enterprise'), 'uploads_per_month', '-1'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'enterprise'), 'max_file_size_mb', '100'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'enterprise'), 'llm_access', '["grok","claude"]'),
-- Beta tier
((SELECT id FROM subscription_tiers WHERE tier_key = 'beta'), 'queries_per_day', '-1'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'beta'), 'uploads_per_month', '50'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'beta'), 'max_file_size_mb', '100'),
((SELECT id FROM subscription_tiers WHERE tier_key = 'beta'), 'llm_access', '["grok","claude"]');
