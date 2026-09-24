const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./database');
const { requireSessionSecret } = require('./sessionSecret');

const sessionConfig = {
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: requireSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  proxy: process.env.NODE_ENV === 'production'
};

module.exports = session(sessionConfig);
