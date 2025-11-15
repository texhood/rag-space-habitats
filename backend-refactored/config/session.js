// config/session.js
const session = require('express-session');

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'space-habitats-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined  // Let browser handle it
  },
  proxy: process.env.NODE_ENV === 'production'  // ADD THIS - trust Railway proxy
};

module.exports = session(sessionConfig);
