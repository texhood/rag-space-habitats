// config/session.js
const session = require('express-session');

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'space-habitats-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'  // ← CRITICAL
  }
};

module.exports = session(sessionConfig);
