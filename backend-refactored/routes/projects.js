const express = require('express');
const multer = require('multer');
const { isAuthenticated } = require('../middleware/auth');
const projects = require('../controllers/projectController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.get('/', isAuthenticated, projects.listProjects);
router.post('/', isAuthenticated, projects.createProject);
router.get('/knowledge-base/search', isAuthenticated, projects.searchKnowledgeBase);
router.get('/:id', isAuthenticated, projects.getProject);
router.put('/:id', isAuthenticated, projects.updateProject);
router.delete('/:id', isAuthenticated, projects.deleteProject);
router.get('/:id/filters', isAuthenticated, projects.listFilters);
router.post('/:id/filters', isAuthenticated, projects.addFilter);
router.delete('/:id/filters/:filterId', isAuthenticated, projects.removeFilter);
router.get('/:id/pinned', isAuthenticated, projects.listPinned);
router.post('/:id/pinned', isAuthenticated, projects.pinDocument);
router.delete('/:id/pinned/:pinId', isAuthenticated, projects.unpinDocument);
router.get('/:id/documents', isAuthenticated, projects.listDocuments);
router.post('/:id/documents', isAuthenticated, upload.single('file'), projects.uploadDocument);
router.delete('/:id/documents/:docId', isAuthenticated, projects.deleteDocument);
router.get('/:id/documents/:docId/status', isAuthenticated, projects.documentStatus);
router.get('/:id/bookmarks', isAuthenticated, projects.listBookmarks);
router.post('/:id/bookmarks', isAuthenticated, projects.createBookmark);
router.put('/:id/bookmarks/:bmId', isAuthenticated, projects.updateBookmark);
router.delete('/:id/bookmarks/:bmId', isAuthenticated, projects.deleteBookmark);
router.get('/:id/conversations', isAuthenticated, projects.listConversations);
router.get('/:id/conversation', isAuthenticated, projects.getConversation);
router.post('/:id/conversation', isAuthenticated, projects.startConversation);
router.post('/:id/conversations/:conversationId/open', isAuthenticated, projects.openConversation);
router.post('/:id/query', isAuthenticated, projects.queryProject);

module.exports = router;
