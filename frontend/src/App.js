// App.js - With Conversation Support and User Profile
import API_URL from './config';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import AdminPanel from './AdminPanel';
import SubmitContent from './SubmitContent';
import PricingPage from './PricingPage';
import UserProfile from './UserProfile';
import LandingPage from './LandingPage';
import AppNavbar from './AppNavbar';
import BrowseKnowledgeBase from './BrowseKnowledgeBase';
import ProjectsPage from './ProjectsPage';
import ProjectWorkspace from './ProjectWorkspace';
import './AppNavbar.css';
import './BrowseKnowledgeBase.css';
import './ProjectList.css';
import FeedbackPanel from './FeedbackPanel';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Main dashboard component (the existing app functionality)
function Dashboard() {
  const navigate = useNavigate();
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
  const [showProfile, setShowProfile] = useState(false);
  
  // LLM preference state
  const [llmPreference, setLlmPreference] = useState('grok');
  const [availableLLMs, setAvailableLLMs] = useState({ grok: true, claude: false });

  // =====================
  // PROJECT CONTEXT STATE
  // =====================
  const [activeProject, setActiveProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);

  // =====================
  // CONVERSATION STATE
  // =====================
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

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
    const profileParam = urlParams.get('profile');

    if (checkoutStatus === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`🎉 Successfully upgraded to ${tier} tier! Your account has been updated.`);
      checkAuth();
    } else if (checkoutStatus === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Checkout was cancelled. You can upgrade anytime!');
    }

    // Open profile if returning from Stripe billing portal
    if (profileParam === 'billing') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setShowProfile(true);
    }
  }, []);

  // Check for login/register query params (from landing page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showLoginParam = urlParams.get('login');
    const showRegisterParam = urlParams.get('register');

    if (showLoginParam === 'true' && !user) {
      setShowLogin(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (showRegisterParam === 'true' && !user) {
      setShowRegister(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Check for project parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');

    if (projectId && user) {
      loadProject(projectId);
    } else {
      setActiveProject(null);
    }
  }, [user]);

  const loadProject = async (projectId) => {
    setProjectLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/projects/${projectId}`, {
        withCredentials: true
      });
      setActiveProject(res.data);
    } catch (err) {
      console.error('Failed to load project:', err);
      alert('Failed to load project: ' + (err.response?.data?.error || err.message));
      setActiveProject(null);
    } finally {
      setProjectLoading(false);
    }
  };

  const closeProject = () => {
    setActiveProject(null);
    window.history.replaceState({}, document.title, '/app');
    navigate('/app');
  };

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
      setConversationHistory([]); // Clear conversation on logout
      navigate('/'); // Redirect to landing page after logout
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

  // =====================
  // UPDATED handleAsk WITH CONVERSATION HISTORY & PROJECT CONTEXT
  // =====================
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);

    try {
      // Use project-specific endpoint if project is active, otherwise use general RAG endpoint
      const endpoint = activeProject
        ? `${API_URL}/api/projects/${activeProject.id}/query`
        : `${API_URL}/api/rag/ask`;

      const res = await axios.post(endpoint, {
        question: question,
        conversationHistory: conversationHistory  // Send conversation history
      }, { withCredentials: true });

      // Add this exchange to history (include queryId for feedback)
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: res.data.answer,
          queryId: res.data.queryId,  // Include queryId for feedback system
          projectId: activeProject?.id  // Track which project this query was from
        }
      ];
      setConversationHistory(newHistory);

      // Keep response for backward compatibility
      setResponse(res.data.answer);

      // Clear input for next question
      setQuestion('');

    } catch (err) {
      const errorMsg = 'Error: ' + (err.response?.data?.error || err.message);
      setResponse(errorMsg);
      // Also add error to conversation (no queryId for errors)
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: errorMsg, queryId: null, projectId: activeProject?.id }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // Start New Conversation
  // =====================
  const startNewConversation = () => {
    setConversationHistory([]);
    setResponse('');
    setQuestion('');
  };

  // =====================
  // Handle user update from profile
  // =====================
  const handleUserUpdate = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  return (
    <div className="App">
      {/* AppNavbar replaces the old header */}
      <AppNavbar 
        user={user}
        onLogout={handleLogout}
        onShowAdmin={setShowAdmin}
        onShowSubmit={setShowSubmit}
        onShowPricing={setShowPricing}
        onShowProfile={setShowProfile}
      />

      <main className="App-main">
        {user ? (
          <>
            {/* PROJECT CONTEXT BANNER */}
            {activeProject && (
              <div className="project-context-banner">
                <div className="project-info">
                  <span className="project-badge">📁 Project Active</span>
                  <div className="project-details">
                    <h3>{activeProject.name}</h3>
                    {activeProject.objectives && (
                      <p className="project-objectives">Objectives: {activeProject.objectives}</p>
                    )}
                  </div>
                </div>
                <button className="close-project-btn" onClick={closeProject} title="Close project">
                  ✕
                </button>
              </div>
            )}

            {/* LLM SELECTOR + NEW CONVERSATION BUTTON */}
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
              
              {/* NEW CONVERSATION BUTTON */}
              <button 
                onClick={startNewConversation}
                className="new-conversation-btn"
                disabled={conversationHistory.length === 0}
                title="Start a new conversation"
              >
                🔄 New Conversation
              </button>
            </div>

            <div className="chat-container">
              {/* ===================== */}
              {/* CONVERSATION DISPLAY */}
              {/* ===================== */}
              {conversationHistory.length > 0 && (
                <div className="conversation-container">
                  <div className="conversation-header">
                    <span className="conversation-stats">
                      {conversationHistory.length / 2} exchange{conversationHistory.length > 2 ? 's' : ''}
                    </span>
                  </div>
                  <div className="conversation-thread">
                    {conversationHistory.map((msg, idx) => (
                      <div key={idx}>
                        <div className={`message ${msg.role}`}>
                          <div className="message-role">
                            {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
                          </div>
                          <div className="message-content">
                            {msg.role === 'assistant' ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            ) : (
                              <p>{msg.content}</p>
                            )}
                          </div>
                        </div>

                        {/* Add feedback panel below assistant responses */}
                        {msg.role === 'assistant' && msg.queryId && (
                          <FeedbackPanel
                            queryId={msg.queryId}
                            onFeedbackSubmitted={() => {
                              // Optional: Could refresh stats or show confirmation
                            }}
                          />
                        )}
                      </div>
                    ))}
                    {/* Loading indicator */}
                    {loading && (
                      <div className="message assistant loading">
                        <div className="message-role">🤖 Assistant</div>
                        <div className="message-content">Thinking...</div>
                      </div>
                    )}
                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}

              {/* Empty state when no conversation */}
              {conversationHistory.length === 0 && !loading && (
                <div className="empty-conversation">
                  <p>🚀 Ask a question about space habitats to start a conversation.</p>
                  <p className="hint">Try: "What is the recommended rotation rate for artificial gravity?"</p>
                </div>
              )}

              {/* Question input form */}
              <form onSubmit={handleAsk} className="question-form">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={conversationHistory.length > 0 ? "Ask a follow-up question..." : "Ask about space habitats..."}
                  className="question-input"
                  disabled={loading}
                />
                <button type="submit" disabled={loading} className="ask-button">
                  {loading ? 'Thinking...' : 'Ask'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="welcome-message">
            <h2>Welcome to the Space Habitats Knowledge Base</h2>
            <p>Please login or register to ask questions.</p>
            <div className="welcome-buttons">
              <button onClick={() => setShowLogin(true)} className="btn-primary">
                Login
              </button>
              <button onClick={() => setShowRegister(true)} className="btn-secondary">
                Register
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Login Modal */}
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

      {/* Register Modal */}
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

      {/* Admin Panel Modal */}
      {showAdmin && user?.role === 'admin' && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {/* Submit Content Modal */}
      {showSubmit && (
        <SubmitContent 
          user={user}
          onClose={() => setShowSubmit(false)}
        />
      )}

      {/* Pricing Page Modal */}
      {showPricing && (
        <PricingPage
          user={user}
          onClose={() => setShowPricing(false)}
        />
      )}

      {/* User Profile Modal */}
      {showProfile && (
        <UserProfile
          user={user}
          onClose={() => setShowProfile(false)}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
}

// Root App component with Router
function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page as home */}
        <Route path="/" element={<LandingPage />} />

        {/* Main application dashboard */}
        <Route path="/app" element={<Dashboard />} />

        {/* Browse knowledge base */}
        <Route path="/browse" element={<BrowseKnowledgeBase />} />

        {/* Projects (Enterprise users and admins only) */}
        <Route path="/projects" element={<ProjectsPage />} />

        {/* Individual project workspace */}
        <Route path="/projects/:id" element={<ProjectWorkspace />} />

        {/* Redirect old routes to new structure */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;