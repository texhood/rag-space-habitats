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

// GET /api/auth/settings - Get user settings
router.get('/settings', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const User = require('../models/User');
    const preference = await User.getLLMPreference(req.user.id);
    
    // Check which LLMs are available
    const availableLLMs = {
      grok: !!(process.env.XAI_API_KEY && process.env.XAI_API_KEY !== 'xai_key'),
      claude: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'not_yet_available')
    };
    
    console.log(`[Settings] User ${req.user.username}: preference=${preference}, available=`, availableLLMs);
    
    res.json({ 
      llm_preference: preference,
      available_llms: availableLLMs
    });
  } catch (err) {
    console.error('[Settings] Error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// POST /api/auth/settings/llm - Update LLM preference
router.post('/settings/llm', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { preference } = req.body;
    
    if (!preference) {
      return res.status(400).json({ error: 'Preference is required' });
    }
    
    const validPreferences = ['grok', 'claude', 'both'];
    if (!validPreferences.includes(preference)) {
      return res.status(400).json({ error: 'Invalid preference. Must be: grok, claude, or both' });
    }
    
    const User = require('../models/User');
    await User.updateLLMPreference(req.user.id, preference);
    
    console.log(`[Settings] User ${req.user.username} updated preference to: ${preference}`);
    
    res.json({ 
      success: true,
      message: 'LLM preference updated',
      preference 
    });
  } catch (err) {
    console.error('[Settings] Update error:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', AuthController.requestPasswordReset);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', AuthController.resetPassword);

// GET /api/auth/verify-reset-token/:token - Verify reset token is valid
router.get('/verify-reset-token/:token', AuthController.verifyResetToken);

module.exports = router;