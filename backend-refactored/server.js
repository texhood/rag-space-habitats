// server.js - Main application entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');  // <-- ADD: for scheduled crawler
const passport = require('./config/passport');
const sessionMiddleware = require('./config/session');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const accountRoutes = require('./routes/account');
const mongoClient = require('./config/mongodb');

// Initialize Express
const app = express();

// ======================
// WEBHOOK ROUTE FIRST (before body parsing)
// ======================

// Stripe webhook needs raw body - MUST be before express.json()
app.post('/api/subscriptions/webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[Stripe] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe] Webhook received: ${event.type}`);

    try {
      const pool = require('./config/database');
      const Subscription = require('./models/Subscription');
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          console.log(`[Stripe] Checkout completed for user ${session.metadata.user_id}`);
          
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
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
            const sub = await Subscription.getByUserId(parseInt(userId));
            
            if (sub) {
              await Subscription.update(sub.id, {
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000),
                current_period_end: new Date(subscription.current_period_end * 1000),
                cancel_at_period_end: subscription.cancel_at_period_end
              });
              
              console.log(`[Stripe] Subscription updated for user ${userId}`);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const userId = subscription.metadata.user_id;
          
          if (userId) {
            // PostgreSQL parameterized query
            await pool.query(
              'UPDATE users SET subscription_tier = $1, subscription_status = $2 WHERE id = $3',
              ['free', 'cancelled', parseInt(userId)]
            );
            
            console.log(`[Stripe] User ${userId} downgraded to free`);
          }
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
  }
);

// ======================
// MIDDLEWARE
// ======================

// CORS - Support multiple origins
const allowedOrigins = [
  'http://localhost:3000',  // Local frontend
  'https://rag-space-habitats.vercel.app',  // Production frontend
  process.env.CORS_ORIGIN  // Railway env variable
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, curl, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Body parsing (after webhook route)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Session
app.use(sessionMiddleware);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ======================
// ROUTES
// ======================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'PostgreSQL + pgvector'
  });
});

// Import and mount routes
const authRoutes = require('./routes/auth');
const ragRoutes = require('./routes/rag');
const adminRoutes = require('./routes/admin');
const submissionRoutes = require('./routes/submissions');
const subscriptionRoutes = require('./routes/subscriptions');
const crawlerRoutes = require('./routes/crawler');  // <-- ADD: crawler routes

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/crawler', crawlerRoutes);  // <-- ADD: mount crawler routes
app.use('/api/account', accountRoutes);

// Legacy compatibility routes
app.post('/register', (req, res, next) => {
  authRoutes.handle(req, res, next);
});

app.post('/login', (req, res, next) => {
  authRoutes.handle(req, res, next);
});

app.post('/logout', (req, res, next) => {
  authRoutes.handle(req, res, next);
});

app.get('/me', (req, res, next) => {
  authRoutes.handle(req, res, next);
});

app.post('/ask', (req, res, next) => {
  ragRoutes.handle(req, res, next);
});

app.post('/admin/preprocess', (req, res, next) => {
  adminRoutes.handle(req, res, next);
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ======================
// START SERVER
// ======================

const PORT = process.env.PORT || 5000;

// Crawler scheduler reference (for graceful shutdown)
let crawlerScheduler = null;

async function startServer() {
  try {
    await mongoClient.connect();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database: PostgreSQL with pgvector`);
      
      // Check embedding service
      const embeddingService = require('./services/embeddingService');
      embeddingService.checkHealth()
        .then(healthy => {
          if (healthy) {
            console.log('✅ Embedding service ready');
          } else {
            console.log('⚠️  Embedding service not available - will use keyword search fallback');
          }
        })
        .catch(err => {
          console.log('⚠️  Could not connect to embedding service:', err.message);
        });

      // ======================
      // CRAWLER SCHEDULER - ADD THIS SECTION
      // ======================
      
      // Schedule crawler to run at 23:00 CT (Central Time) daily
      const crawlerService = require('./services/crawlerService');
      
      crawlerScheduler = cron.schedule('0 23 * * *', async () => {
        console.log('\n[Scheduler] Triggering scheduled crawler run...');
        try {
          const result = await crawlerService.run();
          console.log('[Scheduler] Crawler completed:', result.status);
          if (result.documentsProcessed) {
            console.log(`[Scheduler] Documents processed: ${result.documentsProcessed}`);
          }
        } catch (err) {
          console.error('[Scheduler] Crawler error:', err.message);
        }
      }, {
        scheduled: true,
        timezone: 'America/Chicago'
      });

      console.log('✅ Crawler scheduled for 23:00 CT daily');
      // ======================
      // END CRAWLER SCHEDULER
      // ======================
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (crawlerScheduler) {
    crawlerScheduler.stop();  // <-- ADD: stop scheduler on shutdown
    console.log('Crawler scheduler stopped');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (crawlerScheduler) {
    crawlerScheduler.stop();  // <-- ADD: stop scheduler on shutdown
    console.log('Crawler scheduler stopped');
  }
  process.exit(0);
});