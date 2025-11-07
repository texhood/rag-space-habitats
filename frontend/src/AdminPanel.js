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

  const handleProcessSubmission = async (id) => {
    if (!window.confirm('Process this submission into chunks?')) return;
    
    try {
      const res = await axios.post(
        `http://localhost:5000/api/admin/process/${id}`,
        {},
        { withCredentials: true }
      );
      alert(`Success! Created ${res.data.chunks_created} chunks`);
      fetchPendingSubmissions();
      fetchProcessingStats();
    } catch (err) {
      alert('Processing failed: ' + (err.response?.data?.details || err.message));
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
    } catch (err) {
      alert('Batch processing failed: ' + (err.response?.data?.details || err.message));
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
      </div>
    </div>
  );
}

export default AdminPanel;