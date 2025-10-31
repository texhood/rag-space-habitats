// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./database');

// Configure Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'username' },
  async (username, password, done) => {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      
      if (!rows.length) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [id]
    );
    
    if (!rows.length) {
      return done(new Error('User not found'));
    }
    
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
