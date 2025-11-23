// DocumentViewer.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './DocumentViewer.css';

function DocumentViewer({ submissionId, onClose }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocument();
  }, [submissionId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/submissions/${submissionId}`,
        { withCredentials: true }
      );
      console.log('📄 Document received:', response.data.submission);
      console.log('📝 Content length:', response.data.submission.content?.length);
      console.log('📝 Description length:', response.data.submission.description?.length);
      setDocument(response.data.submission);
    } catch (err) {
      console.error('Failed to fetch document:', err);
      setError(err.response?.data?.error || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { emoji: '⏳', color: '#ffc107', text: 'Pending' },
      approved: { emoji: '✅', color: '#28a745', text: 'Approved' },
      rejected: { emoji: '❌', color: '#dc3545', text: 'Rejected' },
      processed: { emoji: '🔄', color: '#17a2b8', text: 'Processed' },
      processing_failed: { emoji: '⚠️', color: '#fd7e14', text: 'Failed' }
    };
    const badge = badges[status] || { emoji: '❓', color: '#6c757d', text: status };
    return (
      <span 
        className="status-badge" 
        style={{ 
          backgroundColor: badge.color + '20',
          color: badge.color,
          border: `2px solid ${badge.color}`
        }}
      >
        {badge.emoji} {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content document-viewer">
          <div className="viewer-loading">
            <div className="spinner"></div>
            <p>Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content document-viewer" onClick={(e) => e.stopPropagation()}>
          <div className="viewer-error">
            <h2>⚠️ Error</h2>
            <p>{error}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-viewer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="viewer-header">
          <div className="viewer-title-section">
            <h2>📄 {document.title}</h2>
            {getStatusBadge(document.status)}
          </div>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {/* Metadata */}
        <div className="viewer-metadata">
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">Submitted By:</span>
              <span className="metadata-value">{document.submitted_by_username || 'Unknown'}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Submitted:</span>
              <span className="metadata-value">{formatDate(document.submitted_at || document.created_at)}</span>
            </div>
            {document.category && (
              <div className="metadata-item">
                <span className="metadata-label">Category:</span>
                <span className="metadata-value category-tag">{document.category}</span>
              </div>
            )}
            {document.tags && document.tags.length > 0 && (
              <div className="metadata-item full-width">
                <span className="metadata-label">Tags:</span>
                <div className="tags-container">
                  {document.tags.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {document.description && (
            <div className="document-description">
              <p>{document.description}</p>
            </div>
          )}

          {document.file_info && (
            <div className="file-info-section">
              <span className="info-icon">📎</span>
              <span className="file-name">{document.file_info.original_name}</span>
              <span className="file-size">({document.file_info.size_readable})</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="viewer-content">
          <div className="content-header">
            <h3>Document Content</h3>
            <span className="content-length">
              {document.content?.length.toLocaleString()} characters
            </span>
          </div>
          <div className="content-body">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {document.content || '*No content available*'}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer with Review Info */}
        {(document.reviewed_by_username || document.review_notes) && (
          <div className="viewer-footer">
            <h4>Review Information</h4>
            {document.reviewed_by_username && (
              <p>
                <strong>Reviewed by:</strong> {document.reviewed_by_username}
                {document.reviewed_at && ` on ${formatDate(document.reviewed_at)}`}
              </p>
            )}
            {document.review_notes && (
              <p>
                <strong>Notes:</strong> {document.review_notes}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="viewer-actions">
          <button onClick={onClose} className="btn-close">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentViewer;