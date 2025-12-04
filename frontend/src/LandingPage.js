// LandingPage.js - Playful & Fun Landing Page with Login Modal
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  // Auth modal state
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (res.data.user) {
          // User is already logged in, redirect to app
          navigate('/app');
        }
      } catch (err) {
        // Not logged in, stay on landing page
      }
    };
    checkExistingAuth();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        username: loginUsername,
        password: loginPassword
      }, { withCredentials: true });

      // Success - navigate to app
      setShowLogin(false);
      navigate('/app');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        username: registerUsername,
        password: registerPassword
      }, { withCredentials: true });

      // Success - navigate to app
      setShowRegister(false);
      navigate('/app');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const openLogin = () => {
    setAuthError('');
    setLoginUsername('');
    setLoginPassword('');
    setShowLogin(true);
    setShowRegister(false);
  };

  const openRegister = () => {
    setAuthError('');
    setRegisterUsername('');
    setRegisterPassword('');
    setShowRegister(true);
    setShowLogin(false);
  };

  const switchToRegister = () => {
    setAuthError('');
    setShowLogin(false);
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setAuthError('');
    setShowRegister(false);
    setShowLogin(true);
  };

  const handleGetStarted = () => {
    navigate('/app');
  };

  const handleBrowse = () => {
    navigate('/browse');
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className={`landing-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🎮</span>
            <span className="logo-text">HABITAT BUILDER</span>
          </div>
          <div className="nav-buttons">
            <button onClick={openLogin} className="btn-nav-login">
              Login
            </button>
            <button onClick={openRegister} className="btn-nav-signup">
              Join Beta
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="sparkle">✨</span>
            DESIGN THE FUTURE OF HUMANITY IN SPACE
            <span className="sparkle">✨</span>
          </h1>
          <p className="hero-subtitle">
            🚀 Learn, share, and collaborate on space habitat design
          </p>
          
          <div className="hero-mission">
            <div className="mission-item">
              <span className="mission-icon">📚</span>
              <p>A place to <strong>learn and share</strong> about space habitat design</p>
            </div>
            <div className="mission-item">
              <span className="mission-icon">💡</span>
              <p>A place to <strong>contribute</strong> to the conversation with your own research and ideas</p>
            </div>
            <div className="mission-item">
              <span className="mission-icon">🌟</span>
              <p>A place to <strong>have fun</strong> while helping to become a spacefaring species</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="habitat-spinner">
              <div className="spinner-ring ring-1"></div>
              <div className="spinner-ring ring-2"></div>
              <div className="spinner-ring ring-3"></div>
              <div className="spinner-center">
                <span className="spinner-icon">🛸</span>
                <p className="spinner-text">AI-Powered Knowledge Base</p>
                <p className="spinner-subtext">Ask questions, get answers</p>
              </div>
            </div>
          </div>

          <div className="hero-cta-buttons">
            <button onClick={handleGetStarted} className="btn-hero-primary">
              🎯 Start Exploring
            </button>
            <button onClick={handleBrowse} className="btn-hero-secondary">
              📚 Browse Knowledge Base
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="features-heading">What You Can Do Here</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3 className="feature-title">Ask AI Anything</h3>
            <p className="feature-description">
              Get instant answers about gravity, radiation, life support, and more from our AI-powered knowledge base
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3 className="feature-title">Learn from Research</h3>
            <p className="feature-description">
              Access curated research papers, design documents, and engineering specifications from experts worldwide
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3 className="feature-title">Share Your Ideas</h3>
            <p className="feature-description">
              Submit your own research, designs, and concepts to contribute to the growing knowledge base
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3 className="feature-title">Join the Community</h3>
            <p className="feature-description">
              Connect with engineers, researchers, and enthusiasts working to make humanity a spacefaring species
            </p>
          </div>
        </div>
      </section>

      {/* Licensing Section */}
      <section className="licensing-section">
        <div className="licensing-container">
          <h2 className="licensing-title">
            🎁 YOUR CONTRIBUTIONS, YOUR RIGHTS
          </h2>
          
          <p className="licensing-intro">
            Share your research and ideas with the space habitat community!
          </p>

          <ul className="licensing-benefits">
            <li>You retain full copyright ownership of everything you submit</li>
            <li>Choose how your work is licensed (Creative Commons, Private, or other options)</li>
            <li>Get proper attribution - your name stays with your work</li>
            <li>Help advance humanity's journey to becoming a spacefaring species</li>
            <li>Optional: Keep submissions private for review only, or share them publicly</li>
          </ul>

          <p className="licensing-attribution">
            All contributions are properly attributed. You decide how your work is shared.
          </p>

          <div className="licensing-buttons">
            <button onClick={openRegister} className="btn-license-info">
              📤 Submit Your Research
            </button>
            <button onClick={() => navigate('/licensing')} className="btn-license-legal">
              📜 Learn About Licensing
            </button>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="community-section">
        <h2 className="community-title">🌟 BE PART OF SOMETHING BIGGER</h2>
        
        <p className="community-mission">
          Join researchers, engineers, students, and space enthusiasts collaborating 
          to solve the challenges of living beyond Earth.
        </p>

        <div className="achievements-grid">
          <div className="achievement-card">
            <div className="achievement-avatar">👨‍🚀</div>
            <div className="achievement-content">
              Recent: <strong>Mars Habitat Analysis</strong> submitted by @JohnD - exploring regolith-based construction methods
            </div>
          </div>

          <div className="achievement-card">
            <div className="achievement-avatar">👩‍🔬</div>
            <div className="achievement-content">
              Recent: <strong>Radiation Shielding Study</strong> from @SarahM - new approaches to cosmic ray protection
            </div>
          </div>

          <div className="achievement-card">
            <div className="achievement-avatar">👨‍💻</div>
            <div className="achievement-content">
              Recent: <strong>O'Neill Cylinder Research</strong> by @AlexK - updated rotation calculations for 1g gravity
            </div>
          </div>
        </div>

        <p className="community-stats">
          Together, we're building the knowledge foundation for humanity's future in space
        </p>

        <button onClick={openRegister} className="btn-community-join">
          🚀 Start Contributing Today
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <p className="footer-copyright">
            © 2025 Habitat Builder. Making space habitat design fun and accessible.
          </p>
          <div className="footer-links">
            <a href="/about">About</a>
            <a href="/discord">Discord</a>
            <a href="/twitter">Twitter</a>
            <a href="/docs">Documentation</a>
            <a href="/licensing">Legal & Licensing</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLogin(false)}>✕</button>
            <h2>🚀 Welcome Back!</h2>
            <p className="modal-subtitle">Login to continue your journey</p>
            
            {authError && (
              <div className="auth-error">
                ⚠️ {authError}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={authLoading}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={authLoading}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
            
            <p className="modal-switch">
              Don't have an account?{' '}
              <button onClick={switchToRegister} className="btn-link">
                Sign up here
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRegister(false)}>✕</button>
            <h2>🌟 Join the Community!</h2>
            <p className="modal-subtitle">Create your free account</p>
            
            {authError && (
              <div className="auth-error">
                ⚠️ {authError}
              </div>
            )}
            
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  disabled={authLoading}
                  minLength={3}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  disabled={authLoading}
                  minLength={6}
                />
                <small>Minimum 6 characters</small>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </form>
            
            <p className="modal-switch">
              Already have an account?{' '}
              <button onClick={switchToLogin} className="btn-link">
                Login here
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;