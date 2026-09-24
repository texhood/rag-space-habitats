const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  applyStripeEvent,
  claimEventId,
  userIdForSubscription
} = require('../../services/stripeWebhook');

function fakeSubscriptions() {
  const calls = [];
  return {
    calls,
    async create(userId, tierKey, data) {
      calls.push(['create', userId, tierKey, data]);
    },
    async update(id, data) {
      calls.push(['update', id, data]);
    },
    async updateByStripeId(stripeId, data) {
      calls.push(['updateByStripeId', stripeId, data]);
    },
    async updateUserTier(userId, tierKey, status) {
      calls.push(['updateUserTier', userId, tierKey, status]);
    },
    async getByUserId(userId) {
      calls.push(['getByUserId', userId]);
      return { id: 7, user_id: userId, tier_key: 'pro' };
    },
    async getByStripeSubscriptionId(stripeId) {
      calls.push(['getByStripeSubscriptionId', stripeId]);
      return { id: 7, user_id: 42, tier_key: 'pro' };
    }
  };
}

describe('claimEventId', () => {
  it('accepts an event once', () => {
    const seen = new Set();
    assert.equal(claimEventId('evt_1', seen), true);
    assert.equal(claimEventId('evt_1', seen), false);
  });
});

describe('applyStripeEvent', () => {
  it('writes the subscription and the user tier after checkout', async () => {
    const subscriptions = fakeSubscriptions();
    const stripe = {
      subscriptions: {
        async retrieve() {
          return {
            status: 'active',
            current_period_start: 100,
            current_period_end: 200,
            items: { data: [{ price: { id: 'price_1' } }] }
          };
        }
      }
    };
    const result = await applyStripeEvent({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_1',
          subscription: 'sub_1',
          metadata: { user_id: '15', tier_key: 'pro' }
        }
      }
    }, { stripe, subscriptions });

    assert.equal(result.applied, true);
    assert.deepEqual(subscriptions.calls[0][0], 'create');
    assert.equal(subscriptions.calls[0][1], 15);
    assert.equal(subscriptions.calls[0][2], 'pro');
    assert.deepEqual(subscriptions.calls[1], ['updateUserTier', 15, 'pro', 'active']);
  });

  it('downgrades the user and the subscription row when a subscription is deleted', async () => {
    const subscriptions = fakeSubscriptions();
    const result = await applyStripeEvent({
      id: 'evt_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_9',
          metadata: {}
        }
      }
    }, { stripe: {}, subscriptions });

    assert.equal(result.applied, true);
    assert.deepEqual(subscriptions.calls[1], ['updateByStripeId', 'sub_9', { status: 'cancelled' }]);
    assert.deepEqual(subscriptions.calls[2], ['updateUserTier', 42, 'free', 'cancelled']);
  });
});

describe('userIdForSubscription', () => {
  it('prefers metadata and falls back to the stored Stripe id', async () => {
    const subscriptions = fakeSubscriptions();
    assert.equal(await userIdForSubscription({ metadata: { user_id: '9' } }, subscriptions), 9);
    assert.equal(await userIdForSubscription({ id: 'sub_9', metadata: {} }, subscriptions), 42);
  });
});
