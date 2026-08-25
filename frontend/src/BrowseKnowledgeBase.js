// BrowseKnowledgeBase.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import AppNavbar from './AppNavbar';
import SubmitContent from './SubmitContent';
import AdminPanel from './AdminPanel';
import PricingPage from './PricingPage';
import './AppNavbar.css';
import './BrowseKnowledgeBase.css';
import { formatCorpusLabel } from './queryStarters';

function BrowseKnowledgeBase() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auth state
  const [user, setUser] = useState(null);
  
  // Modal states (for navbar)
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [license, setLicense] = useState('all');
  const [source, setSource] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [corpusStats, setCorpusStats] = useState(null);
  
  // Results state
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Selected document for viewing
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
    fetchCategories();
    axios.get(`${API_URL}/api/rag/stats`)
      .then((res) => setCorpusStats(res.data))
      .catch(() => setCorpusStats(null));
  }, []);

  // Fetch submissions when filters change
  useEffect(() => {
    fetchSubmissions();
    // Search text is applied on submit via handleSearch, not on each keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, license, source, sortBy, dateFrom, dateTo]);

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
      setUser(res.data.user);
    } catch (err) {
      setUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/submissions/categories`);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (category !== 'all') params.append('category', category);
      if (license !== 'all') params.append('license', license);
      if (source !== 'all') params.append('source', source);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('sort', sortBy);
      params.append('page', page);
      params.append('limit', 12);

      const res = await axios.get(`${API_URL}/api/submissions/browse?${params.toString()}`);
      
      setSubmissions(res.data.submissions || []);
      setTotalPages(res.data.pages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setError('Failed to load submissions. Please try again.');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, license, source, sortBy, dateFrom, dateTo, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setLicense('all');
    setSource('all');
    setSortBy('newest');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const viewDocument = async (docId, { fromUrl } = {}) => {
    if (!fromUrl) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('doc', docId);
        return next;
      }, { replace: true });
    }
    setLoadingDoc(true);
    try {
      let submission;
      try {
        const res = await axios.get(`${API_URL}/api/submissions/${docId}`, {
          withCredentials: true
        });
        submission = res.data.submission;
      } catch (err) {
        if (err.response?.status !== 404) {
          throw err;
        }
        const fallback = await axios.get(`${API_URL}/api/rag/documents/${docId}`);
        submission = fallback.data.submission;
      }
      setSelectedDoc(submission);
    } catch (err) {
      console.error('Failed to fetch document:', err);
      alert('Failed to load document');
    } finally {
      setLoadingDoc(false);
    }
  };

  const closeDocument = () => {
    setSelectedDoc(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('doc');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (!docId) {
      return undefined;
    }
    viewDocument(docId, { fromUrl: true });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDoc) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDocument();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDoc]);

  const getSourceUrl = (doc) => {
    if (!doc) return null;
    if (doc.pdfUrl) return doc.pdfUrl;
    if (doc.url) return doc.url;
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLicenseInfo = (licenseType) => {
    const licenses = {
      'cc-by': { icon: '🌐', label: 'CC BY 4.0' },
      'cc-by-sa': { icon: '🔄', label: 'CC BY-SA 4.0' },
      'cc-by-nc': { icon: '🚫💰', label: 'CC BY-NC 4.0' },
      'CC-BY': { icon: '🌐', label: 'CC BY' },
      'Public Domain (U.S. Government Work)': { icon: '🇺🇸', label: 'U.S. Public Domain' },
      'Public Domain': { icon: '🌐', label: 'Public Domain' },
      'arXiv Non-exclusive License': { icon: '📄', label: 'arXiv License' },
      'arXiv Non-exclusive': { icon: '📄', label: 'arXiv License' },
      'private': { icon: '🔒', label: 'Private' }
    };
    return licenses[licenseType] || { icon: '📄', label: 'Unknown' };
  };

  const getSourceLabel = (doc) => {
    const raw = String(doc?.source || '').toLowerCase();
    if (raw === 'ntrs' || raw.includes('nasa')) return 'NASA';
    if (raw.includes('arxiv')) return 'arXiv';
    if (doc?.submitted_by_username === 'crawler') return 'Corpus';
    return 'Community';
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      'general': 'General',
      'habitat-design': 'Habitat Design',
      'life-support': 'Life Support',
      'propulsion': 'Propulsion',
      'construction': 'Construction',
      'materials': 'Materials Science',
      'research': 'Research Paper',
      'technical': 'Technical Docs'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="App">
      <AppNavbar
        user={user}
        onLogout={handleLogout}
        onShowAdmin={setShowAdmin}
        onShowSubmit={setShowSubmit}
        onShowPricing={setShowPricing}
      />

      <main className="browse-main">
        <div className="browse-header">
          <h1>Library</h1>
          <p>NASA reports, arXiv papers, and community submissions — the same collection Query searches.</p>
          {formatCorpusLabel(corpusStats) ? (
            <p className="browse-corpus-stats">{formatCorpusLabel(corpusStats)}</p>
          ) : null}
        </div>

        {/* Search and Filters */}
        <div className="browse-controls">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, tags, or author..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </form>

          <div className="filters-row">
            <div className="filter-group">
              <label>Category</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {getCategoryLabel(cat.name)} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Collection</label>
              <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
                <option value="all">All sources</option>
                <option value="ntrs">NASA NTRS</option>
                <option value="arxiv">arXiv</option>
                <option value="community">Community</option>
              </select>
            </div>

            <div className="filter-group">
              <label>License</label>
              <select value={license} onChange={(e) => { setLicense(e.target.value); setPage(1); }}>
                <option value="all">All Licenses</option>
                <option value="Public Domain (U.S. Government Work)">U.S. Public Domain</option>
                <option value="arXiv Non-exclusive License">arXiv License</option>
                <option value="cc-by">CC BY 4.0</option>
                <option value="cc-by-sa">CC BY-SA 4.0</option>
                <option value="cc-by-nc">CC BY-NC 4.0</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            <div className="filter-group">
              <label>From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>

            <div className="filter-group">
              <label>To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>

            <button onClick={handleClearFilters} className="clear-filters-btn">
              ✕ Clear
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="results-info">
          {loading ? (
            <span>Searching...</span>
          ) : (
            <span>Found {totalCount} document{totalCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="browse-error">
            ⚠️ {error}
          </div>
        )}

        {/* Results Grid */}
        <div className="submissions-grid">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">🔭</span>
              <h3>No documents found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            submissions.map((doc) => (
              <div key={doc._id} className="submission-card" onClick={() => viewDocument(doc._id)}>
                <div className="card-header">
                  <span className="card-category">{getCategoryLabel(doc.category)}</span>
                  <span className="card-source">{getSourceLabel(doc)}</span>
                  <span className="card-license" title={getLicenseInfo(doc.license).label}>
                    {getLicenseInfo(doc.license).icon}
                  </span>
                </div>
                
                <h3 className="card-title">{doc.title}</h3>
                
                {doc.description && (
                  <p className="card-description">{doc.description}</p>
                )}
                
                {doc.content_preview && (
                  <p className="card-preview">{doc.content_preview}</p>
                )}
                
                {doc.tags && doc.tags.length > 0 && (
                  <div className="card-tags">
                    {doc.tags.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                    {doc.tags.length > 4 && (
                      <span className="tag more">+{doc.tags.length - 4}</span>
                    )}
                  </div>
                )}
                
                <div className="card-footer">
                  <span className="card-author">
                    👤 {doc.attribution || doc.submitted_by_username || 'Anonymous'}
                  </span>
                  <span className="card-date">
                    {formatDate(doc.created_at || doc.submitted_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="page-btn"
            >
              ← Previous
            </button>
            
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="page-btn"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div className="library-viewer-overlay" onClick={closeDocument}>
          <div
            className="library-viewer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-viewer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="library-viewer-header">
              <h2 id="document-viewer-title">{selectedDoc.title}</h2>
              <button
                type="button"
                className="library-viewer-close"
                onClick={closeDocument}
                aria-label="Close document"
              >
                Close
              </button>
            </div>

            <div className="library-viewer-body">
              <div className="library-viewer-meta">
                <span className="library-meta-item">
                  <strong>Author:</strong> {selectedDoc.attribution || selectedDoc.submitted_by_username || 'Unknown'}
                </span>
                <span className="library-meta-item">
                  <strong>Source:</strong> {getSourceLabel(selectedDoc)}
                </span>
                <span className="library-meta-item">
                  <strong>Category:</strong> {getCategoryLabel(selectedDoc.category)}
                </span>
                <span className="library-meta-item">
                  <strong>License:</strong> {getLicenseInfo(selectedDoc.license).label}
                </span>
                <span className="library-meta-item">
                  <strong>Added:</strong> {formatDate(selectedDoc.created_at || selectedDoc.submitted_at)}
                </span>
              </div>

              {selectedDoc.description &&
                selectedDoc.description !== selectedDoc.content && (
                <div className="library-viewer-section">
                  <h3>Description</h3>
                  <p>{selectedDoc.description}</p>
                </div>
              )}

              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="library-viewer-section">
                  <h3>Tags</h3>
                  <div className="tags-list">
                    {selectedDoc.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="library-viewer-section">
                <h3>
                  {selectedDoc.content && selectedDoc.content === selectedDoc.description
                    ? 'Abstract'
                    : 'Content'}
                </h3>
                <div className="library-viewer-text">
                  {selectedDoc.content || selectedDoc.description || 'No text is stored for this document.'}
                </div>
                {getSourceUrl(selectedDoc) && (
                  <a
                    className="library-source-link"
                    href={getSourceUrl(selectedDoc)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open original source
                  </a>
                )}
              </div>
            </div>

            <div className="library-viewer-footer">
              <p>
                {selectedDoc.license !== 'private' ? (
                  <>
                    This document is shared under {getLicenseInfo(selectedDoc.license).label}.
                    {selectedDoc.license?.toLowerCase().startsWith('cc') && (
                      <> Please credit: {selectedDoc.attribution || selectedDoc.submitted_by_username}</>
                    )}
                  </>
                ) : (
                  <>This document is private.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {loadingDoc && (
        <div className="library-viewer-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading document...</p>
          </div>
        </div>
      )}

      {/* Modals from navbar actions */}
      {showAdmin && user?.role === 'admin' && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      {showSubmit && (
        <SubmitContent 
          user={user}
          onClose={() => setShowSubmit(false)}
        />
      )}

      {showPricing && (
        <PricingPage
          user={user}
          onClose={() => setShowPricing(false)}
        />
      )}
    </div>
  );
}

export default BrowseKnowledgeBase;