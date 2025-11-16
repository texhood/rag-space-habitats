// server.js - Main application entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const sessionMiddleware = require('./config/session');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
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
          
          // Force passport to reload user on next request
          // (This will happen automatically when user makes next authenticated request)
          
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
            await pool.query(
              'UPDATE users SET subscription_tier = ?, subscription_status = ? WHERE id = ?',
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

/ CORS - Support multiple origins
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

// // Debug session
// app.use((req, res, next) => {
//   if (req.path.includes('/auth/') || req.path.includes('/rag/')) {
//     console.log(`[Session] ${req.method} ${req.path}`);
//     console.log(`[Session] Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'}`);
//     console.log(`[Session] User: ${req.user?.username || 'None'}`);
//   }
//   next();
// });

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
    uptime: process.uptime()
  });
});

// Import and mount routes
const authRoutes = require('./routes/auth');
const ragRoutes = require('./routes/rag');
const adminRoutes = require('./routes/admin');
const submissionRoutes = require('./routes/submissions');
const subscriptionRoutes = require('./routes/subscriptions');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', subscriptionRoutes); // For /pricing, /beta-mode, /subscriptions/create-checkout

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

async function startServer() {
  try {
    await mongoClient.connect();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      const embeddingService = require('./services/embeddingService');
      embeddingService.checkHealth()
        .then(healthy => {
          if (healthy) {
            console.log('✅ Embedding service ready on port 5001');
          } else {
            console.log('⚠️  Embedding service not available - will use keyword search fallback');
          }
        })
        .catch(err => {
          console.log('⚠️  Could not connect to embedding service:', err.message);
          console.log('   Start it with: python python-services/embedding_server.py');
        });
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});