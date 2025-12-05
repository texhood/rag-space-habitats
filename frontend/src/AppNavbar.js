// AppNavbar.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AppNavbar.css';

function AppNavbar({ user, onLogout, onShowAdmin, onShowSubmit, onShowPricing }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleActionClick = (action) => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    if (action) {
      action(true);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="app-navbar">
      <div className="app-navbar-container">
        {/* Logo / Home Link */}
        <div className="app-navbar-brand" onClick={() => handleNavClick('/')}>
          <span className="brand-icon" role="img" aria-label="rocket">&#128640;</span>
          <span className="brand-text">Space Habitats</span>
        </div>

        {/* Main Navigation Links */}
        <div className={`app-navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            className={`nav-link ${isActive('/app') ? 'active' : ''}`}
            onClick={() => handleNavClick('/app')}
          >
            <span className="nav-icon" role="img" aria-label="search">&#128269;</span>
            <span className="nav-text">Ask Questions</span>
          </button>

          <button
            className={`nav-link ${isActive('/browse') ? 'active' : ''}`}
            onClick={() => handleNavClick('/browse')}
          >
            <span className="nav-icon" role="img" aria-label="books">&#128218;</span>
            <span className="nav-text">Browse</span>
          </button>

          {user && onShowSubmit && (
            <button
              className="nav-link"
              onClick={() => handleActionClick(onShowSubmit)}
            >
              <span className="nav-icon" role="img" aria-label="upload">&#128228;</span>
              <span className="nav-text">Submit</span>
            </button>
          )}

          {/* Mobile-only menu items */}
          <div className="mobile-only-items">
            {user ? (
              <>
                <div className="mobile-user-info">
                  <span className="user-avatar" role="img" aria-label="user">&#128100;</span>
                  <span className="user-name">{user.username}</span>
                </div>
                {onShowPricing && (
                  <button
                    className="nav-link"
                    onClick={() => handleActionClick(onShowPricing)}
                  >
                    <span className="nav-icon" role="img" aria-label="lightning">&#9889;</span>
                    <span className="nav-text">Upgrade</span>
                  </button>
                )}
                {user.role === 'admin' && onShowAdmin && (
                  <button
                    className="nav-link"
                    onClick={() => handleActionClick(onShowAdmin)}
                  >
                    <span className="nav-icon" role="img" aria-label="tools">&#128736;</span>
                    <span className="nav-text">Admin Panel</span>
                  </button>
                )}
                <button className="nav-link logout-link" onClick={handleLogout}>
                  <span className="nav-icon" role="img" aria-label="door">&#128682;</span>
                  <span className="nav-text">Logout</span>
                </button>
              </>
            ) : (
              <button
                className="nav-link"
                onClick={() => handleNavClick('/app?login=true')}
              >
                <span className="nav-icon" role="img" aria-label="key">&#128273;</span>
                <span className="nav-text">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop User Menu */}
        <div className="app-navbar-user desktop-only">
          {user ? (
            <div className="user-menu-container">
              <button 
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="user-avatar" role="img" aria-label="user">&#128100;</span>
                <span className="user-name">{user.username}</span>
                <span className="menu-arrow">{userMenuOpen ? '\u25B2' : '\u25BC'}</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  {onShowPricing && (
                    <button onClick={() => { setUserMenuOpen(false); onShowPricing(true); }}>
                      <span role="img" aria-label="lightning">&#9889;</span> Upgrade
                    </button>
                  )}
                  {user.role === 'admin' && onShowAdmin && (
                    <button onClick={() => { setUserMenuOpen(false); onShowAdmin(true); }}>
                      <span role="img" aria-label="tools">&#128736;</span> Admin Panel
                    </button>
                  )}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout}>
                    <span role="img" aria-label="door">&#128682;</span> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="btn-login"
                onClick={() => navigate('/app?login=true')}
              >
                Login
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '\u2715' : '\u2630'}
        </button>
      </div>

      {/* Click outside to close menus */}
      {(userMenuOpen || mobileMenuOpen) && (
        <div 
          className="menu-backdrop" 
          onClick={() => {
            setUserMenuOpen(false);
            setMobileMenuOpen(false);
          }}
        />
      )}
    </nav>
  );
}

export default AppNavbar;