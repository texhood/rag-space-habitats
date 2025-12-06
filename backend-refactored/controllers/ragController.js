// controllers/ragController.js - With Conversation History Support
const RAGService = require('../services/ragService');
const QueryLog = require('../models/QueryLog');

class RAGController {
  /**
   * POST /api/rag/ask
   * Handle RAG question with optional conversation history
   */
  static async ask(req, res, next) {
    try {
      const { question, conversationHistory = [] } = req.body;
      
      if (!question || question.trim().length === 0) {
        return res.status(400).json({ error: 'Question is required' });
      }

      console.log(`[RAG] Question: "${question.substring(0, 50)}..."`);
      console.log(`[RAG] Conversation history: ${conversationHistory.length} messages`);

      const startTime = Date.now();

      // Set user's LLM preference if available
      if (req.user?.llm_preference) {
        RAGService.setUserPreference(req.user.llm_preference);
      }

      // Retrieve relevant chunks (using the current question only for retrieval)
      const chunks = await RAGService.retrieveRelevantChunks(question);

      // Generate answer with conversation history
      const answer = await RAGService.generateAnswer(question, chunks, conversationHistory);

      const responseTime = Date.now() - startTime;
      console.log(`[${req.user?.username || 'Anonymous'}] Response time: ${responseTime}ms`);

      // Log the query
      if (req.user) {
        try {
          await QueryLog.create(req.user.id, question, responseTime, chunks.length);
        } catch (logErr) {
          console.error('[RAG] Failed to log query:', logErr.message);
        }
      }

      res.json({
        answer,
        metadata: {
          chunks_used: chunks.length,
          response_time: responseTime,
          conversation_length: conversationHistory.length + 2  // +2 for current Q&A
        }
      });

    } catch (err) {
      console.error('[RAG] Error:', err);
      next(err);
    }
  }

  /**
   * GET /api/rag/history
   * Get user's query history
   */
  static async getHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const history = await QueryLog.getByUserId(req.user.id, limit, offset);

      res.json({
        history,
        pagination: {
          limit,
          offset,
          count: history.length
        }
      });

    } catch (err) {
      console.error('[RAG] History error:', err);
      next(err);
    }
  }
}

module.exports = RAGController;