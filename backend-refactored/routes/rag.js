// routes/rag.js
const express = require('express');
const router = express.Router();
const RAGController = require('../controllers/ragController');
const { isAuthenticated } = require('../middleware/auth');

// POST /api/rag/ask - Ask a question
router.post('/ask', isAuthenticated, RAGController.ask);

// GET /api/rag/history - Get user's query history
router.get('/history', isAuthenticated, RAGController.getHistory);

module.exports = router;