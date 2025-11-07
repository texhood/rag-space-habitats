// server.js - Main application entry point (WITHOUT AdminJS)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const sessionMiddleware = require('./config/session');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const mongoClient = require('./config/mongodb');

// Import routes
const authRoutes = require('./routes/auth');
const ragRoutes = require('./routes/rag');
const adminRoutes = require('./routes/admin');
const submissionRoutes = require('./routes/submissions');

// Initialize Express
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
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin', adminRoutes);

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

app.use('/api/submissions', submissionRoutes);

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

// Initialize MongoDB connection
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();

// app.listen(PORT, () => {
//   console.log('=================================');
//   console.log('🚀 Space Habitats RAG Server');
//   console.log('=================================');
//   console.log(`📡 Server: http://localhost:${PORT}`);
//   console.log(`🎨 Frontend: http://localhost:3000`);
//   console.log('=================================');
//   console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`LLM: ${process.env.ANTHROPIC_API_KEY ? 'Claude' : process.env.XAI_API_KEY ? 'Grok' : 'None'}`);
//   console.log('=================================');
//   console.log('');
//   console.log('📊 Admin API Endpoints Available:');
//   console.log('   GET    /api/admin/users       - List users');
//   console.log('   GET    /api/admin/analytics   - View analytics');
//   console.log('   PATCH  /api/admin/users/:id/role - Update role');
//   console.log('   DELETE /api/admin/users/:id   - Delete user');
//   console.log('=================================');
// });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
