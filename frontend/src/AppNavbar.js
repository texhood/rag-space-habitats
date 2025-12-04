// AppNavbar.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AppNavbar.css';

function AppNavbar({ user, onLogout, onShowAdmin, onShowSubmit, onShowPricing }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="app-navbar">
      <div className="app-navbar-container">
        {/* Logo / Home Link */}
        <div className="app-navbar-brand" onClick={() => navigate('/')}>
          <span className="brand-icon">🚀</span>
          <span className="brand-text">Space Habitats</span>
        </div>

        {/* Main Navigation Links */}
        <div className="app-navbar-links">
          <button
            className={`nav-link ${isActive('/app') ? 'active' : ''}`}
            onClick={() => navigate('/app')}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-text">Ask Questions</span>
          </button>

          <button
            className={`nav-link ${isActive('/browse') ? 'active' : ''}`}
            onClick={() => navigate('/browse')}
          >
            <span className="nav-icon">📚</span>
            <span className="nav-text">Browse</span>
          </button>

          {user && onShowSubmit && (
            <button
              className="nav-link"
              onClick={() => onShowSubmit(true)}
            >
              <span className="nav-icon">📤</span>
              <span className="nav-text">Submit</span>
            </button>
          )}
        </div>

        {/* User Menu */}
        <div className="app-navbar-user">
          {user ? (
            <div className="user-menu-container">
              <button 
                className="user-menu-trigger"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className="user-avatar">👤</span>
                <span className="user-name">{user.username}</span>
                <span className="menu-arrow">{menuOpen ? '▲' : '▼'}</span>
              </button>

              {menuOpen && (
                <div className="user-dropdown">
                  {onShowPricing && (
                    <button onClick={() => { setMenuOpen(false); onShowPricing(true); }}>
                      ⚡ Upgrade
                    </button>
                  )}
                  {user.role === 'admin' && onShowAdmin && (
                    <button onClick={() => { setMenuOpen(false); onShowAdmin(true); }}>
                      🛠️ Admin Panel
                    </button>
                  )}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="btn-login"
                onClick={() => navigate('/app')}
              >
                Login
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div 
          className="menu-backdrop" 
          onClick={() => setMenuOpen(false)}
        />
      )}
    </nav>
  );
}

export default AppNavbar;