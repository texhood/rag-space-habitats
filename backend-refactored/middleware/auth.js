// middleware/auth.js

const isAuthenticated = (req, res, next) => {
  console.log('[Auth Check] Passport authenticated:', req.isAuthenticated());
  console.log('[Auth Check] User:', req.user?.username);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  console.log('[Auth Check] FAILED - Not authenticated');
  res.status(401).json({ error: 'Not authenticated' });
};

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

module.exports = { isAuthenticated, isAdmin };