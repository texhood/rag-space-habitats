import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './index.css';
import AdminPanel from './AdminPanel';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', email: '' });
  const [isLogin, setIsLogin] = useState(true);
  // const [preprocessStatus, setPreprocessStatus] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [llmPreference, setLlmPreference] = useState('grok');
  const [availableLLMs, setAvailableLLMs] = useState({ grok: true, claude: false });

    // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Check auth on mount
  useEffect(() => {
    axios.get('http://localhost:5000/me', { withCredentials: true })
      .then(res => {
        setUser(res.data.user);
        setShowLogin(false);
      })
      .catch(() => {
        setUser(null);
        setShowLogin(true);
      });
  }, []);

  // Load user settings when authenticated
  useEffect(() => {
    if (user) {
      axios.get('http://localhost:5000/api/auth/settings', { withCredentials: true })
        .then(res => {
          setLlmPreference(res.data.llm_preference);
          setAvailableLLMs(res.data.available_llms);
        })
        .catch(err => console.error('Failed to load settings:', err));
    }
  }, [user]);

  const handleAuth = async () => {
    if (!form.username || !form.password) {
      alert('Please enter username and password');
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await axios.post(`http://localhost:5000${endpoint}`, form, { withCredentials: true });
      
      if (endpoint === '/api/auth/register') {
        // Registration successful - just switch to login, DON'T fetch user
        alert(response.data.message || 'Registration successful! Please login.');
        setIsLogin(true); // Switch to login form
        setForm({ username: form.username, password: '', email: '' }); // Keep username, clear password and email
      } else {
        // Login successful - NOW fetch user data
        try {
          const res = await axios.get('http://localhost:5000/api/auth/me', { withCredentials: true });
          setUser(res.data.user);
          setShowLogin(false);
        } catch (err) {
          console.error('Failed to fetch user after login:', err);
          alert('Login successful but failed to load user data. Please refresh the page.');
        }
      }
    } catch (err) {
      const errorData = err.response?.data;
      
      // User already exists - redirect to login
      if (errorData?.shouldRedirectToLogin) {
        alert(errorData.message);
        setIsLogin(true);
      } else {
        alert(errorData?.message || errorData?.error || 'Authentication failed');
      }
    }
  };

  const logout = () => {
    axios.post('http://localhost:5000/logout', {}, { withCredentials: true })
      .then(() => {
        setUser(null);
        setShowLogin(true);
        setShowAdminPanel(false);
      });
  };

  const updateLLMPreference = async (preference) => {
    try {
      console.log('Updating LLM preference to:', preference);
      const response = await axios.post(
        'http://localhost:5000/api/auth/settings/llm',
        { preference },
        { withCredentials: true }
      );
      console.log('Update response:', response.data);
      setLlmPreference(preference);
    } catch (err) {
      console.error('Failed to update LLM preference:', err);
      alert('Failed to update LLM preference: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      alert('Please enter your email address');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/forgot-password',
        { email: forgotPasswordEmail },
        { withCredentials: true }
      );
      alert(response.data.message);
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
      setIsLogin(true); // Go back to login
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reset email');
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await axios.post('http://localhost:5000/ask', { question }, { withCredentials: true });
      setAnswer(res.data.answer);
    } catch (err) {
      setAnswer(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // const runPreprocess = async () => {
  //   setPreprocessStatus('Starting preprocessing...');
  //   try {
  //     const res = await axios.post('http://localhost:5000/admin/preprocess', {}, { withCredentials: true });
  //     setPreprocessStatus(res.data.message);
  //   } catch (err) {
  //     setPreprocessStatus(`Error: ${err.response?.data?.error || err.message}`);
  //   }
  // };

    // === FORGOT PASSWORD SCREEN ===
  if (showForgotPassword) {
    return (
      <div className="App">
        <h1>Space Habitats RAG</h1>
        <div className="auth">
          <h2>Reset Password</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <input
            type="email"
            placeholder="Email address"
            value={forgotPasswordEmail}
            onChange={e => setForgotPasswordEmail(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleForgotPassword()}
          />
          <button onClick={handleForgotPassword}>Send Reset Link</button>
          <p 
            onClick={() => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            }}
            style={{ cursor: 'pointer', color: '#667eea', marginTop: '15px' }}
          >
            ← Back to login
          </p>
        </div>
      </div>
    );
  }

  // === LOGIN / REGISTER SCREEN ===
  if (showLogin) {
    return (
      <div className="App">
        <h1>Space Habitats RAG</h1>
        <div className="auth">
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <input
            placeholder="Username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            onKeyPress={e => e.key === 'Enter' && handleAuth()}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyPress={e => e.key === 'Enter' && handleAuth()}
          />
          {!isLogin && (
            <input
              type="email"
              placeholder="Email (optional, for password reset)"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyPress={e => e.key === 'Enter' && handleAuth()}
            />
          )}
          <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
          
          {isLogin && (
            <p 
              onClick={() => setShowForgotPassword(true)} 
              style={{ 
                cursor: 'pointer', 
                color: '#667eea', 
                fontSize: '14px', 
                marginTop: '10px',
                textDecoration: 'underline'
              }}
            >
              Forgot password?
            </p>
          )}
          
          <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: 'pointer', color: '#667eea', marginTop: '15px' }}>
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </p>
        </div>
      </div>
    );
  }

  // === MAIN APP ===
  return (
    <div className="App">
      <h1>Space Habitats Q&A</h1>
      <p>
        Welcome, <strong>{user.username}</strong> ({user.role})
        {' '}
        <button onClick={logout}>Logout</button>
        {user.role === 'admin' && (
          <>
            {' '}
            <button onClick={() => setShowAdminPanel(true)} className="admin-btn">
              🛠️ Admin Panel
            </button>
          </>
        )}
      </p>

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

      <div className="input-group">
        <input
          type="text"
          placeholder="Ask about space habitats..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && ask()}
        />
        <button onClick={ask} disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>

      {loading && <p className="loading">Searching the cosmos...</p>}

      {answer && (
        <div className="answer">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {answer}
          </ReactMarkdown>
        </div>
      )}

      {/* ADMIN PANEL MODAL */}
      {showAdminPanel && user.role === 'admin' && (
        <AdminPanel 
          user={user} 
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
}

export default App;