import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './index.css';
import AdminPanel from './AdminPanel';
import API_URL from './config';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [preprocessStatus, setPreprocessStatus] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Check auth on mount
  useEffect(() => {
    axios.get(`${API_URL}/me', { withCredentials: true })
      .then(res => {
        setUser(res.data.user);
        setShowLogin(false);
      })
      .catch(() => {
        setUser(null);
        setShowLogin(true);
      });
  }, []);

  const handleAuth = async () => {
    const endpoint = isLogin ? '/login' : '/register';
    try {
      await axios.post(`http://localhost:5000${endpoint}`, form, { withCredentials: true });
      const res = await axios.get(`${API_URL}/me', { withCredentials: true });
      setUser(res.data.user);
      setShowLogin(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication failed');
    }
  };

  const logout = () => {
    axios.post(`${API_URL}/logout', {}, { withCredentials: true })
      .then(() => {
        setUser(null);
        setShowLogin(true);
        setShowAdminPanel(false);
      });
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await axios.post(`${API_URL}/ask', { question }, { withCredentials: true });
      setAnswer(res.data.answer);
    } catch (err) {
      setAnswer(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runPreprocess = async () => {
    setPreprocessStatus('Starting preprocessing...');
    try {
      const res = await axios.post(`${API_URL}/admin/preprocess', {}, { withCredentials: true });
      setPreprocessStatus(res.data.message);
    } catch (err) {
      setPreprocessStatus(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

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
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
          <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: 'pointer', color: 'blue' }}>
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

      {/* SIMPLE ADMIN TOOLS (kept for backward compatibility) */}
      {user.role === 'admin' && !showAdminPanel && (
        <div className="admin-panel-legacy">
          <h3>Quick Admin Tools</h3>
          <button onClick={runPreprocess} disabled={preprocessStatus.includes('Starting')}>
            Run Preprocessing
          </button>
          {preprocessStatus && <p>{preprocessStatus}</p>}
        </div>
      )}

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
