import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import AppNavbar from './AppNavbar';
import './AppNavbar.css';
import FeedbackPanel from './FeedbackPanel';
import api from './api';
import { useAuth } from './useAuth';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import SourceRail from './SourceRail';
import { STARTER_QUESTIONS, formatCorpusLabel } from './queryStarters';

// Main dashboard component (the existing app functionality)
/**
 * Signed-in query screen, including a project thread opened with ?project=.
 */
export default function QueryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, logout } = useAuth();
  const [question, setQuestion] = useState('');
  const [, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
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
  const [corpusStats, setCorpusStats] = useState(null);
  const messagesEndRef = useRef(null);

  const projectIdFromUrl = new URLSearchParams(location.search).get('project');
  const conversationHistory = projectIdFromUrl ? projectHistory : generalHistory;
  const canUseProjects = Boolean(user);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  useEffect(() => {
    api.get('/api/rag/stats')
      .then((res) => setCorpusStats(res.data))
      .catch(() => setCorpusStats(null));
  }, []);

  useEffect(() => {
    if (!user || projectIdFromUrl) {
      return undefined;
    }

    let cancelled = false;
    api.get('/api/rag/conversation')
      .then((res) => {
        if (!cancelled) {
          setGeneralHistory(res.data.messages || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load saved query:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [user, projectIdFromUrl]);

  // Load user settings when authenticated
  useEffect(() => {
    if (user) {
      console.log('Loading user settings...');
      api.get('/api/auth/settings')
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
      api.get('/api/auth/me').then((res) => setUser(res.data.user)).catch(() => setUser(null));
    } else if (checkoutStatus === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Checkout was cancelled. You can upgrade anytime!');
    }

    // Open profile if returning from Stripe billing portal
    if (profileParam === 'billing') {
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/profile', { replace: true });
    }
  }, []);

  // Check for login/register query params (from landing page)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const showLoginParam = urlParams.get('login');
    const showRegisterParam = urlParams.get('register');

    if (showLoginParam === 'true' && !user) {
      navigate('/login', { replace: true });
    } else if (showRegisterParam === 'true' && !user) {
      navigate('/register', { replace: true });
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
          api.get(`/api/projects/${projectId}`),
          api.get(`/api/projects/${projectId}/conversation`),
          api.get(`/api/projects/${projectId}/conversations`)
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

  const closeProject = () => {
    navigate('/app');
  };

  const handleLogout = async () => {
    try {
      await logout();
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
      const updateResponse = await api.post('/api/auth/settings/llm', { preference });
      console.log('Update response:', updateResponse.data);
      setLlmPreference(preference);
    } catch (err) {
      console.error('Failed to update LLM preference:', err);
      alert('Failed to update LLM preference: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || projectLoading) return;

    const inProject = Boolean(projectIdFromUrl);
    const history = inProject ? projectHistory : generalHistory;
    const appendHistory = inProject ? setProjectHistory : setGeneralHistory;

    setLoading(true);

    try {
      const endpoint = inProject
        ? `/api/projects/${projectIdFromUrl}/query`
        : '/api/rag/ask';

      const res = await api.post(endpoint, { question });

      appendHistory([
        ...history,
        { role: 'user', content: question },
        {
          role: 'assistant',
          content: res.data.answer,
          queryId: res.data.queryId,
          sources: res.data.sources || [],
          projectId: inProject ? projectIdFromUrl : null
        }
      ]);

      if (inProject && activeConversation?.messageCount === 0) {
        try {
          const listRes = await api.get(`/api/projects/${projectIdFromUrl}/conversations`);
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
        const res = await api.post(`/api/projects/${projectIdFromUrl}/conversation`, {});
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

    try {
      const res = await api.post('/api/rag/conversation', {});
      setGeneralHistory(res.data.messages || []);
    } catch (err) {
      console.error('Failed to start a new saved query:', err);
      setGeneralHistory([]);
    }
    setResponse('');
    setQuestion('');
  };

  const openSavedConversation = async (conversationId) => {
    if (!projectIdFromUrl || !conversationId) return;
    if (String(conversationId) === String(activeConversation?.id)) return;
    try {
      const res = await api.post(
        `/api/projects/${projectIdFromUrl}/conversations/${conversationId}/open`,
        {}
      );
      setProjectHistory(res.data.messages || []);
      setActiveConversation(res.data.conversation || null);
      setProjectConversations(res.data.conversations || []);
      setResponse('');
    } catch (err) {
      alert('Failed to open conversation: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="App">
      <AppNavbar
        user={user}
        onLogout={handleLogout}
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
                    {projectIdFromUrl ? (
                      <span className="conversation-saved">Saved with this project</span>
                    ) : (
                      <span className="conversation-saved">Saved to your account</span>
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
                              <>
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                                <SourceRail sources={msg.sources} />
                              </>
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
                      {formatCorpusLabel(corpusStats) ? (
                        <p className="hint">{formatCorpusLabel(corpusStats)}</p>
                      ) : null}
                      <div className="starter-chips">
                        {STARTER_QUESTIONS.map((starter) => (
                          <button
                            type="button"
                            key={starter.topic}
                            className="starter-chip"
                            onClick={() => setQuestion(starter.text)}
                          >
                            {starter.topic}
                          </button>
                        ))}
                      </div>
                      <p className="persist-guidance">
                        This thread is saved to your account.{' '}
                        {canUseProjects ? (
                          <>
                            Open a{' '}
                            <button type="button" className="inline-link" onClick={() => navigate('/projects')}>
                              project
                            </button>
                            {' '}when you want a brief, pinned papers, and a working set.
                          </>
                        ) : null}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Question input form */}
              <form onSubmit={handleAsk} className="question-form">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (question.trim() && !loading && !projectLoading) {
                        handleAsk(e);
                      }
                    }
                  }}
                  placeholder={conversationHistory.length > 0 ? 'Ask a follow-up question...' : 'Ask about space habitats...'}
                  className="question-input"
                  rows={2}
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
              <button type="button" onClick={() => navigate('/login')} className="btn-primary">
                Login
              </button>
              <button type="button" onClick={() => navigate('/register')} className="btn-secondary">
                Register
              </button>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
