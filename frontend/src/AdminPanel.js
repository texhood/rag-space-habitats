// AdminPanel.js - Complete Admin Dashboard Component
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

function AdminPanel({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', {
        withCredentials: true
      });
      setUsers(res.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('http://localhost:5000/api/admin/analytics', {
        withCredentials: true
      });
      setAnalytics(res.data.analytics);
      setRecentQueries(res.data.recentQueries || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Change user role
  const changeRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    if (!window.confirm(`Change role to ${newRole}?`)) {
      return;
    }

    try {
      await axios.patch(
        `http://localhost:5000/api/admin/users/${userId}/role`,
        { role: newRole },
        { withCredentials: true }
      );
      setSuccess(`Role changed to ${newRole}`);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change role');
    }
  };

  // Delete user
  const deleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/admin/users/${userId}`,
        { withCredentials: true }
      );
      setSuccess('User deleted successfully');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Trigger preprocessing
  const runPreprocess = async () => {
    if (!window.confirm('Start preprocessing? This may take a while.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/admin/preprocess',
        {},
        { withCredentials: true }
      );
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start preprocessing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-header">
          <h2>🛠️ Admin Dashboard</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Messages */}
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button
            className={activeTab === 'analytics' ? 'active' : ''}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button
            className={activeTab === 'tools' ? 'active' : ''}
            onClick={() => setActiveTab('tools')}
          >
            🔧 Tools
          </button>
        </div>

        {/* Content */}
        <div className="admin-content">
          {loading && <div className="loading">Loading...</div>}

          {/* Users Tab */}
          {activeTab === 'users' && !loading && (
            <div className="users-tab">
              <div className="tab-header">
                <h3>User Management</h3>
                <button onClick={loadUsers} className="refresh-btn">🔄 Refresh</button>
              </div>

              <table className="users-table">
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
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>
                        <strong>{u.username}</strong>
                        {u.id === user.id && <span className="badge">You</span>}
                      </td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => changeRole(u.id, u.role)}
                          className="btn-small"
                          disabled={u.id === user.id}
                        >
                          {u.role === 'admin' ? '⬇️ Demote' : '⬆️ Promote'}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.username)}
                          className="btn-small btn-danger"
                          disabled={u.id === user.id}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && !loading && analytics && (
            <div className="analytics-tab">
              <div className="tab-header">
                <h3>System Analytics</h3>
                <button onClick={loadAnalytics} className="refresh-btn">🔄 Refresh</button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">
                    {analytics?.total_queries ?? 0}
                  </div>
                  <div className="stat-label">Total Queries</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {analytics?.active_users ?? 0}
                  </div>
                  <div className="stat-label">Active Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {analytics?.avg_response_time ? Math.round(analytics.avg_response_time) : 0}ms
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

              <h4>Recent Queries</h4>
              <table className="queries-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Question</th>
                    <th>Time</th>
                    <th>Chunks</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQueries.map(q => (
                    <tr key={q.id}>
                      <td>{q.username}</td>
                      <td className="question-cell">{q.question}</td>
                      <td>{Math.round(q.response_time_ms)}ms</td>
                      <td>{q.chunks_retrieved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tools Tab */}
          {activeTab === 'tools' && !loading && (
            <div className="tools-tab">
              <h3>Admin Tools</h3>

              <div className="tool-card">
                <h4>🔄 Preprocessing</h4>
                <p>Rebuild the document embeddings and chunks</p>
                <button onClick={runPreprocess} className="btn-primary">
                  Run Preprocessing
                </button>
              </div>

              <div className="tool-card">
                <h4>📊 Database Stats</h4>
                <p>View database statistics and health</p>
                <button className="btn-secondary" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
