// SubmitContent.js
import React, { useState } from 'react';
import axios from 'axios';
import API_URL from './config';
import './SubmitContent.css';

function SubmitContent({ user, onClose }) {
  const [uploadMode, setUploadMode] = useState('text');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const sizeMB = selectedFile.size / 1024 / 1024;
      if (sizeMB > 100) {
        setError(`File is ${sizeMB.toFixed(2)}MB. Maximum size is 100MB.`);
        e.target.value = null;
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      
      // Auto-fill title from filename if empty
      if (!title) {
        const filename = selectedFile.name.replace(/\.[^/.]+$/, '');
        setTitle(filename);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('tags', tags);
      formData.append('category', category);

      if (uploadMode === 'file' && file) {
        formData.append('file', file);
      } else {
        formData.append('content', content);
      }

      const response = await axios.post(
        `${API_URL}/api/submissions`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSuccess(response.data.message || 'Document submitted successfully!');
      
      // Reset form and close after 2 seconds
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setContent('');
        setFile(null);
        setTags('');
        setCategory('general');
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || 'Failed to submit document';
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content submit-modal" onClick={(e) => e.stopPropagation()}>
        <h2>📤 Submit Document</h2>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            ✅ {success}
          </div>
        )}

        <div className="upload-mode-selector">
          <button
            type="button"
            className={uploadMode === 'text' ? 'active' : ''}
            onClick={() => {
              setUploadMode('text');
              setFile(null);
            }}
          >
            📝 Paste Text
          </button>
          <button
            type="button"
            className={uploadMode === 'file' ? 'active' : ''}
            onClick={() => {
              setUploadMode('file');
              setContent('');
            }}
          >
            📄 Upload File
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              required
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="habitat-design">Habitat Design</option>
              <option value="life-support">Life Support Systems</option>
              <option value="propulsion">Propulsion</option>
              <option value="construction">Construction Methods</option>
              <option value="materials">Materials Science</option>
              <option value="research">Research Paper</option>
              <option value="technical">Technical Documentation</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., O'Neill cylinder, rotation, artificial gravity"
            />
            <small>Helps categorize and search your document</small>
          </div>

          {uploadMode === 'file' ? (
            <div className="form-group">
              <label>
                Upload File <span className="required">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.md"
                required={uploadMode === 'file'}
              />
              {file && (
                <div className="file-info">
                  📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              <small>Supported: PDF, Word (.doc, .docx), Text (.txt), Markdown (.md) - Max 100MB</small>
            </div>
          ) : (
            <div className="form-group">
              <label>
                Content <span className="required">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste or type your document content here..."
                rows="10"
                required={uploadMode === 'text'}
              />
            </div>
          )}

          <div className="modal-buttons">
            <button 
              type="submit" 
              disabled={uploading || (uploadMode === 'file' ? !file : !content)}
            >
              {uploading ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>

          <p className="submit-notice">
            ℹ️ Your submission will be reviewed by an administrator before being added to the knowledge base.
          </p>
        </form>
      </div>
    </div>
  );
}

export default SubmitContent;