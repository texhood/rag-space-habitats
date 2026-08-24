function validateRegistration({ username, password, email } = {}) {
  if (!username || !password) {
    return {
      ok: false,
      status: 400,
      error: 'Missing fields',
      message: 'Username and password are required'
    };
  }

  if (password.length < 6) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid password',
      message: 'Password must be at least 6 characters'
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    };
  }

  return { ok: true };
}

module.exports = { validateRegistration };
