// routes/projects.js - Projects API endpoints
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const ProjectDocument = require('../models/ProjectDocument');
const ProjectBookmark = require('../models/ProjectBookmark');
const { requireEnterprise } = require('../middleware/enterpriseAuth');

// Constants
const PROJECT_LIMITS = {
  maxPinnedDocuments: 20,
  maxFileSizeMB: 200,
  maxFileSizeBytes: 200 * 1024 * 1024  // 209,715,200 bytes
};

// ========== PROJECT CRUD ==========

/**
 * GET /api/projects
 * List user's projects
 */
router.get('/', requireEnterprise, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const projects = await Project.getByUserId(req.user.id, limit, offset);
    const count = await Project.countByUserId(req.user.id);

    res.json({
      projects,
      pagination: {
        limit,
        offset,
        total: count
      }
    });
  } catch (err) {
    console.error('[Projects] List error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', requireEnterprise, async (req, res) => {
  try {
    const { name, description, objectives, constraints } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (name.length > 255) {
      return res.status(400).json({ error: 'Project name must be less than 255 characters' });
    }

    const project = await Project.create(req.user.id, {
      name: name.trim(),
      description: description || '',
      objectives: objectives || '',
      constraints: constraints || ''
    });

    console.log(`[Projects] User ${req.user.id} created project: ${project.name}`);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (err) {
    console.error('[Projects] Create error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get('/:id', requireEnterprise, async (req, res) => {
  try {
    const project = await Project.getById(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error('[Projects] Get error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', requireEnterprise, async (req, res) => {
  try {
    const { name, description, objectives, constraints, is_active } = req.body;

    if (name && name.length > 255) {
      return res.status(400).json({ error: 'Project name must be less than 255 characters' });
    }

    const project = await Project.update(req.params.id, req.user.id, {
      name,
      description,
      objectives,
      constraints,
      is_active
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[Projects] User ${req.user.id} updated project: ${project.name}`);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (err) {
    console.error('[Projects] Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', requireEnterprise, async (req, res) => {
  try {
    const success = await Project.delete(req.params.id, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[Projects] User ${req.user.id} deleted project: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (err) {
    console.error('[Projects] Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PROJECT FILTERS ==========

/**
 * GET /api/projects/:id/filters
 * Get project filters
 */
router.get('/:id/filters', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const filters = await Project.getFilters(req.params.id);

    res.json({
      filters,
      count: filters.length
    });
  } catch (err) {
    console.error('[Projects] Get filters error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/projects/:id/filters
 * Add filter to project
 */
router.post('/:id/filters', requireEnterprise, async (req, res) => {
  try {
    const { filterType, filterValue } = req.body;

    if (!filterType || !filterValue) {
      return res.status(400).json({ error: 'Filter type and value are required' });
    }

    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const filter = await Project.addFilter(req.params.id, filterType, filterValue);

    console.log(`[Projects] User ${req.user.id} added filter to project ${req.params.id}`);

    res.status(201).json({
      success: true,
      message: 'Filter added successfully',
      filter
    });
  } catch (err) {
    console.error('[Projects] Add filter error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:id/filters/:filterId
 * Remove filter from project
 */
router.delete('/:id/filters/:filterId', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const success = await Project.removeFilter(req.params.filterId, req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    console.log(`[Projects] User ${req.user.id} removed filter from project ${req.params.id}`);

    res.json({
      success: true,
      message: 'Filter removed successfully'
    });
  } catch (err) {
    console.error('[Projects] Remove filter error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PINNED DOCUMENTS ==========

/**
 * GET /api/projects/:id/pinned
 * Get pinned documents
 */
router.get('/:id/pinned', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const pinnedDocs = await Project.getPinnedDocuments(req.params.id);

    res.json({
      pinnedDocuments: pinnedDocs,
      count: pinnedDocs.length,
      maxPinned: PROJECT_LIMITS.maxPinnedDocuments
    });
  } catch (err) {
    console.error('[Projects] Get pinned error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/projects/:id/pinned
 * Pin a document
 */
router.post('/:id/pinned', requireEnterprise, async (req, res) => {
  try {
    const { mongoId, documentTitle, documentSource } = req.body;

    if (!mongoId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check pinned document limit
    const pinnedCount = await Project.countPinnedDocuments(req.params.id);
    if (pinnedCount >= PROJECT_LIMITS.maxPinnedDocuments) {
      return res.status(400).json({
        error: `Maximum ${PROJECT_LIMITS.maxPinnedDocuments} pinned documents reached`
      });
    }

    const pinned = await Project.pinDocument(
      req.params.id,
      mongoId,
      documentTitle,
      documentSource
    );

    if (!pinned) {
      return res.status(400).json({ error: 'Document already pinned to this project' });
    }

    console.log(`[Projects] User ${req.user.id} pinned document to project ${req.params.id}`);

    res.status(201).json({
      success: true,
      message: 'Document pinned successfully',
      pinned
    });
  } catch (err) {
    console.error('[Projects] Pin document error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:id/pinned/:pinId
 * Unpin a document
 */
router.delete('/:id/pinned/:pinId', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const success = await Project.unpinDocument(req.params.pinId, req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Pinned document not found' });
    }

    console.log(`[Projects] User ${req.user.id} unpinned document from project ${req.params.id}`);

    res.json({
      success: true,
      message: 'Document unpinned successfully'
    });
  } catch (err) {
    console.error('[Projects] Unpin document error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PROJECT DOCUMENTS (uploaded) ==========

/**
 * GET /api/projects/:id/documents
 * List uploaded documents
 */
router.get('/:id/documents', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const documents = await ProjectDocument.getByProjectId(req.params.id);
    const stats = await ProjectDocument.getStats(req.params.id);

    res.json({
      documents,
      stats,
      count: documents.length
    });
  } catch (err) {
    console.error('[Projects] Get documents error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:id/documents/:docId
 * Remove document
 */
router.delete('/:id/documents/:docId', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const gridfsId = await ProjectDocument.delete(req.params.docId, req.params.id);

    if (!gridfsId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`[Projects] User ${req.user.id} deleted document ${gridfsId} from project ${req.params.id}`);

    res.json({
      success: true,
      message: 'Document deleted successfully',
      gridfsId  // Return for client-side cleanup if needed
    });
  } catch (err) {
    console.error('[Projects] Delete document error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/projects/:id/documents/:docId/status
 * Check document processing status
 */
router.get('/:id/documents/:docId/status', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const doc = await ProjectDocument.getById(req.params.docId, req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: doc.id,
      fileName: doc.file_name,
      processingStatus: doc.processing_status,
      errorMessage: doc.error_message
    });
  } catch (err) {
    console.error('[Projects] Check status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== BOOKMARKS ==========

/**
 * GET /api/projects/:id/bookmarks
 * List bookmarks
 */
router.get('/:id/bookmarks', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const bookmarks = await ProjectBookmark.getByProjectId(req.params.id, limit, offset);
    const count = await ProjectBookmark.countByProjectId(req.params.id);

    res.json({
      bookmarks,
      pagination: {
        limit,
        offset,
        total: count
      }
    });
  } catch (err) {
    console.error('[Projects] Get bookmarks error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/projects/:id/bookmarks
 * Save a bookmark
 */
router.post('/:id/bookmarks', requireEnterprise, async (req, res) => {
  try {
    const { queryText, responseText, modelUsed, citedDocuments, userNotes, tags } = req.body;

    if (!queryText || !responseText) {
      return res.status(400).json({ error: 'Query and response text are required' });
    }

    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const bookmark = await ProjectBookmark.create(req.params.id, {
      queryText,
      responseText,
      modelUsed,
      citedDocuments,
      userNotes,
      tags
    });

    console.log(`[Projects] User ${req.user.id} bookmarked response in project ${req.params.id}`);

    res.status(201).json({
      success: true,
      message: 'Bookmark saved successfully',
      bookmark
    });
  } catch (err) {
    console.error('[Projects] Create bookmark error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/projects/:id/bookmarks/:bmId
 * Update bookmark notes/tags
 */
router.put('/:id/bookmarks/:bmId', requireEnterprise, async (req, res) => {
  try {
    const { userNotes, tags } = req.body;

    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const bookmark = await ProjectBookmark.update(req.params.bmId, req.params.id, {
      userNotes,
      tags
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    console.log(`[Projects] User ${req.user.id} updated bookmark in project ${req.params.id}`);

    res.json({
      success: true,
      message: 'Bookmark updated successfully',
      bookmark
    });
  } catch (err) {
    console.error('[Projects] Update bookmark error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/projects/:id/bookmarks/:bmId
 * Delete bookmark
 */
router.delete('/:id/bookmarks/:bmId', requireEnterprise, async (req, res) => {
  try {
    // Verify project ownership
    const project = await Project.getById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const success = await ProjectBookmark.delete(req.params.bmId, req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    console.log(`[Projects] User ${req.user.id} deleted bookmark from project ${req.params.id}`);

    res.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
  } catch (err) {
    console.error('[Projects] Delete bookmark error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PROJECT QUERY ==========

/**
 * POST /api/projects/:id/query
 * Execute a RAG query within a project context
 * Includes project objectives/constraints and project documents in context
 */
router.post('/:id/query', requireEnterprise, async (req, res) => {
  const RAGService = require('../services/ragService');
  const QueryLog = require('../models/QueryLog');

  try {
    const { question, conversationHistory = [] } = req.body;
    const projectId = req.params.id;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Verify project exists and user owns it
    const project = await Project.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[Project Query] Project ${projectId}: "${question.substring(0, 50)}..."`);

    const startTime = Date.now();

    // Set user's LLM preference if available
    if (req.user?.llm_preference) {
      RAGService.setUserPreference(req.user.llm_preference);
    }

    // Get project documents (uploaded files)
    const projectDocs = await ProjectDocument.getByProjectId(projectId, 100);
    console.log(`[Project Query] Found ${projectDocs.length} project documents`);

    // Retrieve relevant chunks from knowledge base
    const chunks = await RAGService.retrieveRelevantChunks(question);

    // Build enhanced context with project objectives and constraints
    let enhancedChunks = [];

    // Add project context as first chunk
    if (project.objectives || project.constraints) {
      let projectContext = `[PROJECT CONTEXT]\n`;
      if (project.objectives) {
        projectContext += `Objectives: ${project.objectives}\n`;
      }
      if (project.constraints) {
        projectContext += `Constraints: ${project.constraints}\n`;
      }
      enhancedChunks.push(projectContext);
    }

    // Add project document contents
    if (projectDocs.length > 0) {
      projectDocs.forEach((doc, idx) => {
        if (doc.content_text) {
          enhancedChunks.push(`[Project Document ${idx + 1}: ${doc.file_name}]\n${doc.content_text}`);
        }
      });
    }

    // Add knowledge base chunks
    enhancedChunks = enhancedChunks.concat(chunks);

    // Build project context object to pass to RAGService
    const projectContextData = {
      name: project.name,
      description: project.description,
      objectives: project.objectives,
      constraints: project.constraints
    };

    console.log(`\n========== PASSING PROJECT CONTEXT TO RAG SERVICE ==========`);
    console.log(`Name: ${projectContextData.name}`);
    console.log(`Description: ${projectContextData.description || 'N/A'}`);
    console.log(`Objectives: ${projectContextData.objectives || 'N/A'}`);
    console.log(`Constraints: ${projectContextData.constraints || 'N/A'}`);
    console.log(`Enhanced chunks count: ${enhancedChunks.length}`);
    console.log(`============================================================\n`);

    // Generate answer with project context
    const answer = await RAGService.generateAnswer(question, enhancedChunks, conversationHistory, projectContextData);

    const responseTime = Date.now() - startTime;
    console.log(`[Project Query] Response time: ${responseTime}ms`);

    // Log the query
    let queryId = null;
    if (req.user) {
      try {
        queryId = await QueryLog.create(
          req.user.id,
          question,
          responseTime,
          enhancedChunks.length
        );
      } catch (logErr) {
        console.error('[Project Query] Failed to log query:', logErr.message);
      }
    }

    res.json({
      answer,
      queryId,
      projectId,
      metadata: {
        project_name: project.name,
        chunks_used: enhancedChunks.length,
        project_documents: projectDocs.length,
        response_time: responseTime,
        conversation_length: conversationHistory.length + 2
      }
    });

  } catch (err) {
    console.error('[Project Query] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
