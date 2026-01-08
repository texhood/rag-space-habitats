// DocumentPinner.js - Search and pin knowledge base documents to project
import React, { useState } from 'react';
import axios from 'axios';
import API_URL from './config';
import './DocumentPinner.css';

function DocumentPinner({ projectId, onPin, maxPinned = 20, currentPinnedCount = 0 }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      // Search knowledge base documents (enterprise endpoint)
      const response = await axios.get(
        `${API_URL}/api/projects/knowledge-base/search`,
        {
          params: { query: searchQuery.trim() },
          withCredentials: true
        }
      );

      setSearchResults(response.data.documents || []);

      if (response.data.documents.length === 0) {
        setError('No documents found matching your search');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handlePin = async (doc) => {
    if (currentPinnedCount >= maxPinned) {
      alert(`Maximum ${maxPinned} pinned documents reached`);
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/projects/${projectId}/pinned`,
        {
          mongoId: doc._id,
          documentTitle: doc.title,
          documentSource: doc.source
        },
        { withCredentials: true }
      );

      // Remove from search results
      setSearchResults(prev => prev.filter(d => d._id !== doc._id));

      if (onPin) {
        onPin();
      }

      alert('Document pinned successfully');
    } catch (err) {
      console.error('Pin error:', err);
      alert(err.response?.data?.error || 'Failed to pin document');
    }
  };

  return (
    <div className="document-pinner">
      <div className="pinner-header">
        <h3>📌 Pin Knowledge Base Documents</h3>
        <p className="pin-limit">
          {currentPinnedCount} / {maxPinned} documents pinned
        </p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, keywords, source, NASA center..."
          disabled={searching}
        />
        <button type="submit" disabled={searching} className="btn-search">
          {searching ? 'Searching...' : '🔍 Search'}
        </button>
      </form>

      {error && <div className="search-error">{error}</div>}

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>{searchResults.length} document{searchResults.length !== 1 ? 's' : ''} found</h4>
          <div className="results-list">
            {searchResults.map((doc) => (
              <div key={doc._id} className="search-result-item">
                <div className="result-info">
                  <h5>{doc.title}</h5>
                  <div className="result-meta">
                    <span className="result-source">{doc.source}</span>
                    {doc.nasa_center && (
                      <span className="result-center">{doc.nasa_center}</span>
                    )}
                    {doc.publication_date && (
                      <span className="result-date">
                        {new Date(doc.publication_date).getFullYear()}
                      </span>
                    )}
                  </div>
                  {doc.keywords && doc.keywords.length > 0 && (
                    <div className="result-keywords">
                      {doc.keywords.slice(0, 5).map((kw, idx) => (
                        <span key={idx} className="keyword-tag">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handlePin(doc)}
                  className="btn-pin"
                  disabled={currentPinnedCount >= maxPinned}
                >
                  📌 Pin
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentPinner;