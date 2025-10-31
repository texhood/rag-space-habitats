// controllers/ragController.js
const RAGService = require('../services/ragService');
const QueryLog = require('../models/QueryLog');

class RAGController {
  /**
   * Handle question asking
   */
  static async ask(req, res, next) {
    const startTime = Date.now();
    
    try {
      const { question } = req.body;

      // Validation
      if (!question || !question.trim()) {
        return res.status(400).json({ 
          error: 'Missing question',
          message: 'Please provide a question'
        });
      }

      console.log(`[${req.user.username}] Question: "${question}"`);

      // Get relevant chunks and generate answer
      const chunks = await RAGService.retrieveRelevantChunks(question);
      const answer = await RAGService.generateAnswer(question, chunks);

      // Log the query
      const responseTime = Date.now() - startTime;
      await QueryLog.create(req.user.id, question, responseTime, chunks.length);

      console.log(`[${req.user.username}] Response time: ${responseTime}ms`);

      res.json({ 
        answer,
        metadata: {
          chunksRetrieved: chunks.length,
          responseTimeMs: responseTime
        }
      });
    } catch (err) {
      console.error('RAG error:', err);
      next(err);
    }
  }

  /**
   * Get user's query history
   */
  static async getHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const queries = await QueryLog.getByUser(req.user.id, limit);

      res.json({ queries });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RAGController;
