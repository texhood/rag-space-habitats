// ProjectsPage.js - Projects page wrapper with navbar
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import AppNavbar from './AppNavbar';
import ProjectList from './ProjectList';
import AdminPanel from './AdminPanel';
import PricingPage from './PricingPage';
import UserProfile from './UserProfile';
import SubmitContent from './SubmitContent';

function ProjectsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true
      });
      setUser(res.data.user);
    } catch (err) {
      // Not authenticated, redirect to login
      navigate('/app?login=true');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  // Check if user has access to projects
  if (!user || (user.subscription_tier !== 'enterprise' && user.role !== 'admin')) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Projects require an Enterprise subscription.</p>
        <button onClick={() => navigate('/pricing')}>Upgrade to Enterprise</button>
      </div>
    );
  }

  return (
    <div className="App">
      <AppNavbar
        user={user}
        onLogout={handleLogout}
        onShowAdmin={setShowAdmin}
        onShowSubmit={setShowSubmit}
        onShowPricing={setShowPricing}
        onShowProfile={setShowProfile}
      />

      <main className="App-main">
        <ProjectList />
      </main>

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

export default ProjectsPage;
