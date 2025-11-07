// routes/submissions.js
const express = require('express');
const router = express.Router();
const { getCollection } = require('../config/mongodb');
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const textExtractor = require('../services/textExtractor');
const fs = require('fs').promises;

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
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let content = '';
    let title = req.body.title;
    let fileInfo = null;

    // Handle file upload
    if (req.file) {
      console.log('File uploaded:', req.file.originalname);
      
      try {
        // Extract text from file
        const extracted = await textExtractor.extractText(req.file.path);
        content = extracted.text;
        
        // Get file info
        fileInfo = await textExtractor.getFileInfo(req.file.path);
        
        // Use filename as title if no title provided
        if (!title) {
          title = req.file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
        }
        
        console.log(`Extracted ${content.length} characters from ${req.file.originalname}`);
        
        // Delete the uploaded file after extraction (optional - keep for records)
        // await fs.unlink(req.file.path);
        
      } catch (extractErr) {
        console.error('Text extraction failed:', extractErr);
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
    
    res.json({ 
      success: true, 
      message: 'Submission created successfully',
      submission_id: result.insertedId,
      extracted_length: content.length,
      ...(fileInfo && { file_info: fileInfo })
    });
  } catch (err) {
    console.error('Error creating submission:', err);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete uploaded file:', unlinkErr);
      }
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle multer-specific errors
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
    // Handle other errors
    return res.status(400).json({
      error: 'Upload failed',
      details: err.message
    });
  }
  next();
});

module.exports = router;