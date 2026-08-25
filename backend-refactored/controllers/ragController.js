const RAGService = require('../services/ragService');
const QueryLog = require('../models/QueryLog');
const UserConversation = require('../models/UserConversation');
const { formatSourcesForClient, normalizeRetrievedChunk } = require('../services/citationFormat');
const { getCorpusStats } = require('../services/corpusStats');
const { recordDemoHit } = require('../services/demoRateLimit');
const { CORPUS_EXCLUDES_PRIVATE_SQL } = require('../services/submissionAccess');

const DEMO_MAX_QUESTION_LENGTH = 400;

function llmPreferenceFor(user) {
  return user?.llm_preference || 'grok';
}

class RAGController {
  static async ask(req, res, next) {
    try {
      const { question, conversationHistory = [] } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const startTime = Date.now();
      const preference = llmPreferenceFor(req.user);
      RAGService.setUserPreference(preference);

      const chunks = await RAGService.retrieveRelevantChunks(question);
      const sources = formatSourcesForClient(chunks);
      const answer = await RAGService.generateAnswer(
        question,
        chunks,
        conversationHistory,
        null,
        preference
      );

      const responseTime = Date.now() - startTime;

      let queryId = null;
      if (req.user) {
        try {
          queryId = await QueryLog.create(req.user.id, question, responseTime, chunks.length);
        } catch (logErr) {
          console.error('[RAG] Failed to log query:', logErr.message);
        }

        try {
          await UserConversation.appendExchange(req.user.id, {
            question,
            answer,
            queryId,
            sources
          });
        } catch (persistErr) {
          console.error('[RAG] Failed to persist conversation:', persistErr.message);
        }
      }

      res.json({
        answer,
        queryId,
        sources,
        metadata: {
          chunks_used: chunks.length,
          response_time: responseTime,
          conversation_length: conversationHistory.length + 2
        }
      });
    } catch (err) {
      console.error('[RAG] Error:', err);
      next(err);
    }
  }

  static async demo(req, res, next) {
    try {
      const question = String(req.body?.question || '').trim();
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }
      if (question.length > DEMO_MAX_QUESTION_LENGTH) {
        return res.status(400).json({
          error: `Demo questions must be ${DEMO_MAX_QUESTION_LENGTH} characters or fewer.`
        });
      }

      const startTime = Date.now();
      RAGService.setUserPreference('grok');
      const chunks = await RAGService.retrieveRelevantChunks(question, 4);
      const sources = formatSourcesForClient(chunks);
      const answer = await RAGService.generateAnswer(question, chunks, [], null, 'grok');
      recordDemoHit(req);

      res.json({
        answer,
        sources,
        metadata: {
          demo: true,
          chunks_used: chunks.length,
          response_time: Date.now() - startTime
        }
      });
    } catch (err) {
      console.error('[RAG] Demo error:', err);
      next(err);
    }
  }

  static async stats(req, res, next) {
    try {
      const stats = await getCorpusStats();
      res.json(stats);
    } catch (err) {
      console.error('[RAG] Stats error:', err);
      next(err);
    }
  }

  static async getConversation(req, res, next) {
    try {
      const result = await UserConversation.getOrCreateActive(req.user.id);
      const conversations = await UserConversation.list(req.user.id);
      res.json({ ...result, conversations });
    } catch (err) {
      next(err);
    }
  }

  static async startConversation(req, res, next) {
    try {
      const result = await UserConversation.startNew(req.user.id);
      const conversations = await UserConversation.list(req.user.id);
      res.json({ ...result, conversations });
    } catch (err) {
      next(err);
    }
  }

  static async getDocument(req, res, next) {
    try {
      const pool = require('../config/database');
      const sourceId = req.params.sourceId;
      const result = await pool.query(`
        SELECT content, metadata, source_id, source_type, chunk_index
        FROM document_chunks
        WHERE source_id = $1
          AND ${CORPUS_EXCLUDES_PRIVATE_SQL}
        ORDER BY chunk_index ASC
        LIMIT 8
      `, [sourceId]);

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const first = normalizeRetrievedChunk(result.rows[0]);
      res.json({
        success: true,
        submission: {
          _id: first.sourceId,
          title: first.title || 'Untitled document',
          source: first.source,
          license: first.license,
          attribution: first.attribution,
          url: first.url,
          category: first.category,
          content: result.rows.map((row) => row.content).join('\n\n'),
          status: 'processed',
          submitted_by_username: first.sourceType === 'crawler' ? 'crawler' : undefined
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const history = QueryLog.getByUser
        ? await QueryLog.getByUser(req.user.id, limit)
        : [];

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
