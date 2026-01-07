// middleware/enterpriseAuth.js - Enterprise tier access control

/**
 * Middleware to check if user has Enterprise subscription OR is an admin
 * Admins can access for debugging and support purposes
 * Used to gate Projects feature
 */
const requireEnterprise = (req, res, next) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user;

  // Allow if Enterprise tier OR admin
  if (user.subscription_tier !== 'enterprise' && user.role !== 'admin') {
    return res.status(403).json({
      error: 'Projects require an Enterprise subscription',
      currentTier: user.subscription_tier || 'free',
      upgradePath: '/pricing#enterprise',
      message: 'Upgrade to Enterprise to access Projects and advanced features'
    });
  }

  next();
};

/**
 * Optional: Middleware to check enterprise OR higher tier (for future tiers)
 */
const requireEnterpriseOrHigher = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user;
  const enterpriseTiers = ['enterprise'];  // Can expand for future premium tiers

  if (!enterpriseTiers.includes(user.subscription_tier)) {
    return res.status(403).json({
      error: 'This feature requires an Enterprise subscription',
      currentTier: user.subscription_tier || 'free'
    });
  }

  next();
};

module.exports = {
  requireEnterprise,
  requireEnterpriseOrHigher
};
