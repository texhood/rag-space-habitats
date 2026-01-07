// routes/feedback.js - Feedback System Routes
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// POST /api/feedback - Submit new feedback
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { queryId, feedbackType, reaction, rating, documentRelevance, comment } = req.body;

    // Validate feedback type
    const validTypes = ['reaction', 'rating', 'relevance', 'general'];
    if (!feedbackType || !validTypes.includes(feedbackType)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    // Validate based on feedback type
    if (feedbackType === 'reaction') {
      if (!reaction || !['thumbs_up', 'thumbs_down'].includes(reaction)) {
        return res.status(400).json({ error: 'Invalid reaction value' });
      }
    } else if (feedbackType === 'rating') {
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
    } else if (feedbackType === 'relevance') {
      if (!documentRelevance || !['relevant', 'partial', 'not_relevant'].includes(documentRelevance)) {
        return res.status(400).json({ error: 'Invalid relevance value' });
      }
    } else if (feedbackType === 'general') {
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ error: 'Comment is required for general feedback' });
      }
      if (comment.length > 5000) {
        return res.status(400).json({ error: 'Comment must be less than 5000 characters' });
      }
    }

    // Create feedback record
    const feedbackData = {
      queryId,
      feedbackType,
      reaction,
      rating,
      documentRelevance,
      comment
    };

    const feedback = await Feedback.create(req.user.id, feedbackData);

    console.log(`[Feedback] User ${req.user.id} submitted ${feedbackType} feedback (ID: ${feedback.id})`);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedback.id,
      createdAt: feedback.created_at
    });

  } catch (err) {
    console.error('[Feedback] Submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/my-feedback - Get user's own feedback
router.get('/my-feedback', isAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const feedback = await Feedback.getByUser(req.user.id, limit);

    res.json({
      feedback,
      count: feedback.length
    });

  } catch (err) {
    console.error('[Feedback] Fetch user feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/:id - Get specific feedback (own or admin)
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const feedback = await Feedback.getById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Check if user owns this feedback or is admin
    if (feedback.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot access this feedback' });
    }

    res.json(feedback);

  } catch (err) {
    console.error('[Feedback] Fetch feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/feedback/:id - Update feedback (own or admin)
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const feedback = await Feedback.getById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Check if user owns this feedback or is admin
    if (feedback.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot update this feedback' });
    }

    // Validate update data
    const { comment, reaction, rating, documentRelevance } = req.body;

    if (feedback.feedback_type === 'general' && comment) {
      if (comment.length > 5000) {
        return res.status(400).json({ error: 'Comment must be less than 5000 characters' });
      }
    }

    const updateData = { comment, reaction, rating, documentRelevance };
    const updatedFeedback = await Feedback.update(req.params.id, updateData);

    console.log(`[Feedback] User ${req.user.id} updated feedback (ID: ${req.params.id})`);

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      feedback: updatedFeedback
    });

  } catch (err) {
    console.error('[Feedback] Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/feedback/:id - Delete feedback (own or admin)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const feedback = await Feedback.getById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Check if user owns this feedback or is admin
    if (feedback.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete this feedback' });
    }

    const success = await Feedback.delete(req.params.id);

    if (success) {
      console.log(`[Feedback] User ${req.user.id} deleted feedback (ID: ${req.params.id})`);
      res.json({ success: true, message: 'Feedback deleted successfully' });
    } else {
      res.status(404).json({ error: 'Feedback not found' });
    }

  } catch (err) {
    console.error('[Feedback] Deletion error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== ADMIN ENDPOINTS =====

// GET /api/feedback/admin/all - Get all feedback (admin only)
router.get('/admin/all', isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const feedbackType = req.query.type || null;

    const feedback = await Feedback.getRecent(limit, feedbackType);

    res.json({
      feedback,
      count: feedback.length,
      filters: { type: feedbackType }
    });

  } catch (err) {
    console.error('[Feedback] Admin fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/admin/query/:queryId - Get all feedback for a query (admin only)
router.get('/admin/query/:queryId', isAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.getByQuery(req.params.queryId);

    res.json({
      feedback,
      count: feedback.length,
      queryId: req.params.queryId
    });

  } catch (err) {
    console.error('[Feedback] Admin query feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/admin/analytics - Get feedback analytics (admin only)
router.get('/admin/analytics', isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const analytics = await Feedback.getAnalytics(days);
    const sentiment = await Feedback.getSentimentSummary(days);

    res.json({
      analytics,
      sentiment,
      period: { days }
    });

  } catch (err) {
    console.error('[Feedback] Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/admin/user/:userId - Get feedback from specific user (admin only)
router.get('/admin/user/:userId', isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const feedback = await Feedback.getByUser(req.params.userId, limit);

    res.json({
      feedback,
      count: feedback.length,
      userId: req.params.userId
    });

  } catch (err) {
    console.error('[Feedback] Admin user feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
