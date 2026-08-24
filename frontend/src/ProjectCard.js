import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';

function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (event) => {
    event.stopPropagation();
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) {
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
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const openWorkspace = () => navigate(`/projects/${project.id}`);
  const openChat = (event) => {
    event.stopPropagation();
    navigate(`/app?project=${project.id}`);
  };

  const documentCount = Number(project.document_count) || 0;
  const pinnedCount = Number(project.pinned_count) || 0;
  const messageCount = Number(project.message_count) || 0;
  const exchangeCount = Math.floor(messageCount / 2);

  return (
    <article className="project-card">
      <div className="project-card-top">
        <div>
          <h3>{project.name}</h3>
          {!project.is_active && (
            <span className="project-inactive">Inactive</span>
          )}
        </div>
        <p className="project-card-meta">
          Updated {formatDate(project.updated_at) || formatDate(project.created_at)}
        </p>
      </div>

      {project.description && (
        <p className="project-card-copy" title={project.description}>
          {project.description}
        </p>
      )}

      {project.objectives && (
        <section className="project-card-section">
          <h4>Objectives</h4>
          <p title={project.objectives}>{project.objectives}</p>
        </section>
      )}

      {project.constraints && (
        <section className="project-card-section">
          <h4>Constraints</h4>
          <p title={project.constraints}>{project.constraints}</p>
        </section>
      )}

      <div className="project-card-stats">
        <span>{documentCount} document{documentCount === 1 ? '' : 's'}</span>
        <span>{pinnedCount} pinned</span>
        <span>
          {exchangeCount} saved exchange{exchangeCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="project-card-actions">
        <button type="button" className="project-btn-primary" onClick={openWorkspace}>
          Open workspace
        </button>
        <button type="button" className="project-btn-secondary" onClick={openChat}>
          Query in chat
        </button>
        <button
          type="button"
          className="project-btn-danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

export default ProjectCard;
