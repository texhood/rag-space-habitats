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
  const [license, setLicense] = useState('cc-by');
  const [attribution, setAttribution] = useState(user?.username || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // License options with descriptions
  const licenseOptions = [
    {
      value: 'cc-by',
      label: 'CC BY 4.0 (Attribution)',
      description: 'Others can share and adapt your work, with credit to you.',
      icon: '🌍'
    },
    {
      value: 'cc-by-sa',
      label: 'CC BY-SA 4.0 (Attribution-ShareAlike)',
      description: 'Others can share and adapt, but must use the same license.',
      icon: '🔄'
    },
    {
      value: 'cc-by-nc',
      label: 'CC BY-NC 4.0 (Attribution-NonCommercial)',
      description: 'Others can share and adapt for non-commercial purposes only.',
      icon: '🚫💰'
    },
    {
      value: 'private',
      label: 'Private (All Rights Reserved)',
      description: 'Only you and administrators can view this document.',
      icon: '🔒'
    }
  ];

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
      formData.append('license', license);
      formData.append('attribution', attribution.trim() || user?.username || 'Anonymous');

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
        setLicense('cc-by');
        setAttribution(user?.username || '');
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

  const selectedLicense = licenseOptions.find(l => l.value === license);

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

          <div className="form-row">
            <div className="form-group half">
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

            <div className="form-group half">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., O'Neill cylinder, rotation"
              />
            </div>
          </div>

          {/* License Selection */}
          <div className="form-group license-section">
            <label>
              License <span className="required">*</span>
            </label>
            <div className="license-options">
              {licenseOptions.map((option) => (
                <label 
                  key={option.value} 
                  className={`license-option ${license === option.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="license"
                    value={option.value}
                    checked={license === option.value}
                    onChange={(e) => setLicense(e.target.value)}
                  />
                  <span className="license-icon">{option.icon}</span>
                  <span className="license-label">{option.label}</span>
                </label>
              ))}
            </div>
            {selectedLicense && (
              <p className="license-description">
                {selectedLicense.description}
              </p>
            )}
            <small className="license-help">
              <a href="https://creativecommons.org/licenses/" target="_blank" rel="noopener noreferrer">
                Learn more about Creative Commons licenses →
              </a>
            </small>
          </div>

          {/* Attribution */}
          <div className="form-group">
            <label>
              Attribution (How to credit you)
            </label>
            <input
              type="text"
              value={attribution}
              onChange={(e) => setAttribution(e.target.value)}
              placeholder={user?.username || 'Your name or username'}
            />
            <small>This is how others will credit you when using your work.</small>
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
            {license !== 'private' && (
              <span className="license-notice">
                <br />📜 By submitting, you confirm you have the right to share this content under the {selectedLicense?.label} license.
              </span>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

export default SubmitContent;