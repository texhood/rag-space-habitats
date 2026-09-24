// AppNavbar.js - With User Profile Support
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AppNavbar.css';

/**
 * Top bar. Account links go to routes; onLogout ends the session.
 * @param {object} fields
 * @returns {*}
 */
function AppNavbar({ user, onLogout }) {
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

  const openLogin = () => {
    handleNavClick('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="app-navbar">
      <div className="app-navbar-container">
        {/* Logo / Home Link */}
        <div className="app-navbar-brand" onClick={() => handleNavClick('/')}>
          <span className="brand-text">Space Habitats</span>
        </div>

        {/* Main Navigation Links */}
        <div className={`app-navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            className={`nav-link ${isActive('/app') ? 'active' : ''}`}
            onClick={() => handleNavClick('/app')}
          >
            <span className="nav-text">Query</span>
          </button>

          <button
            className={`nav-link ${isActive('/browse') ? 'active' : ''}`}
            onClick={() => handleNavClick('/browse')}
          >
            <span className="nav-text">Library</span>
          </button>

          {user && (
            <button
              className={`nav-link ${isActive('/projects') ? 'active' : ''}`}
              onClick={() => handleNavClick('/projects')}
            >
              <span className="nav-text">Projects</span>
            </button>
          )}

          {user && (
            <button
              className="nav-link"
              onClick={() => handleNavClick('/submit')}
            >
              <span className="nav-text">Submit</span>
            </button>
          )}

          {/* Mobile-only menu items */}
          <div className="mobile-only-items">
            {user ? (
              <>
                <div className="mobile-user-info">
                <span className="user-name">{user.username}</span>
                  <span className="user-tier">{user.subscription_tier?.toUpperCase() || 'FREE'}</span>
                </div>
                <button
                  className="nav-link"
                  onClick={() => handleNavClick('/profile')}
                >
                  <span className="nav-text">My Account</span>
                </button>
                {user && (
                  <button
                    className="nav-link"
                    onClick={() => handleNavClick('/pricing')}
                  >
                    <span className="nav-text">Upgrade</span>
                  </button>
                )}
                {user.role === 'admin' && (
                  <button
                    className="nav-link"
                    onClick={() => handleNavClick('/admin')}
                  >
                    <span className="nav-text">Admin</span>
                  </button>
                )}
                <button className="nav-link logout-link" onClick={handleLogout}>
                  <span className="nav-text">Sign out</span>
                </button>
              </>
            ) : (
              <button
                className="nav-link"
                onClick={openLogin}
              >
                <span className="nav-text">Sign in</span>
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
                <span className="user-name">{user.username}</span>
                <span className="user-tier-badge">{user.subscription_tier?.toUpperCase() || 'FREE'}</span>
                <span className="menu-arrow">{userMenuOpen ? '\u25B2' : '\u25BC'}</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <button onClick={() => handleNavClick('/profile')}>
                    My Account
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); handleNavClick('/pricing'); }}>
                      Upgrade
                    </button>
                  {user.role === 'admin' && (
                    <button onClick={() => handleNavClick('/admin')}>
                      Admin
                    </button>
                  )}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="btn-login"
                onClick={openLogin}
              >
                Sign in
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