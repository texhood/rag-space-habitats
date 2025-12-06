// controllers/authController.js
const User = require('../models/User');
const passport = require('passport');

class AuthController {
  /**
   * Register new user
   */
  static async register(req, res, next) {
    try {
      const { username, password, email } = req.body;

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

      // Validate email format if provided
      if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid email address'
        });
      }

      // Check if user exists
      if (await User.exists(username)) {
        return res.status(409).json({ 
          error: 'User exists',
          message: 'This username is already registered. Please login instead.',
          shouldRedirectToLogin: true
        });
      }

      // Check if email already exists
      if (email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          return res.status(409).json({
            error: 'Email exists',
            message: 'This email is already registered. Please login instead.',
            shouldRedirectToLogin: true
          });
        }
      }

      // Create user WITH email in one step
      const userId = await User.create(username, password, 'user', email);
      
      res.status(201).json({ 
        success: true,
        message: 'Registration successful! Please login.',
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
          message: info?.message || 'Invalid username or password'
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
  static async getCurrentUser(req, res) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please log in'
      });
    }

    try {
      // Fetch fresh user data from database (PostgreSQL)
      const pool = require('../config/database');
      const result = await pool.query(
        'SELECT id, username, email, role, subscription_tier, subscription_status FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const freshUser = result.rows[0];
      
      console.log(`[Auth] Returning user data for ${freshUser.username}:`, {
        tier: freshUser.subscription_tier,
        status: freshUser.subscription_status
      });

      res.json({ 
        user: {
          id: freshUser.id,
          username: freshUser.username,
          email: freshUser.email,
          role: freshUser.role,
          subscription_tier: freshUser.subscription_tier,
          subscription_status: freshUser.subscription_status
        }
      });
    } catch (err) {
      console.error('[Auth] Get current user error:', err);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Missing email',
          message: 'Email address is required'
        });
      }

      // Check if user exists
      const User = require('../models/User');
      const user = await User.findByEmail(email);
      
      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (user) {
        const token = await User.createResetToken(email);
        const emailService = require('../services/emailService');
        await emailService.sendPasswordReset(email, user.username, token);
      }

      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (err) {
      console.error('Password reset request error:', err);
      next(err);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: 'Missing fields',
          message: 'Token and new password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 6 characters'
        });
      }

      const User = require('../models/User');
      await User.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
    } catch (err) {
      if (err.message === 'Invalid or expired reset token') {
        return res.status(400).json({
          error: 'Invalid token',
          message: 'This password reset link is invalid or has expired. Please request a new one.'
        });
      }
      console.error('Password reset error:', err);
      next(err);
    }
  }

  /**
   * Verify reset token
   */
  static async verifyResetToken(req, res, next) {
    try {
      const { token } = req.params;
      
      const User = require('../models/User');
      const user = await User.verifyResetToken(token);
      
      if (!user) {
        return res.status(400).json({
          valid: false,
          message: 'This password reset link is invalid or has expired.'
        });
      }

      res.json({
        valid: true,
        username: user.username
      });
    } catch (err) {
      console.error('Token verification error:', err);
      next(err);
    }
  }
}

module.exports = AuthController;
