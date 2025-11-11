// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AdminPanel from './AdminPanel';
//import SubmitContent from './SubmitContent';
import PricingPage from './PricingPage';

function App() {
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  //const [showSubmit, setShowSubmit] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Check for successful checkout and refresh user data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const tier = urlParams.get('tier');

    if (checkoutStatus === 'success') {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      alert(`🎉 Successfully upgraded to ${tier} tier! Your account has been updated.`);
      
      // Refresh user data from server
      checkAuth();
    } else if (checkoutStatus === 'cancelled') {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      alert('Checkout was cancelled. You can upgrade anytime!');
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        withCredentials: true
      });
      console.log('[Auth] User data:', res.data.user); // ADD THIS LINE FOR DEBUG
      setUser(res.data.user);
    } catch (err) {
      console.log('[Auth] Not authenticated'); // ADD THIS LINE FOR DEBUG
      setUser(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username: loginUsername,
        password: loginPassword
      }, { withCredentials: true });

      setUser(res.data.user);
      setShowLogin(false);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        username: registerUsername,
        password: registerPassword
      }, { withCredentials: true });

      setUser(res.data.user);
      setShowRegister(false);
      setRegisterUsername('');
      setRegisterPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, {
        withCredentials: true
      });
      setUser(null);
      setResponse('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await axios.post('http://localhost:5000/api/rag/ask', {
        question: question
      }, { withCredentials: true });

      setResponse(res.data.answer);
    } catch (err) {
      setResponse('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🚀 Space Habitats RAG System</h1>
<div className="auth-section">
            {user ? (
              <>
                <span>Welcome, {user.username}!</span>
                <button 
                  onClick={() => setShowPricing(true)}
                  className="upgrade-btn"
                  style={{ marginLeft: '15px' }}
                >
                  ⚡ Upgrade
                </button>
                {user.role === 'admin' && (
                  <button onClick={() => setShowAdmin(true)} style={{ marginLeft: '10px' }}>
                    Admin Panel
                  </button>
                )}
                <button onClick={handleLogout} style={{ marginLeft: '10px' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)}>Login</button>
                <button onClick={() => setShowRegister(true)} style={{ marginLeft: '10px' }}>
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="App-main">
        {user ? (
          <>
            <div className="chat-container">
              <form onSubmit={handleAsk} className="question-form">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about space habitats..."
                  className="question-input"
                  disabled={loading}
                />
                <button type="submit" disabled={loading} className="ask-button">
                  {loading ? 'Thinking...' : 'Ask'}
                </button>
              </form>

              {response && (
                <div className="response-container">
                  <h3>Response:</h3>
                  <div className="response-text">
                    {response}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="welcome-message">
            <h2>Welcome to the Space Habitats Knowledge Base</h2>
            <p>Please login or register to ask questions.</p>
          </div>
        )}
      </main>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Username"
                required
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <div className="modal-buttons">
                <button type="submit">Login</button>
                <button type="button" onClick={() => setShowLogin(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <input
                type="text"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                placeholder="Username"
                required
              />
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <div className="modal-buttons">
                <button type="submit">Register</button>
                <button type="button" onClick={() => setShowRegister(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdmin && user?.role === 'admin' && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {showPricing && (
        <PricingPage 
          user={user} 
          onClose={() => setShowPricing(false)} 
        />
      )}
    </div>
  );
}

export default App;