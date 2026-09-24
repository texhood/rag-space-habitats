const RAGService = require('./ragService');
const QueryLog = require('../models/QueryLog');
const Project = require('../models/Project');
const ProjectDocument = require('../models/ProjectDocument');
const ProjectConversation = require('../models/ProjectConversation');
const { formatSourcesForClient } = require('./citationFormat');
const { checkQueryQuota, quotaErrorBody, recordQuery, historyForPrompt } = require('./queryAccess');

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

  const projectDocs = await ProjectDocument.getByProjectId(projectId, 100);
  const corpusChunks = await RAGService.retrieveRelevantChunks(question);
  const sources = formatSourcesForClient(corpusChunks);
  const enhancedChunks = buildProjectChunks(project, projectDocs).concat(corpusChunks);

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
        project_documents: projectDocs.length,
        response_time: responseTime,
        conversation_length: conversationHistory.length + 2
      }
    }
  };
}

/**
 * Project objectives and uploaded document text, in prompt order.
 * @param {{ objectives?: string, constraints?: string }} project
 * @param {Array<{ content_text?: string, file_name?: string }>} projectDocs
 * @returns {string[]}
 */
function buildProjectChunks(project, projectDocs) {
  const chunks = [];
  if (project.objectives || project.constraints) {
    let projectContext = '[PROJECT CONTEXT]\n';
    if (project.objectives) projectContext += `Objectives: ${project.objectives}\n`;
    if (project.constraints) projectContext += `Constraints: ${project.constraints}\n`;
    chunks.push(projectContext);
  }
  projectDocs.forEach((doc, idx) => {
    if (doc.content_text) {
      chunks.push(`[Project Document ${idx + 1}: ${doc.file_name}]\n${doc.content_text}`);
    }
  });
  return chunks;
}

module.exports = {
  runProjectQuery,
  buildProjectChunks
};
