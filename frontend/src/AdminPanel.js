// AdminPanel.js
import API_URL from './config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DocumentViewer from './DocumentViewer';
import './AdminPanel.css';

function AdminPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [queries, setQueries] = useState([]);
  const [preprocessStatus, setPreprocessStatus] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [processingStats, setProcessingStats] = useState(null);
  const [embeddingStatus, setEmbeddingStatus] = useState(null);
  const [betaMode, setBetaMode] = useState(null);
  const [pricing, setPricing] = useState([]);
  const [editingTier, setEditingTier] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Crawler state - ADD THESE
  const [crawlerStatus, setCrawlerStatus] = useState(null);
  const [crawlerSettings, setCrawlerSettings] = useState(null);
  const [crawlerHistory, setCrawlerHistory] = useState([]);
  const [crawlerStats, setCrawlerStats] = useState(null);
  const [newSearchTerm, setNewSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'queries') {
      fetchQueries();
    } else if (activeTab === 'submissions') {
      fetchPendingSubmissions();
    } else if (activeTab === 'processing') {
      fetchProcessingStats();
      fetchEmbeddingStatus();
    } else if (activeTab === 'beta') {
      fetchBetaMode();
    } else if (activeTab === 'pricing') {
      fetchPricing();
    } else if (activeTab === 'crawler') {  // ADD THIS
      fetchCrawlerStatus();
      fetchCrawlerSettings();
      fetchCrawlerHistory();
      fetchCrawlerStats();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, {
        withCredentials: true
      });
      console.log('Fetched users:', res.data);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users: ' + (err.response?.data?.error || err.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/analytics`, {
        withCredentials: true
      });
      setAnalytics(res.data.analytics);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/analytics`, {
        withCredentials: true
      });
      setQueries(res.data.recentQueries || []);
    } catch (err) {
      console.error('Failed to fetch queries:', err);
      setError('Failed to load query history');
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/submissions?status=pending`, {
        withCredentials: true
      });
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setError('Failed to load submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessingStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/processing-stats`, {
        withCredentials: true
      });
      setProcessingStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load processing stats');
      setProcessingStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmbeddingStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/embedding-status`, {
        withCredentials: true
      });
      setEmbeddingStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch embedding status:', err);
      setEmbeddingStatus(null);
    }
  };

  const fetchBetaMode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/beta-mode`, {
        withCredentials: true
      });
      setBetaMode(res.data);
    } catch (err) {
      console.error('Failed to fetch beta mode:', err);
      setError('Failed to load beta mode');
      setBetaMode(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/pricing`, {
        withCredentials: true
      });
      setPricing(res.data.tiers || []);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Failed to load pricing');
      setPricing([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // CRAWLER FETCH FUNCTIONS - ADD THESE
  // =====================

  const fetchCrawlerStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/crawler/status`, {
        withCredentials: true
      });
      setCrawlerStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch crawler status:', err);
      setError('Failed to load crawler status');
      setCrawlerStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrawlerSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/crawler/settings`, {
        withCredentials: true
      });
      setCrawlerSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch crawler settings:', err);
      setCrawlerSettings(null);
    }
  };

  const fetchCrawlerHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/crawler/history?limit=20`, {
        withCredentials: true
      });
      setCrawlerHistory(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch crawler history:', err);
      setCrawlerHistory([]);
    }
  };

  const fetchCrawlerStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/crawler/stats`, {
        withCredentials: true
      });
      setCrawlerStats(res.data);
    } catch (err) {
      console.error('Failed to fetch crawler stats:', err);
      setCrawlerStats(null);
    }
  };

  // =====================
  // CRAWLER HANDLER FUNCTIONS - ADD THESE
  // =====================

  const handleToggleCrawler = async () => {
    const enable = !crawlerStatus?.enabled;
    const action = enable ? 'enable' : 'disable';
    
    if (!window.confirm(`${enable ? 'Enable' : 'Disable'} the document crawler?`)) {
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/api/crawler/toggle`, {}, {
        withCredentials: true
      });
      alert(res.data.message);
      fetchCrawlerStatus();
    } catch (err) {
      alert('Failed to toggle crawler: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRunCrawler = async () => {
    if (!window.confirm('Run the crawler now? This will fetch documents from NASA NTRS and arXiv.')) {
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/api/crawler/run`, {}, {
        withCredentials: true
      });
      alert(res.data.message + '\n\nCheck server logs for progress.');
      fetchCrawlerStatus();
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Crawler is already running!');
      } else {
        alert('Failed to start crawler: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleStopCrawler = async () => {
    if (!window.confirm('Stop the crawler? It will finish the current document before stopping.')) {
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/api/crawler/stop`, {}, {
        withCredentials: true
      });
      alert(res.data.message);
      fetchCrawlerStatus();
    } catch (err) {
      alert('Failed to stop crawler: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateDailyLimit = async (newLimit) => {
    try {
      await axios.patch(`${API_URL}/api/crawler/settings`, 
        { dailyLimit: parseInt(newLimit) },
        { withCredentials: true }
      );
      fetchCrawlerSettings();
      fetchCrawlerStatus();
    } catch (err) {
      alert('Failed to update limit: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddSearchTerm = async () => {
    if (!newSearchTerm.trim()) return;
    
    try {
      const res = await axios.post(`${API_URL}/api/crawler/search-terms`,
        { terms: [newSearchTerm.trim()] },
        { withCredentials: true }
      );
      alert(res.data.message);
      setNewSearchTerm('');
      fetchCrawlerSettings();
    } catch (err) {
      alert('Failed to add term: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveSearchTerm = async (term) => {
    if (!window.confirm(`Remove search term "${term}"?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/crawler/search-terms/${encodeURIComponent(term)}`, {
        withCredentials: true
      });
      fetchCrawlerSettings();
    } catch (err) {
      alert('Failed to remove term: ' + (err.response?.data?.error || err.message));
    }
  };

  // =====================
  // EXISTING HANDLER FUNCTIONS
  // =====================

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.post(
        `${API_URL}/api/admin/users/${userId}/role`,
        { role: newRole },
        { withCredentials: true }
      );
      fetchUsers();
    } catch (err) {
      alert('Failed to update role: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        withCredentials: true
      });
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };

  const runPreprocess = async () => {
    setPreprocessStatus('Starting preprocessing...');
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/preprocess`,
        {},
        { withCredentials: true }
      );
      setPreprocessStatus(res.data.message);
    } catch (err) {
      setPreprocessStatus('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this submission?')) return;
    
    try {
      await axios.patch(
        `${API_URL}/api/submissions/${id}/status`,
        { status: 'approved', review_notes: 'Approved by admin' },
        { withCredentials: true }
      );
      alert('Submission approved!');
      fetchPendingSubmissions();
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (id) => {
    const notes = prompt('Reason for rejection (optional):');
    
    try {
      await axios.patch(
        `${API_URL}/api/submissions/${id}/status`,
        { status: 'rejected', review_notes: notes || 'Rejected by admin' },
        { withCredentials: true }
      );
      alert('Submission rejected');
      fetchPendingSubmissions();
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleProcessAll = async () => {
    if (!window.confirm('Process ALL approved submissions?')) return;
    
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/process-all`,
        {},
        { withCredentials: true }
      );
      alert(`Processed ${res.data.processed} submissions, ${res.data.failed} failed`);
      fetchPendingSubmissions();
      fetchProcessingStats();
      fetchEmbeddingStatus();
    } catch (err) {
      alert('Batch processing failed: ' + (err.response?.data?.details || err.message));
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!window.confirm('Generate embeddings for chunks? This may take a while.')) return;
    
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/embed-all`,
        {},
        { withCredentials: true }
      );
      alert(res.data.message);
      fetchEmbeddingStatus();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.details || err.message));
    }
  };

  const handleToggleBetaMode = async () => {
    const enable = !betaMode.enabled;
    
    const currentPrice = betaMode.price !== undefined && betaMode.price !== null 
      ? betaMode.price 
      : (betaMode.tier_limits?.beta?.price !== undefined ? betaMode.tier_limits?.beta?.price : 0);
    
    if (enable) {
      const priceText = currentPrice === 0 ? 'FREE' : `$${currentPrice}/month`;
      if (!window.confirm(`Enable BETA MODE? All new subscriptions will be ${priceText} with Pro features.`)) {
        return;
      }
    } else {
      if (!window.confirm('Disable BETA MODE? New subscriptions will use regular pricing.')) {
        return;
      }
    }
    
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/beta-mode`,
        { 
          enabled: enable,
          price: currentPrice,
          benefits: 'All Pro features at beta pricing'
        },
        { withCredentials: true }
      );
      
      console.log('Toggle response:', res.data);
      
      await fetchBetaMode();
      
      const finalPrice = res.data.config.price;
      const priceText = finalPrice === 0 ? 'FREE' : `$${finalPrice}/month`;
      alert(`Beta mode ${enable ? 'ENABLED' : 'DISABLED'} at ${priceText}`);
      
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
      await fetchBetaMode();
    }
  };

  const handleUpdatePricing = async (tierKey, updates) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/pricing/${tierKey}`,
        updates,
        { withCredentials: true }
      );
      
      alert('Pricing updated successfully!');
      setEditingTier(null);
      fetchPricing();
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  // =====================
  // RENDER
  // =====================

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button onClick={onClose} className="close-btn">✕ Close</button>
      </div>

      <div className="admin-content">
        <div className="admin-tabs">
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button 
            className={activeTab === 'analytics' ? 'active' : ''}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={activeTab === 'queries' ? 'active' : ''}
            onClick={() => setActiveTab('queries')}
          >
            Query History
          </button>
          <button 
            className={activeTab === 'submissions' ? 'active' : ''}
            onClick={() => setActiveTab('submissions')}
          >
            📄 Review Submissions
          </button>
          <button 
            className={activeTab === 'processing' ? 'active' : ''}
            onClick={() => setActiveTab('processing')}
          >
            ⚙️ Processing
          </button>
          <button 
            className={activeTab === 'crawler' ? 'active' : ''}
            onClick={() => setActiveTab('crawler')}
          >
            🕷️ Crawler
          </button>
          <button 
            className={activeTab === 'pricing' ? 'active' : ''}
            onClick={() => setActiveTab('pricing')}
          >
            💰 Pricing
          </button>
          <button 
            className={activeTab === 'beta' ? 'active' : ''}
            onClick={() => setActiveTab('beta')}
          >
            🚀 Beta Mode
          </button>
        </div>

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="admin-section">
            <h3>User Management</h3>
            
            {loading && <p>Loading users...</p>}
            
            {error && (
              <div className="message error">{error}</div>
            )}
            
            {!loading && users.length > 0 && (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Tier</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.subscription_tier || 'free'}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn-small"
                          onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                        >
                          Toggle Role
                        </button>
                        <button 
                          className="btn-small btn-danger"
                          onClick={() => deleteUser(user.id)}
                          disabled={user.role === 'admin'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {!loading && users.length === 0 && !error && (
              <p>No users found.</p>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="admin-section">
            <h3>Analytics Dashboard</h3>
            
            {loading && <p>Loading analytics...</p>}
            
            {error && <div className="message error">{error}</div>}
            
            {!loading && analytics && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{analytics.totalUsers}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analytics.totalQueries}</div>
                  <div className="stat-label">Total Queries</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{analytics.avgResponseTime}ms</div>
                  <div className="stat-label">Avg Response Time</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUERIES TAB */}
        {activeTab === 'queries' && (
          <div className="admin-section">
            <h3>Query History</h3>
            
            {loading && <p>Loading queries...</p>}
            
            {error && <div className="message error">{error}</div>}
            
            {!loading && queries.length > 0 && (
              <table className="queries-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Question</th>
                    <th>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q, idx) => (
                    <tr key={idx}>
                      <td>{new Date(q.created_at).toLocaleString()}</td>
                      <td>{q.username || 'Anonymous'}</td>
                      <td className="question-cell" title={q.question}>{q.question}</td>
                      <td>{q.response_time}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <div className="admin-section">
            <h3>Review Submissions</h3>
            
            {loading && <p>Loading submissions...</p>}
            
            {error && <div className="message error">{error}</div>}
            
            {!loading && submissions.length === 0 && (
              <p>No pending submissions to review.</p>
            )}
            
            <div className="submissions-review">
              {submissions.map(sub => (
                <div key={sub._id} className="submission-review-card">
                  <h4>{sub.title}</h4>
                  <p><strong>Category:</strong> {sub.category}</p>
                  <p><strong>Submitted by:</strong> {sub.submitted_by_username}</p>
                  <p><strong>Date:</strong> {new Date(sub.submitted_at).toLocaleString()}</p>
                  {sub.description && <p><strong>Description:</strong> {sub.description}</p>}
                  
                  <div className="content-preview">
                    {sub.content?.substring(0, 500)}...
                  </div>
                  
                  <div className="review-actions">
                    <button className="approve-btn" onClick={() => handleApprove(sub._id)}>
                      ✓ Approve
                    </button>
                    <button className="reject-btn" onClick={() => handleReject(sub._id)}>
                      ✕ Reject
                    </button>
                    <button className="btn-small" onClick={() => setViewingDocument(sub._id)}>
                      👁️ View Full
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROCESSING TAB */}
        {activeTab === 'processing' && (
          <div className="admin-section">
            <h3>Document Processing</h3>
            
            {loading && <p>Loading stats...</p>}
            
            {error && <div className="message error">{error}</div>}
            
            {!loading && processingStats && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.approved || 0}</div>
                    <div className="stat-label">Approved</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.processed || 0}</div>
                    <div className="stat-label">Processed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.failed || 0}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </div>
                
                <div className="tool-card">
                  <h4>Process Approved Submissions</h4>
                  <p>Process all approved submissions into searchable chunks.</p>
                  <button className="process-btn" onClick={handleProcessAll}>
                    Process All Approved
                  </button>
                </div>
                
                {embeddingStatus && (
                  <div className="tool-card">
                    <h4>Embedding Status</h4>
                    <p>Total chunks: {embeddingStatus.total}</p>
                    <p>With embeddings: {embeddingStatus.with_embeddings}</p>
                    <p>Without embeddings: {embeddingStatus.without_embeddings}</p>
                    {embeddingStatus.without_embeddings > 0 && (
                      <button className="btn-primary" onClick={handleGenerateEmbeddings}>
                        Generate Missing Embeddings
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===================== */}
        {/* CRAWLER TAB - ADD THIS ENTIRE SECTION */}
        {/* ===================== */}
        {activeTab === 'crawler' && (
          <div className="admin-section">
            <div className="tab-header">
              <h3>🕷️ Document Crawler</h3>
              <button className="refresh-btn" onClick={() => {
                fetchCrawlerStatus();
                fetchCrawlerSettings();
                fetchCrawlerHistory();
                fetchCrawlerStats();
              }}>
                🔄 Refresh
              </button>
            </div>
            
            {loading && <p>Loading crawler status...</p>}
            
            {error && <div className="message error">{error}</div>}
            
            {!loading && crawlerStatus && (
              <>
                {/* Status Banner */}
                <div className={`beta-status ${crawlerStatus.enabled ? 'enabled' : 'disabled'}`}>
                  <h4>
                    {crawlerStatus.enabled ? '🟢 CRAWLER ENABLED' : '🔴 CRAWLER DISABLED'}
                  </h4>
                  <p>
                    {crawlerStatus.enabled 
                      ? 'Crawler will run automatically at 23:00 CT daily'
                      : 'Crawler is currently disabled'
                    }
                    {crawlerStatus.isRunning && ' — Currently running...'}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid" style={{ marginTop: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-value">{crawlerStatus.documentsToday || 0}</div>
                    <div className="stat-label">Documents Today</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{crawlerStatus.dailyLimit}</div>
                    <div className="stat-label">Daily Limit</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{crawlerStatus.remainingToday}</div>
                    <div className="stat-label">Remaining Today</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{crawlerStatus.searchTermsCount || 0}</div>
                    <div className="stat-label">Search Terms</div>
                  </div>
                </div>

                {/* Last Run Info */}
                {crawlerStatus.lastRun && (
                  <div className="tool-card" style={{ marginTop: '20px' }}>
                    <h4>Last Run</h4>
                    <p><strong>Time:</strong> {new Date(crawlerStatus.lastRun).toLocaleString()}</p>
                    <p><strong>Status:</strong> {crawlerStatus.lastRunStatus}</p>
                    <p><strong>Documents:</strong> {crawlerStatus.lastRunDocuments || 0}</p>
                    {crawlerStatus.lastRunError && (
                      <p style={{ color: 'red' }}><strong>Error:</strong> {crawlerStatus.lastRunError}</p>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div className="tool-card" style={{ marginTop: '20px' }}>
                  <h4>Crawler Controls</h4>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={handleToggleCrawler}
                      className={crawlerStatus.enabled ? 'reject-btn' : 'approve-btn'}
                      style={{ fontSize: '16px', padding: '12px 24px' }}
                    >
                      {crawlerStatus.enabled ? '⏹️ Disable Crawler' : '▶️ Enable Crawler'}
                    </button>
                    <button 
                      onClick={handleRunCrawler}
                      className="btn-primary"
                      disabled={crawlerStatus.isRunning}
                      style={{ fontSize: '16px', padding: '12px 24px' }}
                    >
                      {crawlerStatus.isRunning ? '⏳ Running...' : '🚀 Run Now'}
                    </button>
                    {crawlerStatus.isRunning && (
                      <button 
                        onClick={handleStopCrawler}
                        className="reject-btn"
                        disabled={crawlerStatus.stopPending}
                        style={{ fontSize: '16px', padding: '12px 24px' }}
                      >
                        {crawlerStatus.stopPending ? '⏳ Stopping...' : '🛑 Stop'}
                      </button>
                    )}
                  </div>
                  
                  {/* Daily Limit Setting */}
                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label><strong>Daily Limit:</strong></label>
                    <input 
                      type="number"
                      min="1"
                      max="500"
                      value={crawlerStatus.dailyLimit}
                      onChange={(e) => handleUpdateDailyLimit(e.target.value)}
                      style={{ 
                        width: '80px', 
                        padding: '8px', 
                        border: '2px solid #667eea',
                        borderRadius: '4px'
                      }}
                    />
                    <span style={{ color: '#666' }}>documents per day</span>
                  </div>
                </div>

                {/* Sources */}
                {crawlerStatus.sources && (
                  <div className="tool-card" style={{ marginTop: '20px' }}>
                    <h4>Data Sources</h4>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                      <div style={{ 
                        padding: '15px', 
                        background: crawlerStatus.sources.ntrs?.enabled ? '#d4edda' : '#f8f9fa',
                        borderRadius: '8px',
                        flex: 1
                      }}>
                        <strong>🚀 NASA NTRS</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                          {crawlerStatus.sources.ntrs?.enabled ? '✅ Enabled' : '❌ Disabled'}
                        </p>
                      </div>
                      <div style={{ 
                        padding: '15px', 
                        background: crawlerStatus.sources.arxiv?.enabled ? '#d4edda' : '#f8f9fa',
                        borderRadius: '8px',
                        flex: 1
                      }}>
                        <strong>📚 arXiv</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                          {crawlerStatus.sources.arxiv?.enabled ? '✅ Enabled' : '❌ Disabled'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Terms */}
                {crawlerSettings && (
                  <div className="tool-card" style={{ marginTop: '20px' }}>
                    <h4>Search Terms</h4>
                    
                    {/* Add new term */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <input 
                        type="text"
                        placeholder="Add new search term..."
                        value={newSearchTerm}
                        onChange={(e) => setNewSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSearchTerm()}
                        style={{ 
                          flex: 1, 
                          padding: '10px', 
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <button onClick={handleAddSearchTerm} className="btn-primary">
                        + Add
                      </button>
                    </div>
                    
                    {/* Seed Terms */}
                    <div style={{ marginTop: '15px' }}>
                      <strong>Seed Terms ({crawlerSettings.searchTerms?.seedCount || 0}):</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        {crawlerSettings.searchTerms?.seed?.map((term, idx) => (
                          <span 
                            key={idx}
                            style={{
                              background: '#667eea',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {term}
                            <button 
                              onClick={() => handleRemoveSearchTerm(term)}
                              style={{
                                background: 'rgba(255,255,255,0.3)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                color: 'white',
                                fontSize: '12px'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Learned Terms */}
                    {crawlerSettings.searchTerms?.learned?.length > 0 && (
                      <div style={{ marginTop: '15px' }}>
                        <strong>Learned Terms ({crawlerSettings.searchTerms?.learnedCount || 0}):</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                          {crawlerSettings.searchTerms?.learned?.map((term, idx) => (
                            <span 
                              key={idx}
                              style={{
                                background: '#6c757d',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '13px'
                              }}
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                        {crawlerSettings.searchTerms?.lastCorpusExtraction && (
                          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            Last extracted: {new Date(crawlerSettings.searchTerms.lastCorpusExtraction).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Statistics */}
                {crawlerStats && (
                  <div className="tool-card" style={{ marginTop: '20px' }}>
                    <h4>Crawler Statistics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' }}>
                      <div>
                        <strong>By Source:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {Object.entries(crawlerStats.bySource || {}).map(([source, count]) => (
                            <li key={source}>{source}: {count}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>By Category:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {Object.entries(crawlerStats.byCategory || {}).map(([cat, count]) => (
                            <li key={cat}>{cat}: {count}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Chunks:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          <li>Total: {crawlerStats.chunks?.totalChunks || 0}</li>
                          <li>Avg per doc: {(crawlerStats.chunks?.avgChunks || 0).toFixed(1)}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Crawled Documents */}
                {crawlerHistory.length > 0 && (
                  <div className="tool-card" style={{ marginTop: '20px' }}>
                    <h4>Recently Crawled Documents</h4>
                    <table className="queries-table" style={{ marginTop: '10px' }}>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Source</th>
                          <th>Category</th>
                          <th>Chunks</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crawlerHistory.map((doc, idx) => (
                          <tr key={idx}>
                            <td style={{ maxWidth: '300px' }}>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                                 style={{ color: '#667eea', textDecoration: 'none' }}>
                                {doc.title?.substring(0, 60)}{doc.title?.length > 60 ? '...' : ''}
                              </a>
                            </td>
                            <td>
                              <span style={{
                                background: doc.source === 'ntrs' ? '#0d6efd' : '#6f42c1',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {doc.source?.toUpperCase()}
                              </span>
                            </td>
                            <td>{doc.category}</td>
                            <td>{doc.chunk_count || '-'}</td>
                            <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* ===================== */}
        {/* END CRAWLER TAB */}
        {/* ===================== */}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div className="admin-section pricing-management">
            <h3>Pricing Management</h3>
            
            {loading && <p>Loading pricing...</p>}
            
            {error && <div className="message error">{error}</div>}
            
            {!loading && pricing.length > 0 && (
              <div className="pricing-table-container">
                <table className="pricing-table">
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Price</th>
                      <th>Queries/Day</th>
                      <th>Uploads/Month</th>
                      <th>Max File Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.map(tier => (
                      <tr key={tier.tier_key}>
                        <td><strong>{tier.name}</strong></td>
                        <td>
                          {editingTier === tier.tier_key ? (
                            <input 
                              type="number" 
                              step="0.01"
                              defaultValue={tier.price}
                              style={{ width: '80px' }}
                              id={`price-${tier.tier_key}`}
                            />
                          ) : (
                            `$${parseFloat(tier.price).toFixed(2)}/mo`
                          )}
                        </td>
                        <td>
                          {editingTier === tier.tier_key ? (
                            <input 
                              type="number" 
                              defaultValue={tier.features?.queries_per_day}
                              style={{ width: '80px' }}
                              id={`queries-${tier.tier_key}`}
                            />
                          ) : (
                            tier.features?.queries_per_day === -1 ? 'Unlimited' : tier.features?.queries_per_day
                          )}
                        </td>
                        <td>
                          {editingTier === tier.tier_key ? (
                            <input 
                              type="number" 
                              defaultValue={tier.features?.uploads_per_month}
                              style={{ width: '80px' }}
                              id={`uploads-${tier.tier_key}`}
                            />
                          ) : (
                            tier.features?.uploads_per_month === -1 ? 'Unlimited' : tier.features?.uploads_per_month
                          )}
                        </td>
                        <td>{tier.features?.max_file_size_mb} MB</td>
                        <td>
                          {editingTier === tier.tier_key ? (
                            <>
                              <button 
                                className="btn-small"
                                onClick={() => {
                                  const updates = {
                                    price: parseFloat(document.getElementById(`price-${tier.tier_key}`).value),
                                    features: {
                                      queries_per_day: parseInt(document.getElementById(`queries-${tier.tier_key}`).value),
                                      uploads_per_month: parseInt(document.getElementById(`uploads-${tier.tier_key}`).value)
                                    }
                                  };
                                  handleUpdatePricing(tier.tier_key, updates);
                                }}
                              >
                                Save
                              </button>
                              <button 
                                className="btn-small"
                                onClick={() => setEditingTier(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button 
                              className="btn-small"
                              onClick={() => setEditingTier(tier.tier_key)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BETA MODE TAB */}
        {activeTab === 'beta' && (
          <div className="admin-section">
            <h3>Beta Mode Control</h3>
            
            {loading && <p>Loading beta mode settings...</p>}
            
            {error && (
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            
            {!loading && betaMode && (
              <div className="beta-control-panel">
                {/* Current Status Banner */}
                <div className={`beta-status ${betaMode.enabled ? 'enabled' : 'disabled'}`}>
                  <h4>Current Status: {betaMode.enabled ? '✅ BETA MODE ENABLED' : '❌ BETA MODE DISABLED'}</h4>
                  <p>
                    {betaMode.enabled 
                      ? `All new subscriptions are $${betaMode.tier_limits?.beta?.price || betaMode.price}/month with Pro features`
                      : 'Beta mode is not active. Regular pricing applies.'
                    }
                  </p>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ marginTop: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-value" style={{ fontSize: '48px' }}>
                      {betaMode.enabled ? '✅' : '❌'}
                    </div>
                    <div className="stat-label">Beta Mode Status</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">${betaMode.tier_limits?.beta?.price || betaMode.price}</div>
                    <div className="stat-label">Beta Price/Month</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{betaMode.beta_users_count || 0}</div>
                    <div className="stat-label">Beta Users</div>
                  </div>
                </div>

                {/* Price Editor */}
                <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h4>Beta Pricing Configuration</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
                    <label style={{ fontWeight: 'bold' }}>Beta Price:</label>
                    <span style={{ fontSize: '24px' }}>$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={betaMode.price !== undefined && betaMode.price !== null ? betaMode.price : 0}
                      onChange={(e) => {
                        const newPrice = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setBetaMode({...betaMode, price: isNaN(newPrice) ? 0 : newPrice});
                      }}
                      style={{ 
                        fontSize: '18px', 
                        padding: '8px 12px', 
                        width: '100px',
                        border: '2px solid #667eea',
                        borderRadius: '6px'
                      }}
                    />
                    <span style={{ fontSize: '18px' }}>/month</span>
                    {betaMode.price === 0 && (
                      <span style={{ color: '#28a745', fontWeight: 'bold', marginLeft: '10px' }}>
                        ✅ FREE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                    {betaMode.price === 0 
                      ? 'Beta users will get Pro features for FREE (no Stripe subscription created).'
                      : `Beta users will be charged $${betaMode.price}/month via Stripe.`
                    }
                  </p>
                </div>

                {/* Toggle Button */}
                <div style={{ marginTop: '30px' }}>
                  <button 
                    onClick={handleToggleBetaMode}
                    className={betaMode.enabled ? 'reject-btn' : 'approve-btn'}
                    style={{ fontSize: '18px', padding: '15px 30px' }}
                  >
                    {betaMode.enabled ? '❌ DISABLE Beta Mode' : '✅ ENABLE Beta Mode'}
                  </button>
                </div>

                {/* Warning when enabled */}
                {betaMode.enabled && (
                  <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' }}>
                    <strong>⚠️ Warning:</strong> Beta mode is active! All new subscriptions will be charged ${betaMode.tier_limits?.beta?.price || betaMode.price}/month instead of regular prices.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          submissionId={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}

export default AdminPanel;