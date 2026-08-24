import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (res.data.user) {
          navigate('/app');
        }
      } catch (err) {
        // Stay on landing
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

      setShowLogin(false);
      navigate('/app');
    } catch (err) {
      setAuthError(err.response?.data?.error || err.response?.data?.message || 'Login failed. Please try again.');
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
        password: registerPassword,
        email: registerEmail || undefined
      }, { withCredentials: true });

      await axios.post(`${API_URL}/api/auth/login`, {
        username: registerUsername,
        password: registerPassword
      }, { withCredentials: true });

      setShowRegister(false);
      navigate('/app');
    } catch (err) {
      setAuthError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
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
    setRegisterEmail('');
    setRegisterPassword('');
    setShowRegister(true);
    setShowLogin(false);
  };

  return (
    <div className="landing-page">
      <nav className={`lp-nav${isScrolled ? ' is-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <button type="button" className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="lp-brand-mark" aria-hidden="true" />
            Space Habitats
          </button>
          <div className="lp-nav-links">
            <button type="button" className="lp-nav-text" onClick={() => navigate('/browse')}>
              Library
            </button>
            <button type="button" className="lp-nav-text" onClick={openLogin}>
              Sign in
            </button>
            <button type="button" className="lp-nav-cta" onClick={openRegister}>
              Get access
            </button>
          </div>
        </div>
      </nav>

      <header className="lp-hero">
        <p className="lp-kicker">NASA reports · arXiv · habitat engineering</p>
        <h1 className="lp-headline">
          Space habitat research,{' '}
          <em>finally queryable.</em>
        </h1>
        <p className="lp-lede">
          Ask a question in English. Get an answer drawn from the technical literature
          on gravity, radiation, life support, and settlement design — with the sources attached.
        </p>
        <div className="lp-hero-actions">
          <button type="button" className="lp-btn-primary" onClick={openRegister}>
            Create a free account
          </button>
          <button type="button" className="lp-btn-ghost" onClick={() => navigate('/browse')}>
            Browse the library
          </button>
        </div>
      </header>

      <section className="lp-product" aria-label="Product example">
        <div className="lp-product-frame">
          <div className="lp-product-bar">
            <span>Query</span>
            <span className="lp-product-meta">Cited · Grok</span>
          </div>
          <div className="lp-product-body">
            <div className="lp-msg lp-msg-user">
              What rotation rate produces 1g at a 50 meter radius?
            </div>
            <div className="lp-msg lp-msg-assistant">
              <p>
                Centripetal acceleration is <span className="lp-math">a = ω²r</span>. For 1g
                (9.81 m/s²) at r = 50 m:
              </p>
              <p className="lp-math-block">ω = √(g / r) ≈ 0.443 rad/s ≈ 4.23 rpm</p>
              <p>
                At this radius the head-to-foot gravity gradient is large; most habitat
                studies prefer radii of hundreds of meters so the rate can stay near 1–2 rpm.
              </p>
              <p className="lp-cite">NASA SP-413 · Space Settlements: A Design Study</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-section-title">What you can do</h2>
        <div className="lp-split">
          <article>
            <h3>Ask the corpus</h3>
            <p>
              Retrieval over indexed NASA technical reports and arXiv papers, then a
              model that answers in context — including LaTeX for the engineering math.
            </p>
          </article>
          <article>
            <h3>Read the sources</h3>
            <p>
              Browse the library, open documents, and pin them into a project when you
              need a working set instead of a one-off chat.
            </p>
          </article>
          <article>
            <h3>Add your own work</h3>
            <p>
              Submit research and designs with the license you choose. You keep copyright.
              Attribution stays with the work.
            </p>
          </article>
        </div>
      </section>

      <section className="lp-section lp-section-muted">
        <h2 className="lp-section-title">How a query runs</h2>
        <ol className="lp-steps">
          <li>
            <span>01</span>
            <div>
              <strong>You ask in plain language.</strong>
              Follow-ups stay in the same thread so the next question can refer to the last answer.
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>We retrieve matching passages.</strong>
              Vector search over the indexed corpus, with keyword search as fallback.
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>You get a cited reply.</strong>
              The model is constrained to that context. You can rate the answer so the corpus improves.
            </div>
          </li>
        </ol>
      </section>

      <section className="lp-section">
        <div className="lp-contribute">
          <div>
            <p className="lp-kicker">Contributions</p>
            <h2 className="lp-section-title">Your work stays yours</h2>
            <p className="lp-contribute-copy">
              Submissions keep your copyright. Choose a public Creative Commons license,
              keep a piece private for review, or set other terms. Name stays on the work.
            </p>
          </div>
          <button type="button" className="lp-btn-primary" onClick={openRegister}>
            Submit research
          </button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span>© {new Date().getFullYear()} Space Habitats</span>
          <div className="lp-footer-links">
            <button type="button" onClick={() => navigate('/browse')}>Library</button>
            <button type="button" onClick={openLogin}>Sign in</button>
          </div>
        </div>
      </footer>

      {showLogin && (
        <div className="lp-modal-overlay" onClick={() => setShowLogin(false)}>
          <div
            className="lp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="lp-modal-close" onClick={() => setShowLogin(false)} aria-label="Close">
              ×
            </button>
            <h2 id="login-title">Sign in</h2>
            <p className="lp-modal-sub">Continue to your workspace.</p>
            {authError && <div className="lp-auth-error">{authError}</div>}
            <form onSubmit={handleLogin}>
              <label>
                Username
                <input
                  type="text"
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  disabled={authLoading}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={authLoading}
                />
              </label>
              <button type="submit" className="lp-btn-primary lp-btn-block" disabled={authLoading}>
                {authLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="lp-modal-switch">
              No account?{' '}
              <button type="button" className="lp-text-btn" onClick={openRegister}>
                Create one
              </button>
            </p>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="lp-modal-overlay" onClick={() => setShowRegister(false)}>
          <div
            className="lp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="lp-modal-close" onClick={() => setShowRegister(false)} aria-label="Close">
              ×
            </button>
            <h2 id="register-title">Create an account</h2>
            <p className="lp-modal-sub">Free to start. Email is used for account recovery.</p>
            {authError && <div className="lp-auth-error">{authError}</div>}
            <form onSubmit={handleRegister}>
              <label>
                Username
                <input
                  type="text"
                  autoComplete="username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  required
                  minLength={3}
                  disabled={authLoading}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  disabled={authLoading}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={authLoading}
                />
                <small>At least 6 characters</small>
              </label>
              <button type="submit" className="lp-btn-primary lp-btn-block" disabled={authLoading}>
                {authLoading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className="lp-modal-switch">
              Already registered?{' '}
              <button type="button" className="lp-text-btn" onClick={openLogin}>
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
