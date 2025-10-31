// routes/auth.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// POST /api/auth/register - Register new user
router.post('/register', AuthController.register);

// POST /api/auth/login - Login user
router.post('/login', AuthController.login);

// POST /api/auth/logout - Logout user
router.post('/logout', AuthController.logout);

// GET /api/auth/me - Get current user
router.get('/me', AuthController.getCurrentUser);

module.exports = router;
