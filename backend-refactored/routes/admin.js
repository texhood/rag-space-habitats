// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const QueryLog = require('../models/QueryLog');
const documentProcessor = require('../services/documentProcessor');

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

module.exports = router;