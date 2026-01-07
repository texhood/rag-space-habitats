// CreateProjectModal.js - Form to create new project
import React, { useState } from 'react';

function CreateProjectModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objectives: '',
    constraints: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Project name is required');
      }

      await onCreate(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="create-project-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Mars Habitat Design Phase 2"
              maxLength="255"
              disabled={loading}
            />
            <span className="char-count">{formData.name.length}/255</span>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief overview of your project"
              rows="3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Objectives</label>
            <textarea
              name="objectives"
              value={formData.objectives}
              onChange={handleChange}
              placeholder="What do you want to focus on? e.g., 'Prioritize life support systems' or 'Focus on structural integrity analysis'"
              rows="3"
              disabled={loading}
            />
            <small>These instructions are included in all queries within this project</small>
          </div>

          <div className="form-group">
            <label>Constraints</label>
            <textarea
              name="constraints"
              value={formData.constraints}
              onChange={handleChange}
              placeholder="What should be excluded or restricted? e.g., 'Exclude Earth-based habitats' or 'Only consider documents after 2020'"
              rows="3"
              disabled={loading}
            />
            <small>Constraints are applied to limit search results and responses</small>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;
