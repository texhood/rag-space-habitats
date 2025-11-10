// server.js - Main application entry point (WITHOUT AdminJS)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const sessionMiddleware = require('./config/session');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const mongoClient = require('./config/mongodb');

// Initialize Express FIRST
const app = express();

// ======================
// MIDDLEWARE
// ======================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
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
app.use('/api', subscriptionRoutes); // Mounts /pricing, /beta-mode, /subscriptions/create-checkout

// Legacy compatibility routes (for existing frontend)
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

// Initialize MongoDB connection and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoClient.connect();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Check embedding service
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

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});