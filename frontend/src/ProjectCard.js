// ProjectCard.js - Individual project card
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';

function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);

    try {
      await axios.delete(`${API_URL}/api/projects/${project.id}`, {
        withCredentials: true
      });

      onDelete(project.id);
    } catch (err) {
      alert('Failed to delete project: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="project-card">
      <div className="card-header">
        <h3>{project.name}</h3>
        <div className="card-menu">
          {!project.is_active && (
            <span className="inactive-badge">Inactive</span>
          )}
        </div>
      </div>

      <p className="card-description">
        {project.description || 'No description'}
      </p>

      <div className="card-objectives">
        {project.objectives && (
          <>
            <strong>Objectives:</strong>
            <p>{project.objectives.substring(0, 100)}...</p>
          </>
        )}
      </div>

      <div className="card-footer">
        <span className="card-date">Created {formatDate(project.created_at)}</span>
        <div className="card-actions">
          <button
            className="btn-open"
            onClick={() => navigate(`/app?project=${project.id}`)}
          >
            Open
          </button>
          <button
            className="btn-delete"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
