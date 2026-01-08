// DocumentList.js - Display list of uploaded project documents
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import './DocumentList.css';

function DocumentList({ projectId, refreshTrigger }) {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [projectId, refreshTrigger]);

  // Auto-refresh if any documents are processing
  useEffect(() => {
    const hasProcessing = documents.some(doc =>
      doc.processing_status === 'pending' || doc.processing_status === 'processing'
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        loadDocuments();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [documents]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/projects/${projectId}/documents`,
        { withCredentials: true }
      );

      setDocuments(response.data.documents);
      setStats(response.data.stats);
      setError(null);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/api/projects/${projectId}/documents/${docId}`,
        { withCredentials: true }
      );

      // Reload documents
      loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', class: 'status-pending' },
      processing: { text: 'Processing...', class: 'status-processing' },
      completed: { text: 'Ready', class: 'status-completed' },
      failed: { text: 'Failed', class: 'status-failed' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  if (loading && documents.length === 0) {
    return <div className="document-list-loading">Loading documents...</div>;
  }

  if (error) {
    return <div className="document-list-error">{error}</div>;
  }

  return (
    <div className="document-list">
      {stats && (
        <div className="document-stats">
          <div className="stat">
            <strong>{stats.total || 0}</strong>
            <span>Total Documents</span>
          </div>
          <div className="stat">
            <strong>{stats.completed || 0}</strong>
            <span>Ready</span>
          </div>
          <div className="stat">
            <strong>{stats.processing || 0}</strong>
            <span>Processing</span>
          </div>
          <div className="stat">
            <strong>{stats.failed || 0}</strong>
            <span>Failed</span>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="no-documents">
          <p>No documents uploaded yet.</p>
          <p className="hint">Upload your first document to get started.</p>
        </div>
      ) : (
        <div className="documents-table">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="file-name">
                    <span className="file-icon">📄</span>
                    {doc.original_name}
                  </td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td>{getStatusBadge(doc.processing_status)}</td>
                  <td>{formatDate(doc.uploaded_at)}</td>
                  <td>
                    <button
                      className="btn-delete-small"
                      onClick={() => handleDelete(doc.id)}
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DocumentList;
