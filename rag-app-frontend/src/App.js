import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './index.css';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/me', { withCredentials: true })
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null));
  }, []);

  const handleAuth = async () => {
    const endpoint = isLogin ? '/login' : '/register';
    try {
      await axios.post(`http://localhost:5000${endpoint}`, form, { withCredentials: true });
      const res = await axios.get('http://localhost:5000/me', { withCredentials: true });
      setUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.error || 'Auth failed');
    }
  };

  const logout = () => {
    axios.post('http://localhost:5000/logout', {}, { withCredentials: true })
      .then(() => setUser(null));
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

  if (!user) {
    return (
      <div className="App">
        <h1>Space Habitats RAG</h1>
        <div className="auth">
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
          <p onClick={() => setIsLogin(!isLogin)} style={{cursor: 'pointer', color: 'blue'}}>
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Space Habitats Q&A</h1>
      <p>Welcome, {user.username}! <button onClick={logout}>Logout</button></p>

      <div className="input-group">
        <input
          type="text"
          placeholder="Ask about space habitats..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && ask()}
        />
        <button onClick={ask} disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>

      {loading && <p className="loading">Searching the cosmos...</p>}

      {answer && (
        <div className="answer">
          <strong>Answer:</strong>
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default App;