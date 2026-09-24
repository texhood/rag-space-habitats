import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useAuth } from './useAuth';
import AppNavbar from './AppNavbar';

/**
 * Sign-in form. On success the session user is stored and the query screen opens.
 */
export function LoginForm() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(event) {
    event.preventDefault();
    try {
      const res = await api.post('/api/auth/login', { username, password });
      setUser(res.data.user);
      navigate('/app');
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="App">
      <AppNavbar user={null} />
      <main className="App-main">
      <div className="modal-content auth-page">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <div className="modal-buttons">
            <button type="submit">Login</button>
            <button type="button" onClick={() => navigate('/app')}>Cancel</button>
          </div>
        </form>
      </div>
      </main>
    </div>
  );
}

/**
 * Registration form. On success the new session opens the query screen.
 */
export function RegisterForm() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister(event) {
    event.preventDefault();
    try {
      const res = await api.post('/api/auth/register', { username, password });
      setUser(res.data.user);
      navigate('/app');
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="App">
      <AppNavbar user={null} />
      <main className="App-main">
      <div className="modal-content auth-page">
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <div className="modal-buttons">
            <button type="submit">Register</button>
            <button type="button" onClick={() => navigate('/app')}>Cancel</button>
          </div>
        </form>
      </div>
      </main>
    </div>
  );
}
