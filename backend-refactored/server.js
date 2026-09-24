require('dotenv').config();

// server.js - Main application entry point
const express = require('express');
const cors = require('cors');
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

const { stripeWebhookHandler } = require('./services/stripeWebhook');
app.post(
  '/api/subscriptions/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// ======================
// MIDDLEWARE
// ======================

// CORS - Support multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3500',
  'http://localhost:3501',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3500',
  'http://127.0.0.1:3501',
  'https://rag-space-habitats.vercel.app',
  'https://spacehabitats.net',
  'https://www.spacehabitats.net',
  process.env.CORS_ORIGIN
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

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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
const crawlerRoutes = require('./routes/crawler');
const feedbackRoutes = require('./routes/feedback');
const projectsRoutes = require('./routes/projects');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/projects', projectsRoutes);
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

async function startServer() {
  try {
    await mongoClient.connect();

    // Initialize GridFS for project document uploads
    const gridfsService = require('./services/gridfsService');
    await gridfsService.initialize();

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