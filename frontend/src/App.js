import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './index.css';
import AdminPanel from './AdminPanel';

function App() {
  // User and authentication state
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', email: '' });
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  
  // Question/Answer state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // LLM preference state
  const [llmPreference, setLlmPreference] = useState('grok');
  const [availableLLMs, setAvailableLLMs] = useState({ grok: true, claude: false });

  // Document submission state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionForm, setSubmissionForm] = useState({
    title: '',
    description: '',
    content: '',
    tags: '',
    category: 'habitat-design',
    uploadMethod: 'text' // 'text' or 'file'
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/auth/me', { withCredentials: true })
      .then(res => {
        setUser(res.data.user);
        setShowLogin(false);
      })
      .catch(() => {
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

  // Handle authentication (login/register)
  const handleAuth = async () => {
    if (!form.username || !form.password) {
      alert('Please enter username and password');
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await axios.post(`http://localhost:5000${endpoint}`, form, { withCredentials: true });
      
      if (endpoint === '/api/auth/register') {
        alert(response.data.message || 'Registration successful! Please login.');
        setIsLogin(true);
        setForm({ username: form.username, password: '', email: '' });
      } else {
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
      
      if (errorData?.shouldRedirectToLogin) {
        alert(errorData.message);
        setIsLogin(true);
      } else {
        alert(errorData?.message || errorData?.error || 'Authentication failed');
      }
    }
  };

  // Update LLM preference
  const updateLLMPreference = async (preference) => {
    try {
      await axios.post(
        'http://localhost:5000/api/auth/settings/llm',
        { preference },
        { withCredentials: true }
      );
      setLlmPreference(preference);
    } catch (err) {
      alert('Failed to update LLM preference: ' + (err.response?.data?.error || err.message));
    }
  };

  // Handle forgot password
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
      setIsLogin(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reset email');
    }
  };

  // Logout
  const logout = () => {
    axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true })
      .then(() => {
        setUser(null);
        setShowLogin(true);
      })
      .catch(err => console.error('Logout error:', err));
  };

  // Ask question
  const ask = async () => {
    if (!question.trim()) {
      alert('Please enter a question');
      return;
    }

    setLoading(true);
    setAnswer('');

    try {
      const res = await axios.post(
        'http://localhost:5000/api/rag/ask',
        { question },
        { withCredentials: true }
      );
      setAnswer(res.data.answer);
    } catch (err) {
      console.error('Ask error:', err);
      alert(err.response?.data?.error || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all submissions
  const fetchSubmissions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/submissions', {
        withCredentials: true
      });
      setSubmissions(response.data.submissions || []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      alert('Failed to load submissions');
    }
  };

  // Submit new document
  const handleSubmitDocument = async () => {
    // Validate based on upload method
    if (submissionForm.uploadMethod === 'text') {
      if (!submissionForm.title || !submissionForm.content) {
        alert('Title and content are required');
        return;
      }
    } else {
      if (!selectedFile) {
        alert('Please select a file to upload');
        return;
      }
    }

    try {
      const formData = new FormData();
      
      if (submissionForm.uploadMethod === 'file' && selectedFile) {
        // File upload
        formData.append('file', selectedFile);
        formData.append('title', submissionForm.title || selectedFile.name);
        formData.append('description', submissionForm.description);
        formData.append('category', submissionForm.category);
        
        const tagsArray = submissionForm.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        formData.append('tags', tagsArray.join(','));
        
      } else {
        // Text submission
        const tagsArray = submissionForm.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);

        formData.append('title', submissionForm.title);
        formData.append('description', submissionForm.description);
        formData.append('content', submissionForm.content);
        formData.append('category', submissionForm.category);
        formData.append('tags', tagsArray.join(','));
      }

      const response = await axios.post(
        'http://localhost:5000/api/submissions',
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const fileInfo = response.data.file_info;
      const message = fileInfo 
        ? `Document uploaded successfully! Extracted ${response.data.extracted_length} characters from ${fileInfo.sizeReadable} file.`
        : 'Document submitted successfully!';
      
      alert(message + ' It will be reviewed by admins.');
      
      setShowSubmitForm(false);
      setSubmissionForm({
        title: '',
        description: '',
        content: '',
        tags: '',
        category: 'habitat-design',
        uploadMethod: 'text'
      });
      setSelectedFile(null);
      fetchSubmissions();
    } catch (err) {
      console.error('Submission error:', err);
      alert(err.response?.data?.error || err.response?.data?.details || 'Failed to submit document');
    }
  };

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

  // === SUBMIT DOCUMENT FORM ===
  if (showSubmitForm) {
    return (
      <div className="App">
        <h1>Submit Document</h1>
        <div className="submit-form">
          <button 
            onClick={() => {
              setShowSubmitForm(false);
              setSelectedFile(null);
            }}
            style={{ marginBottom: '20px' }}
          >
            ← Back
          </button>

          {/* Upload Method Selector */}
          <div className="upload-method-selector">
            <label>
              <input
                type="radio"
                name="uploadMethod"
                value="text"
                checked={submissionForm.uploadMethod === 'text'}
                onChange={() => setSubmissionForm({ ...submissionForm, uploadMethod: 'text' })}
              />
              <span>Type or Paste Text</span>
            </label>
            <label>
              <input
                type="radio"
                name="uploadMethod"
                value="file"
                checked={submissionForm.uploadMethod === 'file'}
                onChange={() => setSubmissionForm({ ...submissionForm, uploadMethod: 'file' })}
              />
              <span>Upload File (PDF, Word, TXT)</span>
            </label>
          </div>

          {/* File Upload Section */}
          {submissionForm.uploadMethod === 'file' ? (
            <>
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const sizeMB = file.size / 1024 / 1024;
                      if (sizeMB > 500) {
                        alert(`File is ${sizeMB.toFixed(2)}MB. Maximum size is 500MB. Please choose a smaller file.`);
                        e.target.value = null;
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                  id="file-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  {selectedFile ? (
                    <div>
                      <strong>📄 {selectedFile.name}</strong>
                      <br />
                      <small>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</small>
                      {selectedFile.size > 500 * 1024 * 1024 && (
                        <div style={{ color: 'red', marginTop: '5px' }}>
                          ⚠️ File exceeds 500MB limit
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <strong>Click to select file</strong>
                      <br />
                      <small>Accepts: PDF, Word (.docx, .doc), TXT</small>
                      <br />
                      <small style={{ color: '#888' }}>Maximum size: 100MB</small>
                    </div>
                  )}
                </label>
                {selectedFile && (
                  <button 
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{ marginTop: '10px' }}
                  >
                    Remove File
                  </button>
                )}
              </div>

              <input
                placeholder="Document Title (optional - will use filename)"
                value={submissionForm.title}
                onChange={e => setSubmissionForm({ ...submissionForm, title: e.target.value })}
              />
            </>
          ) : (
            <>
              {/* Text Input Section */}
              <input
                placeholder="Document Title"
                value={submissionForm.title}
                onChange={e => setSubmissionForm({ ...submissionForm, title: e.target.value })}
              />

              <textarea
                placeholder="Document Content"
                value={submissionForm.content}
                onChange={e => setSubmissionForm({ ...submissionForm, content: e.target.value })}
                rows="15"
              />
            </>
          )}

          <textarea
            placeholder="Description (optional)"
            value={submissionForm.description}
            onChange={e => setSubmissionForm({ ...submissionForm, description: e.target.value })}
            rows="3"
          />

          <input
            placeholder="Tags (comma-separated, e.g., o-neill-cylinder, rotation, gravity)"
            value={submissionForm.tags}
            onChange={e => setSubmissionForm({ ...submissionForm, tags: e.target.value })}
          />

          <select
            value={submissionForm.category}
            onChange={e => setSubmissionForm({ ...submissionForm, category: e.target.value })}
          >
            <option value="habitat-design">Habitat Design</option>
            <option value="engineering">Engineering</option>
            <option value="life-support">Life Support</option>
            <option value="radiation-shielding">Radiation Shielding</option>
            <option value="agriculture">Agriculture</option>
            <option value="propulsion">Propulsion</option>
            <option value="materials">Materials</option>
            <option value="economics">Economics</option>
            <option value="general">General</option>
          </select>

          <button 
            onClick={handleSubmitDocument}
            className="submit-btn"
          >
            📤 {submissionForm.uploadMethod === 'file' ? 'Upload & Submit' : 'Submit for Review'}
          </button>
        </div>
      </div>
    );
  }

  // === VIEW SUBMISSIONS ===
  if (showSubmissions) {
    return (
      <div className="App">
        <h1>Document Submissions</h1>
        <div className="submissions-container">
          <button 
            onClick={() => setShowSubmissions(false)}
            style={{ marginBottom: '20px' }}
          >
            ← Back to App
          </button>

          {submissions.length === 0 ? (
            <p>No submissions yet.</p>
          ) : (
            <div className="submissions-list">
              {submissions.map(sub => (
                <div key={sub._id} className="submission-card">
                  <div className="submission-header">
                    <h3>{sub.title}</h3>
                    <span className={`status-badge status-${sub.status}`}>
                      {sub.status}
                    </span>
                  </div>
                  
                  {sub.description && (
                    <p className="submission-description">{sub.description}</p>
                  )}
                  
                  <div className="submission-meta">
                    <span>👤 {sub.submitted_by_username}</span>
                    <span>📅 {new Date(sub.submitted_at).toLocaleDateString()}</span>
                    <span>📁 {sub.category}</span>
                  </div>
                  
                  {sub.tags && sub.tags.length > 0 && (
                    <div className="submission-tags">
                      {sub.tags.map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className="submission-votes">
                    <span>👍 {sub.upvotes || 0}</span>
                    <span>👎 {sub.downvotes || 0}</span>
                  </div>
                  
                  <details>
                    <summary>View Content</summary>
                    <div className="submission-content">
                      {sub.content}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === ADMIN PANEL ===
  if (showAdminPanel && user?.role === 'admin') {
    return <AdminPanel onClose={() => setShowAdminPanel(false)} />;
  }

  // === MAIN APP ===
  return (
    <div className="App">
      <h1>Space Habitats RAG</h1>

      {/* USER INFO */}
      <p>
        Welcome, <strong>{user.username}</strong> ({user.role})
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

      {/* DOCUMENT ACTIONS */}
      <div className="document-actions">
        <button 
          onClick={() => {
            setShowSubmissions(true);
            fetchSubmissions();
          }}
          className="action-btn view-submissions"
        >
          📚 View Submissions
        </button>
        <button 
          onClick={() => setShowSubmitForm(true)}
          className="action-btn submit-document"
        >
          ➕ Submit Document
        </button>
      </div>

      {/* QUESTION INPUT */}
      <div className="input-group">
        <input
          placeholder="Ask about space habitats..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !loading && ask()}
        />
        <button onClick={ask} disabled={loading}>
          {loading ? 'Loading...' : 'Ask'}
        </button>
      </div>

      {/* ANSWER */}
      {loading && <p className="loading">Generating answer...</p>}
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
    </div>
  );
}

export default App;