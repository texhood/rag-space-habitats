// routes/subscriptions.js
const express = require('express');
const router = express.Router();
const Pricing = require('../models/Pricing');
const SystemSettings = require('../models/SystemSettings');

// GET /api/pricing - Get public pricing (no auth required)
router.get('/pricing', async (req, res) => {
  try {
    const tiers = await Pricing.getAllTiers();
    res.json({ tiers });
  } catch (err) {
    console.error('Pricing fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

// GET /api/beta-mode - Get beta mode status (no auth required)
router.get('/beta-mode', async (req, res) => {
  try {
    const betaMode = await SystemSettings.getBetaMode();
    res.json(betaMode);
  } catch (err) {
    console.error('Beta mode fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch beta mode' });
  }
});

// POST /api/subscriptions/create-checkout - Create Stripe checkout session
router.post('/subscriptions/create-checkout', async (req, res) => {
  try {
    // Check if user is authenticated via session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { tier } = req.body;
    
    if (!tier) {
      return res.status(400).json({ error: 'Tier is required' });
    }

    // Get tier pricing
    const tierData = await Pricing.getByTierKey(tier);
    
    if (!tierData) {
      return res.status(404).json({ error: 'Tier not found' });
    }

    // Check if tier is free
    if (tierData.price === 0) {
      return res.status(400).json({ error: 'Cannot create checkout for free tier' });
    }

    // Check if tier has Stripe price ID
    if (!tierData.stripe_price_id) {
      return res.status(400).json({ error: 'Stripe not configured for this tier' });
    }

    // TODO: Create Stripe checkout session (next step)
    res.json({ 
      message: 'Checkout endpoint ready (Stripe integration coming next)',
      tier: tierData 
    });

  } catch (err) {
    console.error('Checkout creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;