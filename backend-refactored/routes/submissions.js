// routes/submissions.js
const express = require('express');
const router = express.Router();
const { getCollection } = require('../config/mongodb');
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const multer = require('multer');
const textExtractor = require('../services/textExtractor');
const fs = require('fs').promises;

// ======================
// MIDDLEWARE
// ======================

// Authentication check
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Permission check for submissions
const canSubmit = (req, res, next) => {
  // Beta mode: all authenticated users can submit
  if (process.env.BETA_MODE === 'true') {
    console.log('[Submissions] Beta mode: allowing submission from', req.user.username);
    return next();
  }
  
  // Production mode: require paid subscription or admin role
  const paidTiers = ['basic', 'professional', 'enterprise'];
  
  if (req.user.role === 'admin') {
    return next();
  }
  
  if (paidTiers.includes(req.user.subscription_tier)) {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Document submission requires a paid subscription',
    upgrade_required: true,
    current_tier: req.user.subscription_tier || 'free'
  });
};

// ======================
// ROUTES
// ======================

// GET /api/submissions - List all submissions
router.get('/', async (req, res) => {
  try {
    const submissions = getCollection('document_submissions');
    const status = req.query.status;
    
    const filter = status ? { status } : {};
    const docs = await submissions
      .find(filter)
      .sort({ submitted_at: -1 })
      .toArray();
    
    res.json({ 
      success: true, 
      count: docs.length, 
      submissions: docs 
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions/browse - Browse processed submissions (public)
router.get('/browse', async (req, res) => {
  try {
    const submissions = getCollection('document_submissions');
    
    // Parse query parameters
    const {
      q,           // Search term (searches title, description, tags)
      category,    // Filter by category
      author,      // Filter by author username
      license,     // Filter by license type
      dateFrom,    // Filter by date range start
      dateTo,      // Filter by date range end
      page = 1,    // Pagination
      limit = 20,  // Results per page
      sort = 'newest' // Sort order: newest, oldest, title
    } = req.query;

    // Build filter - only show processed (public) submissions
    // Private submissions are excluded unless user is the author
    const filter = {
      status: 'processed',
      license: { $ne: 'private' }  // Exclude private submissions
    };

    // Text search across title, description, tags
    if (q && q.trim()) {
      const searchTerm = q.trim();
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $elemMatch: { $regex: searchTerm, $options: 'i' } } },
        { attribution: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Author filter
    if (author && author.trim()) {
      filter.$or = [
        { submitted_by_username: { $regex: author.trim(), $options: 'i' } },
        { attribution: { $regex: author.trim(), $options: 'i' } }
      ];
    }

    // License filter
    if (license && license !== 'all') {
      filter.license = license;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.created_at = {};
      if (dateFrom) {
        filter.created_at.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        filter.created_at.$lte = endDate;
      }
    }

    // Determine sort order
    let sortOption = { created_at: -1 }; // Default: newest first
    if (sort === 'oldest') {
      sortOption = { created_at: 1 };
    } else if (sort === 'title') {
      sortOption = { title: 1 };
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await submissions.countDocuments(filter);

    // Fetch submissions (exclude full content for list view)
    const docs = await submissions
      .find(filter)
      .project({
        title: 1,
        description: 1,
        category: 1,
        tags: 1,
        license: 1,
        attribution: 1,
        submitted_by_username: 1,
        created_at: 1,
        submitted_at: 1,
        // Exclude full content - provide preview only
        content: { $substr: ['$content', 0, 300] }
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Add content preview flag
    const submissions_with_preview = docs.map(doc => ({
      ...doc,
      content_preview: doc.content ? doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : '') : '',
      content: undefined  // Remove content field, use content_preview instead
    }));

    res.json({
      success: true,
      count: docs.length,
      total: totalCount,
      page: pageNum,
      pages: Math.ceil(totalCount / limitNum),
      limit: limitNum,
      submissions: submissions_with_preview
    });

  } catch (err) {
    console.error('[Submissions] Browse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions/categories - Get list of categories with counts
router.get('/categories', async (req, res) => {
  try {
    const submissions = getCollection('document_submissions');
    
    const categories = await submissions.aggregate([
      { $match: { status: 'processed', license: { $ne: 'private' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({
      success: true,
      categories: categories.map(c => ({
        name: c._id || 'general',
        count: c.count
      }))
    });
  } catch (err) {
    console.error('[Submissions] Categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions/:id - Get single submission
router.get('/:id', async (req, res) => {
  try {
    const submissions = getCollection('document_submissions');
    const doc = await submissions.findOne({ _id: new ObjectId(req.params.id) });
    
    if (!doc) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({ success: true, submission: doc });
  } catch (err) {
    console.error('Error fetching submission:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/submissions - Create new submission (text or file)
// Requires: authentication + (beta mode OR paid subscription OR admin)
router.post('/', requireAuth, canSubmit, upload.single('file'), async (req, res) => {
  try {
    let content = '';
    let title = req.body.title;
    let fileInfo = null;

    // Handle file upload
    if (req.file) {
      console.log('[Submissions] File uploaded:', req.file.originalname);
      
      try {
        // Extract text from file
        const extracted = await textExtractor.extractText(req.file.path);
        content = extracted.text;
        
        // Get file info
        fileInfo = await textExtractor.getFileInfo(req.file.path);
        
        // Use filename as title if no title provided
        if (!title) {
          title = req.file.originalname.replace(/\.[^/.]+$/, '');
        }
        
        console.log(`[Submissions] Extracted ${content.length} characters from ${req.file.originalname}`);
        
      } catch (extractErr) {
        console.error('[Submissions] Text extraction failed:', extractErr);
        // Clean up file
        await fs.unlink(req.file.path);
        return res.status(400).json({ 
          error: 'Failed to extract text from file',
          details: extractErr.message 
        });
      }
    } else {
      // Handle text submission
      content = req.body.content;
    }

    // Validate
    if (!title || !content) {
      return res.status(400).json({ 
        error: 'Title and content are required' 
      });
    }

    const submissions = getCollection('document_submissions');
    
    // Parse tags
    let tags = req.body.tags || [];
    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    // Validate license
    const validLicenses = ['cc-by', 'cc-by-sa', 'cc-by-nc', 'private'];
    const license = validLicenses.includes(req.body.license) ? req.body.license : 'cc-by';
    
    // Attribution defaults to username if not provided
    const attribution = req.body.attribution?.trim() || req.user.username || 'Anonymous';

    const newSubmission = {
      title,
      description: req.body.description || '',
      content,
      submitted_by: req.user.id,
      submitted_by_username: req.user.username,
      submitted_at: new Date(),
      status: 'pending',
      tags: Array.isArray(tags) ? tags : [],
      category: req.body.category || 'general',
      license,
      attribution,
      upvotes: 0,
      downvotes: 0,
      comments: [],
      created_at: new Date(),
      updated_at: new Date(),
      
      // File metadata if uploaded
      ...(fileInfo && {
        file_info: {
          original_name: req.file.originalname,
          size: fileInfo.size,
          size_readable: fileInfo.sizeReadable,
          type: fileInfo.extension,
          uploaded_at: new Date()
        }
      })
    };

    const result = await submissions.insertOne(newSubmission);
    
    console.log(`[Submissions] Created submission ${result.insertedId} by ${req.user.username}`);
    
    res.json({ 
      success: true, 
      message: 'Submission created successfully! It will be reviewed by an administrator.',
      submission_id: result.insertedId,
      extracted_length: content.length,
      ...(fileInfo && { file_info: fileInfo })
    });
  } catch (err) {
    console.error('[Submissions] Error creating submission:', err);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('[Submissions] Failed to delete uploaded file:', unlinkErr);
      }
    }
    
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/submissions/:id/status - Update submission status (admin only)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, review_notes } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'processed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        valid: validStatuses 
      });
    }

    const submissions = getCollection('document_submissions');
    
    const updateData = {
      status,
      updated_at: new Date()
    };

    // Add review metadata if approving or rejecting
    if (status === 'approved' || status === 'rejected') {
      updateData.reviewed_by = req.user.id;
      updateData.reviewed_by_username = req.user.username;
      updateData.reviewed_at = new Date();
      if (review_notes) {
        updateData.review_notes = review_notes;
      }
    }

    const result = await submissions.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`[Submissions] Status updated to '${status}' for ${req.params.id} by ${req.user.username}`);

    res.json({ 
      success: true,
      message: `Submission ${status}`,
      submission_id: req.params.id,
      status
    });
  } catch (err) {
    console.error('[Submissions] Status update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// ERROR HANDLING
// ======================

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'Maximum file size is 100MB. Please upload a smaller file.'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      details: err.message
    });
  } else if (err) {
    return res.status(400).json({
      error: 'Upload failed',
      details: err.message
    });
  }
  next();
});

module.exports = router;