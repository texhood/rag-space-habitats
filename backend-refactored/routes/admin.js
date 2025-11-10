// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const QueryLog = require('../models/QueryLog');
const documentProcessor = require('../services/documentProcessor');
const SystemSettings = require('../models/SystemSettings');
const UsageService = require('../services/usageService');
const Pricing = require('../models/Pricing');

// Admin authentication middleware
function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// GET /api/admin/users - Get all users
router.get('/users', isAdmin, async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/role - Update user role
router.post('/users/:id/role', isAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await User.updateRole(req.params.id, role);
    res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', isAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await User.delete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics - Get analytics
router.get('/analytics', isAdmin, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const analytics = await QueryLog.getAnalytics(days);
    const recentQueries = await QueryLog.getRecent(10);

    res.json({
      analytics,
      recentQueries
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/preprocess - Trigger preprocessing
router.post('/preprocess', isAdmin, async (req, res, next) => {
  try {
    console.log(`[${req.user.username}] Triggered preprocessing`);

    // Run preprocessing in the background
    const { spawn } = require('child_process');
    const path = require('path');
    const scriptPath = path.join(__dirname, '../scripts/preprocess.js');

    // Spawn the process
    const child = spawn('node', [scriptPath], {
      detached: true,
      stdio: 'inherit'
    });

    // Don't wait for it to finish
    child.unref();

    res.json({
      success: true,
      message: 'Preprocessing started in background. Check server logs for progress.'
    });
  } catch (err) {
    console.error('Preprocessing trigger error:', err);
    next(err);
  }
});

// POST /api/admin/process/:id - Process single submission
router.post('/process/:id', isAdmin, async (req, res) => {
  try {
    const result = await documentProcessor.processSubmission(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Process submission error:', err);
    res.status(500).json({
      error: 'Processing failed',
      details: err.message
    });
  }
});

// POST /api/admin/process-all - Process all approved submissions
router.post('/process-all', isAdmin, async (req, res) => {
  try {
    const results = await documentProcessor.processAllApproved();
    res.json({
      success: true,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (err) {
    console.error('Process all error:', err);
    res.status(500).json({
      error: 'Batch processing failed',
      details: err.message
    });
  }
});

// GET /api/admin/processing-stats - Get processing statistics
router.get('/processing-stats', isAdmin, async (req, res) => {
  try {
    const stats = await documentProcessor.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

const pool = require('../config/database');

// GET /api/admin/embedding-status - Check embedding service status
// GET /api/admin/embedding-status
router.get('/embedding-status', isAdmin, async (req, res) => {
  try {
    const embeddingService = require('../services/embeddingService');
    const healthy = await embeddingService.checkHealth();

    // Count chunks with/without embeddings
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN has_embedding = TRUE THEN 1 ELSE 0 END) as embedded,
        SUM(CASE WHEN has_embedding = FALSE THEN 1 ELSE 0 END) as not_embedded
      FROM document_chunks
    `);

    res.json({
      server_healthy: healthy,
      chunks: stats[0]
    });
  } catch (err) {
    console.error('Embedding status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/embed-all - Generate embeddings for all chunks
// POST /api/admin/embed-all
router.post('/embed-all', isAdmin, async (req, res) => {
  try {
    const embeddingService = require('../services/embeddingService');

    const healthy = await embeddingService.checkHealth();
    if (!healthy) {
      return res.status(503).json({
        error: 'Embedding service not available',
        details: 'Make sure Python embedding server is running on port 5001'
      });
    }

    // Get chunks without embeddings
    const [chunks] = await pool.query(`
      SELECT id, content 
      FROM document_chunks 
      WHERE has_embedding = FALSE
      LIMIT 500
    `);

    if (chunks.length === 0) {
      return res.json({
        success: true,
        message: 'All chunks already have embeddings',
        embedded: 0
      });
    }

    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    const texts = chunks.map(c => c.content);
    const embeddings = await embeddingService.generateBatchEmbeddings(texts);

    let updated = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embeddingJson = JSON.stringify(embeddings[i]);
      await pool.query(
        'UPDATE document_chunks SET embedding_vector = ?, has_embedding = TRUE WHERE id = ?',
        [embeddingJson, chunks[i].id]
      );
      updated++;
    }

    res.json({
      success: true,
      message: `Generated embeddings for ${updated} chunks`,
      embedded: updated
    });

  } catch (err) {
    console.error('Embedding generation error:', err);
    res.status(500).json({
      error: 'Failed to generate embeddings',
      details: err.message
    });
  }
});

// GET /api/admin/beta-mode - Get beta mode status
router.get('/beta-mode', isAdmin, async (req, res) => {
  try {
    const betaConfig = await SystemSettings.getBetaMode();
    
    // Get pricing from database instead of UsageService
    const allTiers = await Pricing.getAllTiers();
    const tierLimits = {};
    
    for (const tier of allTiers) {
      tierLimits[tier.tier_key] = {
        ...tier.features,
        price: parseFloat(tier.price || 0)
      };
    }
    
    // Count beta users
    const [betaUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_beta_user = TRUE'
    );
    
    res.json({
      ...betaConfig,
      beta_users_count: betaUsers[0].count,
      tier_limits: tierLimits
    });
  } catch (err) {
    console.error('Beta mode fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/beta-mode - Toggle beta mode
router.post('/beta-mode', isAdmin, async (req, res) => {
  try {
    const { enabled, price, stripe_price_id, benefits } = req.body;
    
    // Use exact price provided, or 0 as default
    const betaPrice = price !== undefined && price !== null ? parseFloat(price) : 0;
    
    const config = {
      enabled: enabled === true || enabled === 'true',
      price: betaPrice,
      stripe_price_id: stripe_price_id || null,
      benefits: benefits || 'All Pro features at beta pricing'
    };
    
    await SystemSettings.setBetaMode(config, req.user.id);
    
    // Also update the beta tier pricing in database
    await Pricing.updatePrice('beta', betaPrice, stripe_price_id);
    
    const priceText = config.price === 0 ? 'FREE' : `$${config.price}`;
    console.log(`[${req.user.username}] ${config.enabled ? 'Enabled' : 'Disabled'} beta mode at ${priceText}/month`);
    
    res.json({
      success: true,
      message: `Beta mode ${config.enabled ? 'enabled' : 'disabled'}`,
      config
    });
  } catch (err) {
    console.error('Beta mode update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/beta-users - Get list of beta users
router.get('/beta-users', isAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.subscription_tier,
        u.is_beta_user,
        u.beta_enrolled_at,
        s.status as subscription_status,
        s.current_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.is_beta_user = TRUE
      ORDER BY u.beta_enrolled_at DESC
    `);
    
    res.json({ beta_users: users });
  } catch (err) {
    console.error('Beta users fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/grant-beta/:userId - Manually grant beta access
router.post('/grant-beta/:userId', isAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users 
       SET is_beta_user = TRUE, 
           beta_enrolled_at = NOW(),
           subscription_tier = 'beta',
           subscription_status = 'active'
       WHERE id = ?`,
      [req.params.userId]
    );
    
    console.log(`[${req.user.username}] Granted beta access to user ${req.params.userId}`);
    
    res.json({ 
      success: true,
      message: 'Beta access granted'
    });
  } catch (err) {
    console.error('Grant beta error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/beta-mode - Get beta mode status
router.get('/beta-mode', isAdmin, async (req, res) => {
  try {
    const betaConfig = await SystemSettings.getBetaMode();
    
    // Get pricing from UsageService.LIMITS
    const allLimits = {
      free: UsageService.LIMITS.free,
      basic: UsageService.LIMITS.basic,
      pro: UsageService.LIMITS.pro,
      enterprise: UsageService.LIMITS.enterprise,
      beta: UsageService.LIMITS.beta
    };
    
    // Count beta users
    const [betaUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_beta_user = TRUE'
    );
    
    res.json({
      ...betaConfig,
      beta_users_count: betaUsers[0].count,
      tier_limits: allLimits  // Include all tier pricing
    });
  } catch (err) {
    console.error('Beta mode fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/pricing - Get all tier pricing
router.get('/pricing', isAdmin, async (req, res) => {
  try {
    const tiers = await Pricing.getAllTiers();
    res.json({ tiers });
  } catch (err) {
    console.error('Pricing fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/pricing/:tierKey - Get specific tier pricing
router.get('/pricing/:tierKey', isAdmin, async (req, res) => {
  try {
    const tier = await Pricing.getByTierKey(req.params.tierKey);
    if (!tier) {
      return res.status(404).json({ error: 'Tier not found' });
    }
    res.json({ tier });
  } catch (err) {
    console.error('Pricing fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/pricing/:tierKey - Update tier pricing
router.put('/pricing/:tierKey', isAdmin, async (req, res) => {
  try {
    const { price, stripe_price_id, features } = req.body;
    
    // Update price if provided
    if (price !== undefined) {
      await Pricing.updatePrice(req.params.tierKey, price, stripe_price_id);
    }
    
    // Update features if provided
    if (features) {
      for (const [key, value] of Object.entries(features)) {
        await Pricing.updateFeature(req.params.tierKey, key, value);
      }
    }
    
    console.log(`[${req.user.username}] Updated pricing for ${req.params.tierKey}`);
    
    // Return updated tier
    const updatedTier = await Pricing.getByTierKey(req.params.tierKey);
    
    res.json({
      success: true,
      message: 'Pricing updated',
      tier: updatedTier
    });
  } catch (err) {
    console.error('Pricing update error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;