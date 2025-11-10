// AdminPanel.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', {
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
      const res = await axios.get('http://localhost:5000/api/admin/analytics', {
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
      const res = await axios.get('http://localhost:5000/api/admin/analytics', {
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
      const res = await axios.get('http://localhost:5000/api/submissions?status=pending', {
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
      const res = await axios.get('http://localhost:5000/api/admin/processing-stats', {
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
      const res = await axios.get('http://localhost:5000/api/admin/embedding-status', {
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
      const res = await axios.get('http://localhost:5000/api/admin/beta-mode', {
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
      const res = await axios.get('http://localhost:5000/api/admin/pricing', {
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

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.post(
        `http://localhost:5000/api/admin/users/${userId}/role`,
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
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
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
        'http://localhost:5000/api/admin/preprocess',
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
        `http://localhost:5000/api/submissions/${id}/status`,
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
        `http://localhost:5000/api/submissions/${id}/status`,
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
        'http://localhost:5000/api/admin/process-all',
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
        'http://localhost:5000/api/admin/embed-all',
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
        'http://localhost:5000/api/admin/beta-mode',
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
        `http://localhost:5000/api/admin/pricing/${tierKey}`,
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
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px', marginBottom: '15px' }}>
                {error}
              </div>
            )}
            
            {!loading && !error && users.length === 0 && (
              <p>No users found.</p>
            )}
            
            {!loading && !error && users.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="admin-section">
            <h3>Analytics (Last 7 Days)</h3>
            
            {loading && <p>Loading analytics...</p>}
            
            {error && (
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            
            {!loading && analytics && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{analytics.total_queries || 0}</div>
                    <div className="stat-label">Total Queries</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{analytics.active_users || 0}</div>
                    <div className="stat-label">Active Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {analytics.avg_response_time ? Math.round(analytics.avg_response_time) : 0}ms
                    </div>
                    <div className="stat-label">Avg Response Time</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {(() => {
                        const chunks = analytics?.avg_chunks_retrieved;
                        if (!chunks) return '0.0';
                        const num = typeof chunks === 'number' ? chunks : parseFloat(chunks);
                        return isNaN(num) ? '0.0' : num.toFixed(1);
                      })()}
                    </div>
                    <div className="stat-label">Avg Chunks Retrieved</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* QUERY HISTORY TAB */}
        {activeTab === 'queries' && (
          <div className="admin-section">
            <h3>Recent Queries</h3>
            
            {loading && <p>Loading query history...</p>}
            
            {error && (
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            
            {!loading && queries.length === 0 && <p>No queries yet.</p>}
            
            {!loading && queries.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Question</th>
                    <th>Response Time</th>
                    <th>Chunks</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map(q => (
                    <tr key={q.id}>
                      <td>{q.username}</td>
                      <td>{q.question}</td>
                      <td>{q.response_time_ms}ms</td>
                      <td>{q.chunks_retrieved}</td>
                      <td>{new Date(q.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* REVIEW SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <div className="admin-section">
            <h3>Pending Submissions</h3>
            
            {loading && <p>Loading submissions...</p>}
            
            {error && (
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            
            {!loading && submissions.length === 0 && (
              <p>No pending submissions</p>
            )}
            
            {!loading && submissions.length > 0 && (
              <div className="submissions-review">
                {submissions.map(sub => (
                  <div key={sub._id} className="submission-review-card">
                    <h4>{sub.title}</h4>
                    <p><strong>By:</strong> {sub.submitted_by_username}</p>
                    <p><strong>Category:</strong> {sub.category}</p>
                    <p><strong>Submitted:</strong> {new Date(sub.submitted_at).toLocaleString()}</p>
                    {sub.tags && sub.tags.length > 0 && (
                      <p><strong>Tags:</strong> {sub.tags.join(', ')}</p>
                    )}
                    {sub.description && (
                      <p><strong>Description:</strong> {sub.description}</p>
                    )}
                    <p><strong>Content length:</strong> {sub.content?.length || 0} characters</p>
                    {sub.file_info && (
                      <p><strong>File:</strong> {sub.file_info.original_name} ({sub.file_info.size_readable})</p>
                    )}
                    <details>
                      <summary>Preview Content</summary>
                      <div className="content-preview">
                        {sub.content?.substring(0, 500)}...
                      </div>
                    </details>
                    <div className="review-actions">
                      <button onClick={() => handleApprove(sub._id)} className="approve-btn">
                        ✅ Approve
                      </button>
                      <button onClick={() => handleReject(sub._id)} className="reject-btn">
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROCESSING TAB */}
        {activeTab === 'processing' && (
          <div className="admin-section">
            <h3>Document Processing</h3>
            
            {loading && <p>Loading processing stats...</p>}
            
            {error && (
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            
            {!loading && processingStats && (
              <div className="processing-stats">
                <h4>Submission Status</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.submissions.pending}</div>
                    <div className="stat-label">Pending Review</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.submissions.approved}</div>
                    <div className="stat-label">Approved</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.submissions.processed}</div>
                    <div className="stat-label">Processed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.submissions.failed}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </div>

                <h4 style={{ marginTop: '30px' }}>Chunks in Database</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{processingStats.chunks.total}</div>
                    <div className="stat-label">Total Chunks</div>
                  </div>
                </div>

                <div style={{ marginTop: '30px' }}>
                  <button onClick={handleProcessAll} className="process-btn">
                    ⚙️ Process All Approved Submissions
                  </button>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                    This will convert all approved submissions into searchable chunks
                  </p>
                </div>

                {embeddingStatus && (
                  <div style={{ marginTop: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '8px', border: '2px solid #4a90e2' }}>
                    <h4>🔬 Vector Embeddings</h4>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value" style={{ fontSize: '32px' }}>
                          {embeddingStatus.server_healthy ? '✅' : '❌'}
                        </div>
                        <div className="stat-label">Embedding Server</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{embeddingStatus.chunks?.embedded || 0}</div>
                        <div className="stat-label">Chunks with Embeddings</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{embeddingStatus.chunks?.not_embedded || 0}</div>
                        <div className="stat-label">Need Embeddings</div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleGenerateEmbeddings}
                      className="process-btn"
                      style={{ marginTop: '15px' }}
                      disabled={!embeddingStatus.server_healthy}
                    >
                      🔬 Generate Embeddings for Existing Chunks
                    </button>
                    
                    {!embeddingStatus.server_healthy && (
                      <p style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>
                        ⚠️ Embedding server not running. Start it with: python python-services/embedding_server.py
                      </p>
                    )}
                    
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                      Free local embeddings • No API costs • 768 dimensions • Semantic search
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4>Legacy Processing (File System)</h4>
                  <button onClick={runPreprocess} style={{ marginBottom: '10px' }}>
                    Run Preprocessing
                  </button>
                  {preprocessStatus && <p>{preprocessStatus}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div className="admin-section">
            <h3>💰 Pricing Management</h3>
            
            {loading && <p>Loading pricing...</p>}
            
            {error && (
              <div style={{ color: 'red', padding: '10px', background: '#fee', borderRadius: '6px' }}>
                {error}
              </div>
            )}
            
            {!loading && pricing.length > 0 && (
              <div className="pricing-management">
                <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    💡 <strong>Tip:</strong> Changes here affect what users see on the pricing page and what they're charged via Stripe.
                  </p>
                </div>

                <div className="pricing-table-container">
                  <table className="pricing-table">
                    <thead>
                      <tr>
                        <th>Tier</th>
                        <th>Price/Month</th>
                        <th>Queries/Day</th>
                        <th>Uploads/Month</th>
                        <th>File Size</th>
                        <th>LLMs</th>
                        <th>Stripe ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricing.map(tier => (
                        <tr key={tier.id} style={{ 
                          background: tier.tier_key === 'beta' ? '#d4edda' : 'white',
                          opacity: tier.is_active ? 1 : 0.5
                        }}>
                          <td>
                            <strong>{tier.name}</strong>
                            <br />
                            <span style={{ fontSize: '12px', color: '#666' }}>{tier.tier_key}</span>
                          </td>
                          <td>
                            {editingTier === tier.tier_key ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={tier.price}
                                id={`price-${tier.tier_key}`}
                                style={{ width: '80px', padding: '4px' }}
                              />
                            ) : (
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: tier.price === 0 ? '#28a745' : '#333' }}>
                                {tier.price === 0 ? 'FREE' : `$${parseFloat(tier.price).toFixed(2)}`}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingTier === tier.tier_key ? (
                              <input
                                type="number"
                                min="-1"
                                defaultValue={tier.features.queries_per_day}
                                id={`queries-${tier.tier_key}`}
                                style={{ width: '80px', padding: '4px' }}
                              />
                            ) : (
                              tier.features.queries_per_day === -1 ? '∞ Unlimited' : tier.features.queries_per_day
                            )}
                          </td>
                          <td>
                            {editingTier === tier.tier_key ? (
                              <input
                                type="number"
                                min="-1"
                                defaultValue={tier.features.uploads_per_month}
                                id={`uploads-${tier.tier_key}`}
                                style={{ width: '80px', padding: '4px' }}
                              />
                            ) : (
                              tier.features.uploads_per_month === -1 ? '∞ Unlimited' : tier.features.uploads_per_month
                            )}
                          </td>
                          <td>
                            {editingTier === tier.tier_key ? (
                              <input
                                type="number"
                                min="0"
                                defaultValue={tier.features.max_file_size_mb}
                                id={`filesize-${tier.tier_key}`}
                                style={{ width: '80px', padding: '4px' }}
                              />
                            ) : (
                              tier.features.max_file_size_mb ? `${tier.features.max_file_size_mb}MB` : 'N/A'
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px' }}>
                              {tier.features.llm_access?.join(', ') || 'None'}
                            </div>
                          </td>
                          <td>
                            {editingTier === tier.tier_key ? (
                              <input
                                type="text"
                                defaultValue={tier.stripe_price_id || ''}
                                placeholder="price_..."
                                id={`stripe-${tier.tier_key}`}
                                style={{ width: '120px', padding: '4px', fontSize: '11px' }}
                              />
                            ) : (
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                                {tier.stripe_price_id || '—'}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingTier === tier.tier_key ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                  onClick={() => {
                                    const updates = {
                                      price: parseFloat(document.getElementById(`price-${tier.tier_key}`).value),
                                      stripe_price_id: document.getElementById(`stripe-${tier.tier_key}`).value || null,
                                      features: {
                                        queries_per_day: parseInt(document.getElementById(`queries-${tier.tier_key}`).value),
                                        uploads_per_month: parseInt(document.getElementById(`uploads-${tier.tier_key}`).value),
                                        max_file_size_mb: parseInt(document.getElementById(`filesize-${tier.tier_key}`).value)
                                      }
                                    };
                                    handleUpdatePricing(tier.tier_key, updates);
                                  }}
                                  className="approve-btn"
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                >
                                  💾 Save
                                </button>
                                <button
                                  onClick={() => setEditingTier(null)}
                                  className="reject-btn"
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingTier(tier.tier_key)}
                                className="process-btn"
                                style={{ padding: '5px 15px', fontSize: '12px' }}
                              >
                                ✏️ Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pricing Summary Cards */}
                <div style={{ marginTop: '30px' }}>
                  <h4>Quick Stats</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{pricing.length}</div>
                      <div className="stat-label">Active Tiers</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">
                        ${Math.min(...pricing.map(t => parseFloat(t.price)))}
                      </div>
                      <div className="stat-label">Lowest Price</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">
                        ${Math.max(...pricing.map(t => parseFloat(t.price)))}
                      </div>
                      <div className="stat-label">Highest Price</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">
                        {pricing.filter(t => t.stripe_price_id).length}/{pricing.length}
                      </div>
                      <div className="stat-label">Stripe Connected</div>
                    </div>
                  </div>
                </div>

                {/* Feature Legend */}
                <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4>Feature Reference</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', fontSize: '14px' }}>
                    <div>
                      <strong>Queries/Day:</strong>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>-1 = Unlimited</li>
                        <li>Number = Daily limit</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Uploads/Month:</strong>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>-1 = Unlimited</li>
                        <li>0 = View only</li>
                        <li>Number = Monthly limit</li>
                      </ul>
                    </div>
                    <div>
                      <strong>File Size:</strong>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>Value in MB</li>
                        <li>0 = No uploads allowed</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Stripe Price ID:</strong>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>From Stripe dashboard</li>
                        <li>Format: price_xxxxx</li>
                        <li>Required for paid tiers</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* LLM Access Editor */}
                <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' }}>
                  <h4>⚠️ LLM Access Configuration</h4>
                  <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                    LLM access cannot be edited here yet. Currently set in database:
                  </p>
                  <ul style={{ fontSize: '14px', margin: 0 }}>
                    {pricing.map(t => (
                      <li key={t.id}>
                        <strong>{t.name}:</strong> {t.features.llm_access?.join(', ') || 'None'}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
                    To change LLM access, update the tier_features table directly or we can add an editor UI.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BETA MODE TAB */}
        {activeTab === 'beta' && (
          <div className="admin-section">
            <h3>🚀 Beta Mode Control</h3>
            
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

                {/* Pricing Table */}
                {betaMode.tier_limits && (
                  <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h4>Current Pricing Structure</h4>
                    <table style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#667eea', color: 'white' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Tier</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Queries/Day</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Uploads/Month</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>LLMs</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: 'white', borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px' }}><strong>Free</strong></td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>$0</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{betaMode.tier_limits.free.queries_per_day}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{betaMode.tier_limits.free.uploads_per_month}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Grok</td>
                        </tr>
                        <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px' }}><strong>Basic</strong></td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>$9</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{betaMode.tier_limits.basic.queries_per_day}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{betaMode.tier_limits.basic.uploads_per_month}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Grok</td>
                        </tr>
                        <tr style={{ background: 'white', borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px' }}><strong>Pro</strong></td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>$29</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Unlimited</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{betaMode.tier_limits.pro.uploads_per_month}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Both</td>
                        </tr>
                        <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px' }}><strong>Enterprise</strong></td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>$99</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Unlimited</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Unlimited</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>Both + API</td>
                        </tr>
                        {betaMode.enabled && (
                          <tr style={{ background: '#d4edda', borderBottom: '2px solid #28a745', fontWeight: 'bold' }}>
                            <td style={{ padding: '12px' }}><strong>🚀 Beta (ACTIVE)</strong></td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>${betaMode.tier_limits.beta.price}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>Unlimited</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{betaMode.tier_limits.beta.uploads_per_month}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>Both</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Beta Features Details */}
                <div style={{ marginTop: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '8px' }}>
                  <h4>Beta Mode Details</h4>
                  <ul style={{ textAlign: 'left', lineHeight: '1.8' }}>
                    <li><strong>Price:</strong> ${betaMode.tier_limits?.beta?.price || betaMode.price}/month</li>
                    <li><strong>Features:</strong> {betaMode.benefits}</li>
                    <li><strong>Queries:</strong> Unlimited</li>
                    <li><strong>Uploads:</strong> {betaMode.tier_limits?.beta?.uploads_per_month || 50}/month</li>
                    <li><strong>LLMs:</strong> Both Grok & Claude</li>
                    <li><strong>File Size:</strong> 100MB max</li>
                  </ul>
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
    </div>
  );
}

export default AdminPanel;