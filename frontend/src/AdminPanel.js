// AdminPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_URL from './config';
import './AdminPanel.css';

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [error, setError] = useState('');
  const [betaMode, setBetaMode] = useState({
    enabled: false,
    price: 0,
    stripe_price_id: '',
    benefits: ''
  });
  const [pricing, setPricing] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Helper function to get axios config with credentials
  const getAxiosConfig = useCallback(() => {
    return {
      withCredentials: true
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, { withCredentials: true });
      setUsers(res.data.users);
      setError('');
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users: ' + (err.response?.data?.error || err.message));
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/analytics?days=7`, { withCredentials: true });
      setAnalytics(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics: ' + (err.response?.data?.error || err.message));
    }
  }, []);

  const fetchBetaMode = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/beta-mode`, { withCredentials: true });
      setBetaMode(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch beta mode:', err);
      setError('Failed to load beta settings: ' + (err.response?.data?.error || err.message));
    }
  }, []);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/pricing`, { withCredentials: true });
      setPricing(res.data.tiers || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Failed to load pricing: ' + (err.response?.data?.error || err.message));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'beta') {
      fetchBetaMode();
    } else if (activeTab === 'pricing') {
      fetchPricing();
    }
  }, [activeTab, fetchUsers, fetchAnalytics, fetchBetaMode, fetchPricing]);

  const handleUpdateRole = async (userId, newRole) => {
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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePreprocess = async () => {
    if (!window.confirm('Start preprocessing? This will run in the background.')) {
      return;
    }

    setProcessing(true);
    try {
      const res = await axios.post(`${API_URL}/api/admin/preprocess`, {}, { withCredentials: true });
      alert(res.data.message);
    } catch (err) {
      alert('Failed to start preprocessing: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleBeta = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/beta-mode`,
        {
          enabled: !betaMode.enabled,
          price: betaMode.price,
          stripe_price_id: betaMode.stripe_price_id,
          benefits: betaMode.benefits
        },
        { withCredentials: true }
      );
      
      setBetaMode(res.data.config);
      alert(res.data.message);
    } catch (err) {
      alert('Failed to toggle beta mode: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateBetaPrice = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/beta-mode`,
        betaMode,
        { withCredentials: true }
      );
      
      alert(res.data.message);
      fetchBetaMode();
    } catch (err) {
      alert('Failed to update beta price: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>Admin Panel</h2>
          <button onClick={onClose} className="admin-close">✕</button>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`admin-tab ${activeTab === 'beta' ? 'active' : ''}`}
            onClick={() => setActiveTab('beta')}
          >
            Beta Mode
          </button>
          <button
            className={`admin-tab ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            Pricing
          </button>
          <button
            className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System
          </button>
        </div>

        <div className="admin-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-section">
              <h3>Users ({users.length})</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Subscription</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="role-select"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge badge-${user.subscription_tier}`}>
                          {user.subscription_tier || 'free'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="btn btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="analytics-section">
              <h3>Analytics (Last 7 Days)</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Total Queries</h4>
                  <p className="stat-value">{analytics.analytics?.total_queries || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Unique Users</h4>
                  <p className="stat-value">{analytics.analytics?.unique_users || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Avg Response Time</h4>
                  <p className="stat-value">
                    {analytics.analytics?.avg_response_time 
                      ? `${Math.round(analytics.analytics.avg_response_time)}ms`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <h4>Recent Queries</h4>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Question</th>
                    <th>LLM</th>
                    <th>Time</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentQueries?.map(query => (
                    <tr key={query.id}>
                      <td>{query.username}</td>
                      <td className="truncate">{query.question}</td>
                      <td>{query.llm_used}</td>
                      <td>{query.response_time_ms}ms</td>
                      <td>{new Date(query.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'beta' && (
            <div className="beta-section">
              <h3>Beta Mode Configuration</h3>
              
              <div className="beta-controls">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={betaMode.enabled}
                      onChange={handleToggleBeta}
                    />
                    {' '}Enable Beta Mode
                  </label>
                </div>

                <div className="form-group">
                  <label>Beta Price ($/month)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={betaMode.price}
                    onChange={(e) => setBetaMode({...betaMode, price: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="form-group">
                  <label>Stripe Price ID</label>
                  <input
                    type="text"
                    value={betaMode.stripe_price_id || ''}
                    onChange={(e) => setBetaMode({...betaMode, stripe_price_id: e.target.value})}
                    placeholder="price_xxx"
                  />
                </div>

                <div className="form-group">
                  <label>Benefits Description</label>
                  <textarea
                    value={betaMode.benefits || ''}
                    onChange={(e) => setBetaMode({...betaMode, benefits: e.target.value})}
                    rows="3"
                  />
                </div>

                <button onClick={handleUpdateBetaPrice} className="btn btn-primary">
                  Update Beta Settings
                </button>
              </div>

              <div className="beta-stats">
                <p>Beta Users: {betaMode.beta_users_count || 0}</p>
                <p>Status: {betaMode.enabled ? '🟢 Active' : '🔴 Inactive'}</p>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="pricing-section">
              <h3>Pricing Tiers</h3>
              
              {pricing.map(tier => (
                <div key={tier.tier_key} className="pricing-tier-card">
                  <h4>{tier.name}</h4>
                  <p className="tier-price">${parseFloat(tier.price).toFixed(2)}/month</p>
                  <p className="tier-description">{tier.description}</p>
                  
                  <div className="tier-features">
                    <p><strong>Features:</strong></p>
                    <ul>
                      {tier.features && (
                        <>
                          <li>Queries: {tier.features.queries_per_day === -1 ? 'Unlimited' : tier.features.queries_per_day}/day</li>
                          <li>Uploads: {tier.features.uploads_per_month === -1 ? 'Unlimited' : tier.features.uploads_per_month}/month</li>
                          <li>File Size: {tier.features.max_file_size_mb}MB</li>
                          <li>LLMs: {tier.features.llm_access?.join(', ')}</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {tier.stripe_price_id && (
                    <p className="stripe-id">Stripe: {tier.stripe_price_id}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="system-section">
              <h3>System Operations</h3>
              
              <div className="system-controls">
                <button
                  onClick={handlePreprocess}
                  disabled={processing}
                  className="btn btn-primary"
                >
                  {processing ? 'Processing...' : 'Run Preprocessing'}
                </button>
                
                <p className="help-text">
                  This will process uploaded documents and generate embeddings in the background.
                  Check server logs for progress.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;