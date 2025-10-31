// routes/admin.js
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// All routes require admin access
router.use(requireAdmin);

// GET /api/admin/users - Get all users
router.get('/users', AdminController.getUsers);

// PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', AdminController.updateUserRole);

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', AdminController.deleteUser);

// GET /api/admin/analytics - Get analytics
router.get('/analytics', AdminController.getAnalytics);

// POST /api/admin/preprocess - Trigger preprocessing
router.post('/preprocess', AdminController.triggerPreprocess);

module.exports = router;
