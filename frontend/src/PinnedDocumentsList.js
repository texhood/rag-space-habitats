// PinnedDocumentsList.js - Display and manage pinned knowledge base documents
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import './PinnedDocumentsList.css';

function PinnedDocumentsList({ projectId, refreshTrigger }) {
  const [pinnedDocs, setPinnedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxPinned, setMaxPinned] = useState(20);

  useEffect(() => {
    loadPinnedDocuments();
  }, [projectId, refreshTrigger]);

  const loadPinnedDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/projects/${projectId}/pinned`,
        { withCredentials: true }
      );

      setPinnedDocs(response.data.pinnedDocuments);
      setMaxPinned(response.data.maxPinned);
      setError(null);
    } catch (err) {
      console.error('Failed to load pinned documents:', err);
      setError(err.response?.data?.error || 'Failed to load pinned documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (pinId) => {
    if (!window.confirm('Are you sure you want to unpin this document?')) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/api/projects/${projectId}/pinned/${pinId}`,
        { withCredentials: true }
      );

      // Reload pinned documents
      loadPinnedDocuments();
    } catch (err) {
      console.error('Failed to unpin document:', err);
      alert(err.response?.data?.error || 'Failed to unpin document');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="pinned-docs-loading">Loading pinned documents...</div>;
  }

  if (error) {
    return <div className="pinned-docs-error">{error}</div>;
  }

  return (
    <div className="pinned-documents-list">
      <div className="pinned-header">
        <h3>Pinned Knowledge Base Documents</h3>
        <span className="pin-count">
          {pinnedDocs.length} / {maxPinned} pinned
        </span>
      </div>

      {pinnedDocs.length === 0 ? (
        <div className="no-pinned-docs">
          <p>No documents pinned yet.</p>
          <p className="hint">Pin documents from the knowledge base to include them in your project queries.</p>
        </div>
      ) : (
        <div className="pinned-docs-grid">
          {pinnedDocs.map((doc) => (
            <div key={doc.id} className="pinned-doc-card">
              <div className="doc-header">
                <span className="pin-icon">📌</span>
                <button
                  className="btn-unpin"
                  onClick={() => handleUnpin(doc.id)}
                  title="Unpin document"
                >
                  ✕
                </button>
              </div>
              <h4>{doc.document_title}</h4>
              <p className="doc-source">Source: {doc.document_source}</p>
              <p className="doc-pinned-date">
                Pinned: {formatDate(doc.pinned_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PinnedDocumentsList;
