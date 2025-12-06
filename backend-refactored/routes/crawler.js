// routes/crawler.js
// Admin API endpoints for crawler management

const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const crawlerService = require('../services/crawlerService');
const CrawlerSettings = require('../services/crawlerSettings');
const { getCollection } = require('../config/mongodb');

/**
 * GET /api/crawler/status
 * Get current crawler status
 */
router.get('/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const status = await crawlerService.getStatus();
    res.json(status);
  } catch (err) {
    console.error('[Crawler API] Status error:', err);
    res.status(500).json({ error: 'Failed to get crawler status' });
  }
});

/**
 * POST /api/crawler/toggle
 * Toggle crawler enabled/disabled
 */
router.post('/toggle', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const config = await CrawlerSettings.toggle(userId);
    
    console.log(`[Crawler] Toggled to: ${config.enabled ? 'ENABLED' : 'DISABLED'} by user ${userId}`);
    
    res.json({
      enabled: config.enabled,
      message: config.enabled 
        ? 'Crawler enabled - will run at 23:00 CT'
        : 'Crawler disabled'
    });
  } catch (err) {
    console.error('[Crawler API] Toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle crawler' });
  }
});

/**
 * POST /api/crawler/run
 * Manually trigger a crawler run (for testing)
 */
router.post('/run', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Check if already running
    if (crawlerService.isRunning) {
      return res.status(409).json({ 
        error: 'Crawler is already running'
      });
    }

    // Start the crawler in background
    res.json({ 
      message: 'Crawler started',
      note: 'Check logs for progress'
    });

    // Run asynchronously
    crawlerService.runManual().then(result => {
      console.log('[Crawler API] Manual run completed:', result);
    }).catch(err => {
      console.error('[Crawler API] Manual run failed:', err);
    });

  } catch (err) {
    console.error('[Crawler API] Run error:', err);
    res.status(500).json({ error: 'Failed to start crawler' });
  }
});

/**
 * POST /api/crawler/stop
 * Request the crawler to stop gracefully
 */
router.post('/stop', isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (!crawlerService.isRunning) {
      return res.status(400).json({ 
        error: 'Crawler is not running'
      });
    }

    const stopped = crawlerService.requestStop();
    
    if (stopped) {
      console.log('[Crawler API] Stop requested by admin');
      res.json({ 
        message: 'Stop requested - crawler will halt after current document',
        note: 'The crawler will finish processing the current document before stopping'
      });
    } else {
      res.status(400).json({ error: 'Could not request stop' });
    }

  } catch (err) {
    console.error('[Crawler API] Stop error:', err);
    res.status(500).json({ error: 'Failed to stop crawler' });
  }
});

/**
 * GET /api/crawler/settings
 * Get full crawler settings
 */
router.get('/settings', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const config = await CrawlerSettings.getConfig();
    const termsConfig = await CrawlerSettings.getSearchTermsConfig();
    
    res.json({
      crawler: config,
      searchTerms: {
        seedCount: (termsConfig.seed || []).length,
        learnedCount: (termsConfig.learned || []).length,
        seed: termsConfig.seed || [],
        learned: termsConfig.learned || [],
        lastCorpusExtraction: termsConfig.lastCorpusExtraction
      }
    });
  } catch (err) {
    console.error('[Crawler API] Settings error:', err);
    res.status(500).json({ error: 'Failed to get crawler settings' });
  }
});

/**
 * PATCH /api/crawler/settings
 * Update crawler settings
 */
router.patch('/settings', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { dailyLimit, sources } = req.body;
    const userId = req.user?.id || null;
    
    const updates = {};
    
    if (dailyLimit !== undefined) {
      const limit = parseInt(dailyLimit);
      if (limit < 1 || limit > 500) {
        return res.status(400).json({ error: 'Daily limit must be between 1 and 500' });
      }
      updates.dailyLimit = limit;
    }
    
    if (sources !== undefined) {
      updates.sources = sources;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    const config = await CrawlerSettings.updateConfig(updates, userId);
    
    res.json({
      message: 'Settings updated',
      crawler: config
    });
  } catch (err) {
    console.error('[Crawler API] Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/crawler/search-terms
 * Add custom search terms
 */
router.post('/search-terms', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { terms } = req.body;
    const userId = req.user?.id || null;
    
    if (!Array.isArray(terms) || terms.length === 0) {
      return res.status(400).json({ error: 'terms must be a non-empty array' });
    }
    
    const result = await CrawlerSettings.addSeedTerms(terms, userId);
    
    if (result.added.length === 0) {
      return res.status(400).json({ error: 'All terms already exist' });
    }
    
    res.json({
      message: `Added ${result.added.length} new search terms`,
      added: result.added
    });
  } catch (err) {
    console.error('[Crawler API] Add terms error:', err);
    res.status(500).json({ error: 'Failed to add search terms' });
  }
});

/**
 * DELETE /api/crawler/search-terms/:term
 * Remove a search term
 */
router.delete('/search-terms/:term', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const term = decodeURIComponent(req.params.term);
    const userId = req.user?.id || null;
    
    await CrawlerSettings.removeSearchTerm(term, userId);
    
    res.json({ message: `Removed term: ${term}` });
  } catch (err) {
    console.error('[Crawler API] Remove term error:', err);
    res.status(500).json({ error: 'Failed to remove search term' });
  }
});

/**
 * GET /api/crawler/history
 * Get recent crawled documents
 */
router.get('/history', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    
    const submissions = getCollection('document_submissions');
    const docs = await submissions
      .find({ 
        status: { $in: ['crawled', 'processed'] }, 
        source: { $exists: true } 
      })
      .sort({ created_at: -1 })
      .limit(limit)
      .project({
        title: 1,
        source: 1,
        status: 1,
        attribution: 1,
        category: 1,
        created_at: 1,
        chunk_count: 1,
        url: 1
      })
      .toArray();
    
    res.json({
      count: docs.length,
      documents: docs
    });
  } catch (err) {
    console.error('[Crawler API] History error:', err);
    res.status(500).json({ error: 'Failed to get crawler history' });
  }
});

/**
 * GET /api/crawler/stats
 * Get crawler statistics
 */
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const submissions = getCollection('document_submissions');
    
    // Count by source
    const bySource = await submissions.aggregate([
      { $match: { source: { $exists: true } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]).toArray();
    
    // Count by status
    const byStatus = await submissions.aggregate([
      { $match: { source: { $exists: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    // Count by category
    const byCategory = await submissions.aggregate([
      { $match: { source: { $exists: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray();
    
    // Total chunks from crawled documents
    const chunkStats = await submissions.aggregate([
      { $match: { source: { $exists: true }, chunk_count: { $exists: true } } },
      { $group: { 
        _id: null, 
        totalChunks: { $sum: '$chunk_count' },
        avgChunks: { $avg: '$chunk_count' }
      }}
    ]).toArray();
    
    res.json({
      bySource: Object.fromEntries(bySource.map(s => [s._id, s.count])),
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      byCategory: Object.fromEntries(byCategory.map(s => [s._id || 'uncategorized', s.count])),
      chunks: chunkStats[0] || { totalChunks: 0, avgChunks: 0 }
    });
  } catch (err) {
    console.error('[Crawler API] Stats error:', err);
    res.status(500).json({ error: 'Failed to get crawler stats' });
  }
});

module.exports = router;