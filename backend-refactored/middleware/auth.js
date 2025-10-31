// middleware/auth.js

/**
 * Require user to be authenticated
 */
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
};

/**
 * Require user to be admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  
  next();
};

/**
 * Optional auth - sets user if authenticated but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  // User will be available in req.user if authenticated
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
