// BrowseKnowledgeBase.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import AppNavbar from './AppNavbar';
import './AppNavbar.css';
import './BrowseKnowledgeBase.css';

function BrowseKnowledgeBase() {
  const navigate = useNavigate();
  
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
  const [sortBy, setSortBy] = useState('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
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
  }, []);

  // Fetch submissions when filters change
  useEffect(() => {
    fetchSubmissions();
  }, [page, category, license, sortBy, dateFrom, dateTo]);

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
  }, [searchQuery, category, license, sortBy, dateFrom, dateTo, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setLicense('all');
    setSortBy('newest');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const viewDocument = async (docId) => {
    setLoadingDoc(true);
    try {
      const res = await axios.get(`${API_URL}/api/submissions/${docId}`);
      setSelectedDoc(res.data.submission);
    } catch (err) {
      console.error('Failed to fetch document:', err);
      alert('Failed to load document');
    } finally {
      setLoadingDoc(false);
    }
  };

  const closeDocument = () => {
    setSelectedDoc(null);
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
      'cc-by': { icon: '🌍', label: 'CC BY 4.0' },
      'cc-by-sa': { icon: '🔄', label: 'CC BY-SA 4.0' },
      'cc-by-nc': { icon: '🚫💰', label: 'CC BY-NC 4.0' },
      'private': { icon: '🔒', label: 'Private' }
    };
    return licenses[licenseType] || { icon: '📄', label: 'Unknown' };
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
          <h1>📚 Browse Knowledge Base</h1>
          <p>Explore community-contributed space habitat documents and research</p>
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
              🔍 Search
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
              <label>License</label>
              <select value={license} onChange={(e) => { setLicense(e.target.value); setPage(1); }}>
                <option value="all">All Licenses</option>
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
              <span className="no-results-icon">📭</span>
              <h3>No documents found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            submissions.map((doc) => (
              <div key={doc._id} className="submission-card" onClick={() => viewDocument(doc._id)}>
                <div className="card-header">
                  <span className="card-category">{getCategoryLabel(doc.category)}</span>
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
        <div className="modal-overlay" onClick={closeDocument}>
          <div className="document-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h2>{selectedDoc.title}</h2>
              <button className="close-btn" onClick={closeDocument}>✕</button>
            </div>
            
            <div className="viewer-meta">
              <span className="meta-item">
                <strong>Author:</strong> {selectedDoc.attribution || selectedDoc.submitted_by_username}
              </span>
              <span className="meta-item">
                <strong>Category:</strong> {getCategoryLabel(selectedDoc.category)}
              </span>
              <span className="meta-item">
                <strong>License:</strong> {getLicenseInfo(selectedDoc.license).icon} {getLicenseInfo(selectedDoc.license).label}
              </span>
              <span className="meta-item">
                <strong>Added:</strong> {formatDate(selectedDoc.created_at || selectedDoc.submitted_at)}
              </span>
            </div>

            {selectedDoc.description && (
              <div className="viewer-description">
                <strong>Description:</strong>
                <p>{selectedDoc.description}</p>
              </div>
            )}

            {selectedDoc.tags && selectedDoc.tags.length > 0 && (
              <div className="viewer-tags">
                <strong>Tags:</strong>
                <div className="tags-list">
                  {selectedDoc.tags.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="viewer-content">
              <strong>Content:</strong>
              <div className="content-text">
                {selectedDoc.content}
              </div>
            </div>

            <div className="viewer-footer">
              <p className="license-notice">
                {selectedDoc.license !== 'private' ? (
                  <>
                    📜 This document is shared under <strong>{getLicenseInfo(selectedDoc.license).label}</strong>.
                    {selectedDoc.license.startsWith('cc') && (
                      <> Please credit: <strong>{selectedDoc.attribution || selectedDoc.submitted_by_username}</strong></>
                    )}
                  </>
                ) : (
                  <>🔒 This document is private.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {loadingDoc && (
        <div className="modal-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading document...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrowseKnowledgeBase;