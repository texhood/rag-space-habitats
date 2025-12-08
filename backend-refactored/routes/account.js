// routes/account.js - User Account Management Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const Pricing = require('../models/Pricing');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// GET /api/account/profile - Get user profile and subscription info
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    // Get user profile
    const userResult = await pool.query(
      `SELECT id, username, email, email_verified, created_at, subscription_tier, subscription_status
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get subscription details (using tier_key, not tier)
    const subResult = await pool.query(
      `SELECT s.*, tp.price
       FROM subscriptions s
       LEFT JOIN subscription_tiers st ON s.tier_key = st.tier_key
       LEFT JOIN tier_pricing tp ON st.id = tp.tier_id AND tp.is_active = true
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    let subscription = subResult.rows[0] || null;

    // Get tier features
    if (subscription || user.subscription_tier) {
      const tierKey = subscription?.tier_key || user.subscription_tier || 'free';
      const tierInfo = await Pricing.getByTierKey(tierKey);
      
      if (subscription) {
        subscription.tier = subscription.tier_key; // Normalize for frontend
        subscription.features = tierInfo?.features || {};
        subscription.price = tierInfo?.price || subscription.price || 0;
      } else {
        subscription = {
          tier: tierKey,
          tier_key: tierKey,
          status: 'active',
          features: tierInfo?.features || {},
          price: tierInfo?.price || 0
        };
      }
    }

    res.json({
      profile: {
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at
      },
      subscription
    });

  } catch (err) {
    console.error('[Account] Profile fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/account/email - Update email address
router.put('/email', isAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already in use
    const existingResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Update email
    await pool.query(
      'UPDATE users SET email = $1, email_verified = false WHERE id = $2',
      [email, req.user.id]
    );

    console.log(`[Account] User ${req.user.id} updated email to ${email}`);

    res.json({ success: true, message: 'Email updated successfully' });

  } catch (err) {
    console.error('[Account] Email update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/account/password - Change password
router.put('/password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [newHash, req.user.id]
    );

    console.log(`[Account] User ${req.user.id} changed password`);

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (err) {
    console.error('[Account] Password change error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/account - Delete user account
router.delete('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // If user has an active Stripe subscription, cancel it
    const subResult = await pool.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (subResult.rows.length > 0 && subResult.rows[0].stripe_subscription_id) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(subResult.rows[0].stripe_subscription_id);
        console.log(`[Account] Cancelled Stripe subscription for user ${userId}`);
      } catch (stripeErr) {
        console.error('[Account] Failed to cancel Stripe subscription:', stripeErr);
        // Continue with deletion anyway
      }
    }

    // Delete user (cascade should handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Logout
    req.logout((err) => {
      if (err) console.error('[Account] Logout error:', err);
    });

    console.log(`[Account] User ${userId} deleted their account`);

    res.json({ success: true, message: 'Account deleted successfully' });

  } catch (err) {
    console.error('[Account] Account deletion error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;