// App.js - With Conversation Support and User Profile
import API_URL from './config';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState('');
  const [, setResponse] = useState('');
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
  const [projectConversations, setProjectConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  // Isolated threads: general Query stays ephemeral; project chats load from the server.
  const [generalHistory, setGeneralHistory] = useState([]);
  const [projectHistory, setProjectHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const projectIdFromUrl = new URLSearchParams(location.search).get('project');
  const conversationHistory = projectIdFromUrl ? projectHistory : generalHistory;
  const canUseProjects = Boolean(
    user && (user.subscription_tier === 'enterprise' || user.role === 'admin')
  );

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
    const urlParams = new URLSearchParams(location.search);
    const showLoginParam = urlParams.get('login');
    const showRegisterParam = urlParams.get('register');

    if (showLoginParam === 'true' && !user) {
      setShowLogin(true);
      navigate('/app', { replace: true });
    } else if (showRegisterParam === 'true' && !user) {
      setShowRegister(true);
      navigate('/app', { replace: true });
    }
  }, [user, location.search, navigate]);

  // Load the project from the URL without mixing in the general Query thread
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const projectId = new URLSearchParams(location.search).get('project');
    let cancelled = false;

    const syncProjectFromUrl = async () => {
      if (!projectId) {
        setActiveProject(null);
        setProjectHistory([]);
        setActiveConversation(null);
        setProjectConversations([]);
        setProjectLoading(false);
        return;
      }

      setProjectLoading(true);
      try {
        const [projectRes, conversationRes, listRes] = await Promise.all([
          axios.get(`${API_URL}/api/projects/${projectId}`, { withCredentials: true }),
          axios.get(`${API_URL}/api/projects/${projectId}/conversation`, {
            withCredentials: true
          }),
          axios.get(`${API_URL}/api/projects/${projectId}/conversations`, {
            withCredentials: true
          })
        ]);

        if (cancelled) return;

        setActiveProject(projectRes.data);
        setProjectHistory(conversationRes.data.messages || []);
        setActiveConversation(conversationRes.data.conversation || null);
        setProjectConversations(listRes.data.conversations || []);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load project conversation:', err);
        alert('Failed to load project: ' + (err.response?.data?.error || err.message));
        setActiveProject(null);
        setProjectHistory([]);
        setActiveConversation(null);
        setProjectConversations([]);
        navigate('/app', { replace: true });
      } finally {
        if (!cancelled) {
          setProjectLoading(false);
        }
      }
    };

    syncProjectFromUrl();
    return () => {
      cancelled = true;
    };
  }, [user, location.search, navigate]);

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

  const closeProject = () => {
    navigate('/app');
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
      setGeneralHistory([]);
      setProjectHistory([]);
      setActiveProject(null);
      setActiveConversation(null);
      setProjectConversations([]);
      navigate('/');
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
    if (!question.trim() || projectLoading) return;

    const inProject = Boolean(projectIdFromUrl);
    const history = inProject ? projectHistory : generalHistory;
    const appendHistory = inProject ? setProjectHistory : setGeneralHistory;

    setLoading(true);

    try {
      const endpoint = inProject
        ? `${API_URL}/api/projects/${projectIdFromUrl}/query`
        : `${API_URL}/api/rag/ask`;

      const res = await axios.post(endpoint, {
        question: question,
        conversationHistory: history
      }, { withCredentials: true });

      appendHistory([
        ...history,
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: res.data.answer,
          queryId: res.data.queryId,
          projectId: inProject ? projectIdFromUrl : null
        }
      ]);

      if (inProject && activeConversation?.messageCount === 0) {
        try {
          const listRes = await axios.get(
            `${API_URL}/api/projects/${projectIdFromUrl}/conversations`,
            { withCredentials: true }
          );
          setProjectConversations(listRes.data.conversations || []);
          const current = (listRes.data.conversations || []).find((c) => !c.archived);
          if (current) setActiveConversation(current);
        } catch (listErr) {
          console.error('Failed to refresh conversations:', listErr);
        }
      }

      setResponse(res.data.answer);
      setQuestion('');

    } catch (err) {
      const errorMsg = 'Error: ' + (err.response?.data?.error || err.message);
      setResponse(errorMsg);
      appendHistory([
        ...history,
        { role: 'user', content: question },
        { role: 'assistant', content: errorMsg, queryId: null, projectId: inProject ? projectIdFromUrl : null }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    if (projectIdFromUrl) {
      if (projectHistory.length > 0) {
        const proceed = window.confirm(
          'Archive this conversation and start a new one? You can reopen it from Previous conversations.'
        );
        if (!proceed) return;
      }
      try {
        const res = await axios.post(
          `${API_URL}/api/projects/${projectIdFromUrl}/conversation`,
          {},
          { withCredentials: true }
        );
        setProjectHistory(res.data.messages || []);
        setActiveConversation(res.data.conversation || null);
        setProjectConversations(res.data.conversations || []);
        setResponse('');
        setQuestion('');
      } catch (err) {
        alert('Failed to start a new conversation: ' + (err.response?.data?.error || err.message));
      }
      return;
    }

    setGeneralHistory([]);
    setResponse('');
    setQuestion('');
  };

  const openSavedConversation = async (conversationId) => {
    if (!projectIdFromUrl || !conversationId) return;
    if (String(conversationId) === String(activeConversation?.id)) return;
    try {
      const res = await axios.post(
        `${API_URL}/api/projects/${projectIdFromUrl}/conversations/${conversationId}/open`,
        {},
        { withCredentials: true }
      );
      setProjectHistory(res.data.messages || []);
      setActiveConversation(res.data.conversation || null);
      setProjectConversations(res.data.conversations || []);
      setResponse('');
    } catch (err) {
      alert('Failed to open conversation: ' + (err.response?.data?.error || err.message));
    }
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
        onShowLogin={setShowLogin}
      />

      <main className="App-main">
        {user ? (
          <>
            {/* PROJECT CONTEXT BANNER */}
            {projectIdFromUrl && (
              <div className="project-context-banner">
                <div className="project-info">
                  <span className="project-badge">Project</span>
                  <div className="project-details">
                    <h3>{activeProject?.name || 'Loading project…'}</h3>
                    {activeProject?.objectives && (
                      <p className="project-objectives">Objectives: {activeProject.objectives}</p>
                    )}
                    <p className="project-persist-note">
                      This conversation is saved with the project and will still be here the next time you sign in.
                    </p>
                  </div>
                </div>
                <button className="close-project-btn" onClick={closeProject} title="Leave project chat">
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
                  Grok
                </button>
                <button
                  className={llmPreference === 'claude' ? 'active' : ''}
                  onClick={() => updateLLMPreference('claude')}
                  disabled={!availableLLMs.claude}
                >
                  Claude
                </button>
                {availableLLMs.grok && availableLLMs.claude && (
                  <button
                    className={llmPreference === 'both' ? 'active' : ''}
                    onClick={() => updateLLMPreference('both')}
                  >
                    Both
                  </button>
                )}
              </div>
              {llmPreference && (
                <span className="llm-current">
                  Current: <strong>{llmPreference.charAt(0).toUpperCase() + llmPreference.slice(1)}</strong>
                </span>
              )}
              
              {/* NEW CONVERSATION BUTTON */}
              {projectIdFromUrl && projectConversations.length > 1 && (
                <label className="conversation-picker">
                  <span>Previous conversations</span>
                  <select
                    value={activeConversation?.id || ''}
                    onChange={(e) => openSavedConversation(e.target.value)}
                    disabled={projectLoading || loading}
                  >
                    {projectConversations.map((conversation) => (
                      <option key={conversation.id} value={conversation.id}>
                        {conversation.archived
                          ? `${conversation.title}`
                          : `${conversation.title} (current)`}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button 
                onClick={startNewConversation}
                className="new-conversation-btn"
                disabled={conversationHistory.length === 0 || projectLoading}
                title={projectIdFromUrl
                  ? 'Archive this thread and start a new one'
                  : 'Start a new conversation'}
              >
                New conversation
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
                      {Math.floor(conversationHistory.length / 2)} exchange{conversationHistory.length > 2 ? 's' : ''}
                    </span>
                    {projectIdFromUrl && (
                      <span className="conversation-saved">Saved with this project</span>
                    )}
                  </div>
                  <div className="conversation-thread">
                    {conversationHistory.map((msg, idx) => (
                      <div key={msg.id || idx}>
                        <div className={`message ${msg.role}`}>
                          <div className="message-role">
                            {msg.role === 'user' ? 'You' : 'Assistant'}
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
                        <div className="message-role">Assistant</div>
                        <div className="message-content">Thinking...</div>
                      </div>
                    )}
                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}

              {/* Empty state when no conversation */}
              {conversationHistory.length === 0 && !loading && !projectLoading && (
                <div className="empty-conversation">
                  {projectIdFromUrl ? (
                    <>
                      <p>Ask a question in this project. Answers use the habitat literature plus this project's brief and documents.</p>
                      <p className="hint">This thread is saved with the project. It will still be here after you sign out.</p>
                    </>
                  ) : (
                    <>
                      <p>Ask a question in English. Answers come from the habitat literature, with sources attached.</p>
                      <p className="hint">Try: "What is the recommended rotation rate for artificial gravity?"</p>
                      <p className="persist-guidance">
                        Query chats are only kept for this session.{' '}
                        {canUseProjects ? (
                          <>
                            Create a{' '}
                            <button type="button" className="inline-link" onClick={() => navigate('/projects')}>
                              project
                            </button>
                            {' '}if you want the conversation to persist.
                          </>
                        ) : (
                          <>
                            Create a project if you want conversations to persist.{' '}
                            <button type="button" className="inline-link" onClick={() => setShowPricing(true)}>
                              Enterprise
                            </button>
                            {' '}includes projects.
                          </>
                        )}
                      </p>
                    </>
                  )}
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
                  disabled={loading || projectLoading}
                />
                <button type="submit" disabled={loading || projectLoading} className="ask-button">
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
              <button type="button" onClick={() => setShowLogin(true)} className="btn-primary">
                Login
              </button>
              <button type="button" onClick={() => setShowRegister(true)} className="btn-secondary">
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