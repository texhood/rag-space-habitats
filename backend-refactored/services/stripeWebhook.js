/**
 * Record a Stripe event id. A duplicate insert means the event was already applied.
 * @param {string} eventId
 * @param {string} eventType
 * @returns {Promise<boolean>} true when this process should apply the event
 */
async function claimStripeEvent(eventId, eventType) {
  const pool = require('../config/database');
  const result = await pool.query(
    `INSERT INTO stripe_events (event_id, event_type)
     VALUES ($1, $2)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId, eventType]
  );
  return result.rows.length > 0;
}

/**
 * In-memory claim used by tests and as the rule the database insert follows.
 * @param {string} eventId
 * @param {Set<string>} seen
 * @returns {boolean}
 */
function claimEventId(eventId, seen) {
  if (seen.has(eventId)) return false;
  seen.add(eventId);
  return true;
}

/**
 * Find the local user for a Stripe subscription object.
 * @param {{ id?: string, metadata?: { user_id?: string } }} subscription
 * @param {{ getByStripeSubscriptionId: Function }} subscriptions
 * @returns {Promise<number|null>}
 */
async function userIdForSubscription(subscription, subscriptions) {
  const fromMetadata = subscription.metadata && subscription.metadata.user_id;
  if (fromMetadata) return parseInt(fromMetadata, 10);
  const row = await subscriptions.getByStripeSubscriptionId(subscription.id);
  return row ? row.user_id : null;
}

/**
 * Apply one verified Stripe event to users and subscriptions together.
 * @param {{ id: string, type: string, data: { object: object } }} event
 * @param {{ stripe: { subscriptions: { retrieve: Function } }, subscriptions: object }} deps
 * @returns {Promise<{ duplicate?: boolean, applied: boolean }>}
 */
async function applyStripeEvent(event, deps) {
  const subscriptions = deps.subscriptions;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = parseInt(session.metadata && session.metadata.user_id, 10);
      const tierKey = session.metadata && session.metadata.tier_key;
      if (!userId || !tierKey || !session.subscription) {
        return { applied: false };
      }
      const stripeSubscription = await deps.stripe.subscriptions.retrieve(session.subscription);
      const priceId = stripeSubscription.items.data[0].price.id;
      await subscriptions.create(userId, tierKey, {
        status: stripeSubscription.status || 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_price_id: priceId,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end
      });
      await subscriptions.updateUserTier(userId, tierKey, 'active');
      return { applied: true };
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const userId = await userIdForSubscription(subscription, subscriptions);
      if (!userId) return { applied: false };
      const row = await subscriptions.getByUserId(userId);
      if (row) {
        await subscriptions.update(row.id, {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end
        });
      }
      await subscriptions.updateUserTier(userId, row ? row.tier_key : 'free', subscription.status);
      return { applied: true };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = await userIdForSubscription(subscription, subscriptions);
      if (!userId) return { applied: false };
      await subscriptions.updateByStripeId(subscription.id, { status: 'cancelled' });
      await subscriptions.updateUserTier(userId, 'free', 'cancelled');
      return { applied: true };
    }

    default:
      return { applied: false };
  }
}

/**
 * Express handler for POST /api/subscriptions/webhook. Mount before JSON body parsing.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function stripeWebhookHandler(req, res) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const Subscription = require('../models/Subscription');
  try {
    const claimed = await claimStripeEvent(event.id, event.type);
    if (!claimed) {
      res.json({ received: true, duplicate: true });
      return;
    }
    await applyStripeEvent(event, { stripe, subscriptions: Subscription });
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe] Webhook handling error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

module.exports = {
  claimStripeEvent,
  claimEventId,
  userIdForSubscription,
  applyStripeEvent,
  stripeWebhookHandler
};
