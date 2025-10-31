// routes/rag.js
const express = require('express');
const router = express.Router();
const RAGController = require('../controllers/ragController');
const { requireAuth } = require('../middleware/auth');

// POST /api/rag/ask - Ask a question
router.post('/ask', requireAuth, RAGController.ask);

// GET /api/rag/history - Get user's query history
router.get('/history', requireAuth, RAGController.getHistory);

module.exports = router;
