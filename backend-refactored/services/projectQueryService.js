const RAGService = require('./ragService');
const QueryLog = require('../models/QueryLog');
const Project = require('../models/Project');
const ProjectDocument = require('../models/ProjectDocument');
const ProjectConversation = require('../models/ProjectConversation');
const { formatSourcesForClient } = require('./citationFormat');
const { checkQueryQuota, quotaErrorBody, recordQuery, historyForPrompt } = require('./queryAccess');
const embeddingService = require('./embeddingService');
const { MIN_SIMILARITY, rankProjectPieces, projectPromptPieces } = require('./projectRetrieval');

/**
 * Answer a question inside a project using stored turns, project text, and corpus chunks.
 * @param {{ id: number, llm_preference?: string, role?: string, subscription_tier?: string }} user
 * @param {string} projectId
 * @param {string} question
 * @returns {Promise<{ status: number, body: object }>}
 */
async function runProjectQuery(user, projectId, question) {
  if (!question || question.trim().length === 0) {
    return { status: 400, body: { error: 'Question is required' } };
  }

  const project = await Project.getById(projectId, user.id);
  if (!project) {
    return { status: 404, body: { error: 'Project not found' } };
  }

  const quota = await checkQueryQuota(user);
  if (!quota.allowed) {
    return { status: 429, body: quotaErrorBody(quota) };
  }

  const startTime = Date.now();
  const preference = user.llm_preference || 'grok';
  const active = await ProjectConversation.getActive(projectId, user.id);
  const storedMessages = active ? await ProjectConversation.getMessages(active.id) : [];
  const conversationHistory = historyForPrompt(storedMessages);

  const projectHits = await retrieveProjectHits(projectId, question);
  const corpusChunks = await RAGService.retrieveRelevantChunks(question);
  const sources = formatSourcesForClient(corpusChunks);
  const enhancedChunks = projectPromptPieces(project, projectHits).concat(corpusChunks);

  const answer = await RAGService.generateAnswer(
    question,
    enhancedChunks,
    conversationHistory,
    {
      name: project.name,
      description: project.description,
      objectives: project.objectives,
      constraints: project.constraints
    },
    preference
  );

  const responseTime = Date.now() - startTime;
  let queryId = null;
  try {
    queryId = await QueryLog.create(user.id, question, responseTime, enhancedChunks.length);
  } catch (logErr) {
    console.error('[Project Query] Failed to log query:', logErr.message);
  }

  try {
    await ProjectConversation.appendExchange(projectId, user.id, {
      question,
      answer,
      queryId,
      sources
    });
  } catch (persistErr) {
    console.error('[Project Query] Failed to persist conversation:', persistErr.message);
  }

  await recordQuery(user.id);

  return {
    status: 200,
    body: {
      answer,
      queryId,
      projectId,
      sources,
      metadata: {
        project_name: project.name,
        chunks_used: enhancedChunks.length,
        project_documents: projectHits.length,
        response_time: responseTime,
        conversation_length: conversationHistory.length + 2
      }
    }
  };
}

/**
 * Embed the question and keep the closest stored pieces of this project's uploads.
 * @param {string|number} projectId
 * @param {string} question
 * @returns {Promise<Array<{ content: string, similarity: number, kind: string, file_name: string }>>}
 */
async function retrieveProjectHits(projectId, question) {
  const embedding = await embeddingService.generateEmbedding(question);
  if (!embedding) return [];
  const embeddingStr = `[${embedding.join(',')}]`;
  const hits = await ProjectDocument.searchChunks(projectId, embeddingStr, MIN_SIMILARITY);
  return rankProjectPieces(hits);
}

module.exports = {
  runProjectQuery
};
