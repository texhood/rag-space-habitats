// App.js
import API_URL from './config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AdminPanel from './AdminPanel';
import SubmitContent from './SubmitContent';
import PricingPage from './PricingPage';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  
  // LLM preference state
  const [llmPreference, setLlmPreference] = useState('grok');
  const [availableLLMs, setAvailableLLMs] = useState({ grok: true, claude: false });

  useEffect(() => {
    checkAuth();
  }, []);

  // Load user settings when authenticated
  useEffect(() => {
    if (user) {
      console.log('Loading user settings...');
      axios.get(`${API_URL}/api/auth/settings`, { withCredentials: true })
        .then(res => {
          console.log('Settings loaded:', res.data);
          setLlmPreference(res.data.llm_preference);
          setAvailableLLMs(res.data.available_llms);
        })
        .catch(err => {
          console.error('Failed to load settings:', err);
          // Set defaults if loading fails
          setLlmPreference('grok');
          setAvailableLLMs({ grok: true, claude: false });
        });
    }
  }, [user]);

  // Check for successful checkout and refresh user data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const tier = urlParams.get('tier');

    if (checkoutStatus === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`🎉 Successfully upgraded to ${tier} tier! Your account has been updated.`);
      checkAuth();
    } else if (checkoutStatus === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Checkout was cancelled. You can upgrade anytime!');
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true
      });
      setUser(res.data.user);
    } catch (err) {
      setUser(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
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
      const res = await axios.post(`${API_URL}/api/auth/register`, {
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
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      setUser(null);
      setResponse('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateLLMPreference = async (preference) => {
    try {
      console.log('Updating LLM preference to:', preference);
      const updateResponse = await axios.post(
        `${API_URL}/api/auth/settings/llm`,
        { preference },
        { withCredentials: true }
      );
      console.log('Update response:', updateResponse.data);
      setLlmPreference(preference);
    } catch (err) {
      console.error('Failed to update LLM preference:', err);
      alert('Failed to update LLM preference: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await axios.post(`${API_URL}/api/rag/ask`, {
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
                <button
                  onClick={() => setShowSubmit(true)}
                  style={{ marginLeft: '10px' }}
                >
                  📤 Submit Content
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
            {/* LLM SELECTOR */}
            <div className="llm-selector">
              <label>AI Model:</label>
              <div className="llm-options">
                <button
                  className={llmPreference === 'grok' ? 'active' : ''}
                  onClick={() => updateLLMPreference('grok')}
                  disabled={!availableLLMs.grok}
                >
                  🔵 Grok
                </button>
                <button
                  className={llmPreference === 'claude' ? 'active' : ''}
                  onClick={() => updateLLMPreference('claude')}
                  disabled={!availableLLMs.claude}
                >
                  🟣 Claude
                </button>
                {availableLLMs.grok && availableLLMs.claude && (
                  <button
                    className={llmPreference === 'both' ? 'active' : ''}
                    onClick={() => updateLLMPreference('both')}
                  >
                    🤖 Both
                  </button>
                )}
              </div>
              {llmPreference && (
                <span className="llm-current">
                  Current: <strong>{llmPreference.charAt(0).toUpperCase() + llmPreference.slice(1)}</strong>
                </span>
              )}
            </div>

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
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {response}
                    </ReactMarkdown>
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

      {showSubmit && (
        <SubmitContent 
          user={user}
          onClose={() => setShowSubmit(false)}
        />
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