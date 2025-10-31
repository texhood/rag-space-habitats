// controllers/authController.js
const User = require('../models/User');
const passport = require('passport');

class AuthController {
  /**
   * Register new user
   */
  static async register(req, res, next) {
    try {
      const { username, password } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Missing fields',
          message: 'Username and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 6 characters'
        });
      }

      // Check if user exists
      if (await User.exists(username)) {
        return res.status(400).json({ 
          error: 'Username taken',
          message: 'This username is already registered'
        });
      }

      // Create user
      const userId = await User.create(username, password);
      
      res.status(201).json({ 
        success: true,
        message: 'Registration successful',
        userId
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Login user
   */
  static login(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ 
          error: 'Authentication failed',
          message: info?.message || 'Invalid credentials'
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        res.json({ 
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      });
    })(req, res, next);
  }

  /**
   * Logout user
   */
  static logout(req, res) {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          error: 'Logout failed',
          message: err.message
        });
      }

      res.json({ 
        success: true,
        message: 'Logout successful'
      });
    });
  }

  /**
   * Get current user
   */
  static getCurrentUser(req, res) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please log in'
      });
    }

    res.json({ 
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      }
    });
  }
}

module.exports = AuthController;
