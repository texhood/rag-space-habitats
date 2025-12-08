// routes/subscriptions.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const Pricing = require('../models/Pricing');
const SystemSettings = require('../models/SystemSettings');
const { isAuthenticated } = require('../middleware/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

// GET /api/subscriptions/current - Get current subscription info
router.get('/current', isAuthenticated, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const Pricing = require('../models/Pricing');
    
    const subscription = await Subscription.getByUserId(req.user.id);
    
    if (!subscription) {
      // Return free tier info
      const freeTier = await Pricing.getByTierKey('free');
      return res.json({
        tier: 'free',
        status: 'active',
        features: freeTier?.features || {},
        price: 0
      });
    }

    // Get tier features
    const tierInfo = await Pricing.getByTierKey(subscription.tier);
    
    res.json({
      ...subscription,
      features: tierInfo?.features || {},
      price: tierInfo?.price || 0
    });

  } catch (err) {
    console.error('[Subscription] Current fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/cancel-scheduled-change - Cancel a pending downgrade or cancellation
router.post('/cancel-scheduled-change', isAuthenticated, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const subscription = await Subscription.getByUserId(req.user.id);
    
    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // If cancellation was scheduled, undo it
    if (subscription.cancel_at_period_end) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false
      });
      
      console.log(`[Stripe] Cancelled scheduled cancellation for user ${req.user.id}`);
    }

    // Clear scheduled change in database
    await pool.query(
      `UPDATE subscriptions 
       SET scheduled_tier = NULL, 
           scheduled_change_date = NULL,
           cancel_at_period_end = false
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ 
      success: true, 
      message: 'Scheduled change cancelled. Your current plan will continue.' 
    });

  } catch (err) {
    console.error('[Subscription] Cancel scheduled change error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/create-portal-session - Create Stripe Customer Portal session
router.post('/create-portal-session', isAuthenticated, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Get user's Stripe customer ID
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );

    let customerId = userResult.rows[0]?.stripe_customer_id;

    // Also check subscriptions table
    if (!customerId) {
      const subResult = await pool.query(
        'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      customerId = subResult.rows[0]?.stripe_customer_id;
    }

    if (!customerId) {
      return res.status(400).json({ error: 'No billing information found. Please subscribe to a plan first.' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/app?profile=billing`
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error('[Stripe] Portal session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/cancel - Cancel subscription at period end
router.post('/cancel', isAuthenticated, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const subscription = await Subscription.getByUserId(req.user.id);
    
    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update local record
    await pool.query(
      `UPDATE subscriptions 
       SET cancel_at_period_end = true,
           scheduled_tier = 'free',
           scheduled_change_date = current_period_end
       WHERE user_id = $1`,
      [req.user.id]
    );

    console.log(`[Stripe] User ${req.user.id} cancelled subscription, effective ${subscription.current_period_end}`);

    res.json({ 
      success: true, 
      message: 'Subscription cancelled',
      effective_date: subscription.current_period_end
    });

  } catch (err) {
    console.error('[Subscription] Cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// UPDATED schedule-downgrade route with persistence
// ============================================

// POST /api/subscriptions/schedule-downgrade - Schedule downgrade at period end
router.post('/schedule-downgrade', isAuthenticated, async (req, res) => {
  try {
    const { tier } = req.body;
    const Subscription = require('../models/Subscription');
    const Pricing = require('../models/Pricing');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!tier) {
      return res.status(400).json({ error: 'Tier is required' });
    }

    const currentSub = await Subscription.getByUserId(req.user.id);
    
    if (!currentSub || !currentSub.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const targetTier = await Pricing.getByTierKey(tier);
    
    if (!targetTier) {
      return res.status(404).json({ error: 'Target tier not found' });
    }

    console.log(`[Stripe] Scheduling downgrade for user ${req.user.id} to ${tier}`);

    if (parseFloat(targetTier.price) === 0) {
      // Downgrading to free - cancel subscription at period end
      await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: { downgrade_to: tier }
      });

      console.log(`[Stripe] Subscription will cancel at period end, downgrade to ${tier}`);
    } else {
      // Downgrading to a paid tier - schedule price change
      const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);

      await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: targetTier.stripe_price_id,
        }],
        proration_behavior: 'none',
        billing_cycle_anchor: 'unchanged',
        metadata: { downgrade_to: tier, scheduled: 'true' }
      });

      console.log(`[Stripe] Scheduled downgrade to ${tier} at period end`);
    }

    // Update local subscription record with scheduled change
    await pool.query(
      `UPDATE subscriptions 
       SET scheduled_tier = $1,
           scheduled_change_date = current_period_end,
           cancel_at_period_end = $2
       WHERE user_id = $3`,
      [tier, parseFloat(targetTier.price) === 0, req.user.id]
    );

    res.json({
      success: true,
      message: 'Downgrade scheduled',
      scheduled_tier: tier,
      effective_date: currentSub.current_period_end
    });

  } catch (err) {
    console.error('[Stripe] Downgrade scheduling error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/create-checkout - Create Stripe checkout session
router.post('/subscriptions/create-checkout', isAuthenticated, async (req, res) => {
  try {
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

    console.log(`[Stripe] Creating checkout for user ${req.user.username} (${req.user.id}) - ${tierData.name}`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email || undefined,
      client_reference_id: req.user.id.toString(),
      line_items: [
        {
          price: tierData.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?checkout=success&tier=${tier}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?checkout=cancelled`,
      metadata: {
        user_id: req.user.id.toString(),
        tier_key: tier,
        tier_name: tierData.name
      },
      subscription_data: {
        metadata: {
          user_id: req.user.id.toString(),
          tier_key: tier
        }
      }
    });

    console.log(`[Stripe] Checkout session created: ${session.id}`);

    res.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (err) {
    console.error('[Stripe] Checkout creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe] Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[Stripe] Checkout completed for user ${session.metadata.user_id}`);
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Update user subscription in database
        const Subscription = require('../models/Subscription');
        
        await Subscription.create(
          parseInt(session.metadata.user_id),
          session.metadata.tier_key,
          {
            customerId: session.customer,
            subscriptionId: session.subscription,
            priceId: subscription.items.data[0].price.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          }
        );
        
        console.log(`[Stripe] User ${session.metadata.user_id} upgraded to ${session.metadata.tier_key}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata.user_id;
        
        if (userId) {
          const Subscription = require('../models/Subscription');
          const sub = await Subscription.getByUserId(parseInt(userId));
          
          if (sub) {
            await Subscription.update(sub.id, {
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000),
              current_period_end: new Date(subscription.current_period_end * 1000),
              cancel_at_period_end: subscription.cancel_at_period_end
            });
            
            console.log(`[Stripe] Subscription ${subscription.id} updated for user ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata.user_id;
        
        if (userId) {
          const pool = require('../config/database');
          
          // Downgrade user to free tier (PostgreSQL parameterized query)
          await pool.query(
            'UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3',
            ['free', 'cancelled', parseInt(userId)]
          );
          
          console.log(`[Stripe] User ${userId} subscription cancelled - downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`[Stripe] Payment failed for subscription ${invoice.subscription}`);
        // TODO: Send email notification to user
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe] Webhook handling error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// POST /api/subscriptions/schedule-downgrade - Schedule downgrade at period end
router.post('/subscriptions/schedule-downgrade', isAuthenticated, async (req, res) => {
  try {
    const { tier } = req.body;
    
    if (!tier) {
      return res.status(400).json({ error: 'Tier is required' });
    }

    // Get user's current subscription
    const Subscription = require('../models/Subscription');
    const currentSub = await Subscription.getByUserId(req.user.id);
    
    if (!currentSub || !currentSub.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Get target tier pricing
    const targetTier = await Pricing.getByTierKey(tier);
    
    if (!targetTier) {
      return res.status(404).json({ error: 'Target tier not found' });
    }

    console.log(`[Stripe] Scheduling downgrade for user ${req.user.id} to ${tier}`);

    // Update Stripe subscription to change at period end
    if (targetTier.price === 0) {
      // Downgrading to free - cancel subscription at period end
      const subscription = await stripe.subscriptions.update(
        currentSub.stripe_subscription_id,
        {
          cancel_at_period_end: true,
          metadata: {
            downgrade_to: tier
          }
        }
      );

      console.log(`[Stripe] Subscription will cancel at period end, downgrade to ${tier}`);
    } else {
      // Downgrading to a paid tier - schedule price change
      const subscription = await stripe.subscriptions.retrieve(
        currentSub.stripe_subscription_id
      );

      await stripe.subscriptions.update(
        currentSub.stripe_subscription_id,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: targetTier.stripe_price_id,
          }],
          proration_behavior: 'none', // No prorations for downgrades
          billing_cycle_anchor: 'unchanged',
          metadata: {
            downgrade_to: tier,
            scheduled: 'true'
          }
        }
      );

      console.log(`[Stripe] Scheduled downgrade to ${tier} at period end`);
    }

    // Update local subscription record
    await Subscription.update(currentSub.id, {
      cancel_at_period_end: targetTier.price === 0,
      metadata: JSON.stringify({ downgrade_to: tier })
    });

    res.json({
      success: true,
      message: 'Downgrade scheduled',
      effective_date: currentSub.current_period_end
    });

  } catch (err) {
    console.error('[Stripe] Downgrade scheduling error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
