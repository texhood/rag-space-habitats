const express = require('express');
const router = express.Router();
const RAGController = require('../controllers/ragController');
const { isAuthenticated } = require('../middleware/auth');
const { demoRateLimitMiddleware } = require('../services/demoRateLimit');

router.get('/stats', RAGController.stats);
router.get('/documents/:sourceId', RAGController.getDocument);
router.post('/demo', demoRateLimitMiddleware, RAGController.demo);

router.post('/ask', isAuthenticated, RAGController.ask);
router.get('/history', isAuthenticated, RAGController.getHistory);
router.get('/conversation', isAuthenticated, RAGController.getConversation);
router.post('/conversation', isAuthenticated, RAGController.startConversation);

module.exports = router;
