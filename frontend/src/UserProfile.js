// UserProfile.js - Complete User Account Management
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import './UserProfile.css';

function UserProfile({ user, onClose, onUserUpdate }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Profile data
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    created_at: null
  });
  
  // Subscription data
  const [subscription, setSubscription] = useState(null);
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Email change
  const [newEmail, setNewEmail] = useState('');
  
  // Confirmation modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch profile info
      const profileRes = await axios.get(`${API_URL}/api/account/profile`, {
        withCredentials: true
      });
      
      setProfile(profileRes.data.profile);
      setSubscription(profileRes.data.subscription);
      setNewEmail(profileRes.data.profile.email || '');
      
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.put(`${API_URL}/api/account/email`, 
        { email: newEmail },
        { withCredentials: true }
      );
      
      setSuccess('Email updated successfully!');
      setProfile(prev => ({ ...prev, email: newEmail }));
      
      if (onUserUpdate) {
        onUserUpdate({ ...user, email: newEmail });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.put(`${API_URL}/api/account/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        { withCredentials: true }
      );
      
      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelScheduledChange = async () => {
    setSaving(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/api/subscriptions/cancel-scheduled-change`, {}, {
        withCredentials: true
      });
      
      setSuccess('Scheduled change cancelled. Your current plan will continue.');
      setSubscription(prev => ({
        ...prev,
        scheduled_tier: null,
        scheduled_change_date: null,
        cancel_at_period_end: false
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel scheduled change');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setSaving(true);
    
    try {
      const res = await axios.post(`${API_URL}/api/subscriptions/create-portal-session`, {}, {
        withCredentials: true
      });
      
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open billing portal');
      setSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    setSaving(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/api/subscriptions/cancel`, {}, {
        withCredentials: true
      });
      
      setSuccess('Subscription cancelled. You will retain access until the end of your billing period.');
      setShowCancelModal(false);
      fetchProfileData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user.username) {
      setError('Please type your username correctly to confirm');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await axios.delete(`${API_URL}/api/account`, {
        withCredentials: true
      });
      
      // Log out and redirect
      window.location.href = '/?deleted=true';
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-modal-overlay">
        <div className="profile-modal">
          <p className="loading-text">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <h1>{profile.username}</h1>
          <span className="tier-badge">{user?.subscription_tier?.toUpperCase() || 'FREE'}</span>
        </div>

        {/* Navigation */}
        <div className="profile-nav">
          <button 
            className={activeSection === 'profile' ? 'active' : ''}
            onClick={() => setActiveSection('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={activeSection === 'subscription' ? 'active' : ''}
            onClick={() => setActiveSection('subscription')}
          >
            💳 Subscription
          </button>
          <button 
            className={activeSection === 'security' ? 'active' : ''}
            onClick={() => setActiveSection('security')}
          >
            🔒 Security
          </button>
        </div>

        {/* Messages */}
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="profile-section">
            <h2>Profile Information</h2>
            
            <div className="info-group">
              <label>Username</label>
              <div className="info-value">{profile.username}</div>
              <span className="info-hint">Username cannot be changed</span>
            </div>

            <form onSubmit={handleEmailUpdate}>
              <div className="info-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                <span className="info-hint">Used for password recovery and notifications</span>
              </div>
              <button type="submit" className="btn-primary" disabled={saving || newEmail === profile.email}>
                {saving ? 'Saving...' : 'Update Email'}
              </button>
            </form>

            <div className="info-group">
              <label>Member Since</label>
              <div className="info-value">{formatDate(profile.created_at)}</div>
            </div>
          </div>
        )}

        {/* Subscription Section */}
        {activeSection === 'subscription' && (
          <div className="profile-section">
            <h2>Subscription</h2>

            <div className="subscription-card">
              <div className="subscription-header">
                <div>
                  <h3>{subscription?.tier?.toUpperCase() || user?.subscription_tier?.toUpperCase() || 'FREE'}</h3>
                  <span className={`status-badge ${subscription?.status || 'active'}`}>
                    {subscription?.status || 'Active'}
                  </span>
                </div>
                {subscription?.tier && subscription.tier !== 'free' && (
                  <div className="subscription-price">
                    ${parseFloat(subscription.price || 0).toFixed(2)}/mo
                  </div>
                )}
              </div>

              {subscription?.current_period_end && subscription.tier !== 'free' && (
                <div className="billing-info-row">
                  <span className="label">Next billing date:</span>
                  <span className="value">{formatDate(subscription.current_period_end)}</span>
                </div>
              )}

              {/* Pending Change Alert */}
              {(subscription?.scheduled_tier || subscription?.cancel_at_period_end) && (
                <div className="pending-change-alert">
                  <h4>⚠️ Pending Change</h4>
                  {subscription.cancel_at_period_end ? (
                    <p>Your subscription will be cancelled on {formatDate(subscription.current_period_end)}</p>
                  ) : (
                    <p>
                      Your plan will change to <strong>{subscription.scheduled_tier?.toUpperCase()}</strong> on {formatDate(subscription.scheduled_change_date || subscription.current_period_end)}
                    </p>
                  )}
                  <button 
                    className="btn-secondary"
                    onClick={handleCancelScheduledChange}
                    disabled={saving}
                  >
                    {saving ? 'Processing...' : 'Cancel Scheduled Change'}
                  </button>
                </div>
              )}

              {/* Features Summary */}
              <div className="features-summary">
                <h4>Your Plan Includes:</h4>
                <ul>
                  <li>✓ {subscription?.features?.queries_per_day === -1 ? 'Unlimited' : (subscription?.features?.queries_per_day || 10)} queries/day</li>
                  <li>✓ {subscription?.features?.uploads_per_month === -1 ? 'Unlimited' : (subscription?.features?.uploads_per_month || 0)} uploads/month</li>
                  <li>✓ {subscription?.features?.max_file_size_mb || 0}MB max file size</li>
                  <li>✓ {Array.isArray(subscription?.features?.llm_access) 
                    ? subscription.features.llm_access.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' + ')
                    : 'Grok'} AI</li>
                </ul>
              </div>
            </div>

            <div className="subscription-actions">
              {subscription?.tier !== 'free' && subscription?.stripe_subscription_id && (
                <button 
                  className="btn-secondary"
                  onClick={handleOpenBillingPortal}
                  disabled={saving}
                >
                  💳 Manage Billing & Payment
                </button>
              )}
              
              <button 
                className="btn-primary"
                onClick={onClose}
              >
                ⚡ Change Plan
              </button>
            </div>

            {/* Cancel Subscription */}
            {subscription?.tier !== 'free' && !subscription?.cancel_at_period_end && (
              <div className="danger-zone">
                <h4>Cancel Subscription</h4>
                <p>If you cancel, you'll retain access until {formatDate(subscription?.current_period_end)}.</p>
                <button 
                  className="btn-danger"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="profile-section">
            <h2>Security</h2>

            <form onSubmit={handlePasswordChange}>
              <h3>Change Password</h3>
              
              <div className="info-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="info-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <div className="info-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>

            {/* Delete Account */}
            <div className="danger-zone">
              <h4>Delete Account</h4>
              <p>This action is permanent and cannot be undone. All your data will be deleted.</p>
              <button 
                className="btn-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete My Account
              </button>
            </div>
          </div>
        )}

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <div className="confirm-overlay">
            <div className="confirm-modal">
              <h2>Cancel Subscription?</h2>
              <p>Are you sure you want to cancel your subscription?</p>
              <p className="highlight">
                You'll retain access to {subscription?.tier?.toUpperCase()} features until {formatDate(subscription?.current_period_end)}.
              </p>
              <p>After that, your account will revert to the Free plan.</p>
              <div className="confirm-actions">
                <button 
                  className="btn-danger"
                  onClick={handleCancelSubscription}
                  disabled={saving}
                >
                  {saving ? 'Cancelling...' : 'Yes, Cancel Subscription'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep My Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="confirm-overlay">
            <div className="confirm-modal delete-modal">
              <h2>⚠️ Delete Account</h2>
              <p><strong>This action cannot be undone.</strong></p>
              <p>All your data, including query history and submissions, will be permanently deleted.</p>
              {subscription?.tier !== 'free' && (
                <p className="warning">Your subscription will also be cancelled immediately with no refund.</p>
              )}
              <div className="info-group">
                <label>Type <strong>{user.username}</strong> to confirm:</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={user.username}
                />
              </div>
              <div className="confirm-actions">
                <button 
                  className="btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={saving || deleteConfirmText !== user.username}
                >
                  {saving ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;