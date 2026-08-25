// ProjectList.js - Display user's projects
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import './ProjectList.css';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/projects`, {
        withCredentials: true
      });

      setProjects(response.data.projects || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError(err.response?.data?.error || 'Upgrade to create more projects.');
      } else {
        setError(err.response?.data?.error || 'Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const response = await axios.post(`${API_URL}/api/projects`, projectData, {
        withCredentials: true
      });

      setProjects([{ ...response.data.project, document_count: 0, pinned_count: 0 }, ...projects]);
      setShowCreateModal(false);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to create project');
    }
  };

  const handleDeleteProject = (projectId) => {
    setProjects(projects.filter(p => p.id !== projectId));
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h1>Projects</h1>
        <p>Workspaces with a brief, pinned papers, and saved chats. Free accounts include one project.</p>
        <button
          className="btn-create-project"
          onClick={() => setShowCreateModal(true)}
        >
          + New Project
        </button>
      </div>

      {error && (
        <div className="projects-error">
          {error}
        </div>
      )}

      {loading && (
        <div className="projects-loading">
          Loading projects...
        </div>
      )}

      {!loading && projects.length === 0 && !error && (
        <div className="projects-empty">
          <h2>No projects yet</h2>
          <p>Create a workspace with objectives and constraints for scoped research.</p>
          <button
            className="btn-create-project"
            onClick={() => setShowCreateModal(true)}
          >
            Create Project
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}

export default ProjectList;
