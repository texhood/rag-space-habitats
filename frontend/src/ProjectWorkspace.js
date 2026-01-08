// ProjectWorkspace.js - Full project workspace with tab navigation
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import AppNavbar from './AppNavbar';
import DocumentUploader from './DocumentUploader';
import DocumentList from './DocumentList';
import DocumentPinner from './DocumentPinner';
import PinnedDocumentsList from './PinnedDocumentsList';
import EditProjectModal from './EditProjectModal';
import './ProjectWorkspace.css';

function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('documents');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
  const [pinnedRefreshTrigger, setPinnedRefreshTrigger] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadProject();
      loadPinnedCount();
    }
  }, [id, user]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (err) {
      navigate('/');
    }
  };

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/projects/${id}`,
        { withCredentials: true }
      );
      setProject(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedCount = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${id}/pinned`,
        { withCredentials: true }
      );
      setPinnedCount(response.data.count || 0);
    } catch (err) {
      console.error('Failed to load pinned count:', err);
    }
  };

  const handleUpdate = async (projectId, updates) => {
    try {
      await axios.put(
        `${API_URL}/api/projects/${projectId}`,
        updates,
        { withCredentials: true }
      );

      await loadProject();
      setShowEditModal(false);
      alert('Project updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      throw new Error(err.response?.data?.error || 'Failed to update project');
    }
  };

  const handleUploadComplete = () => {
    setDocumentRefreshTrigger(prev => prev + 1);
  };

  const handlePinComplete = () => {
    setPinnedRefreshTrigger(prev => prev + 1);
    loadPinnedCount();
  };

  const handleOpenChat = () => {
    navigate(`/app?project=${id}`);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="project-workspace-page">
        <AppNavbar 
          user={user}
          onLogout={handleLogout}
        />
        <div className="workspace-loading">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-workspace-page">
        <AppNavbar 
          user={user}
          onLogout={handleLogout}
        />
        <div className="workspace-error">
          <p>{error}</p>
          <button onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-workspace-page">
      <AppNavbar 
        user={user}
        onLogout={handleLogout}
      />
      
      <div className="project-workspace">
        <div className="workspace-header">
          <div className="header-left">
            <div className="nav-breadcrumbs">
              <button className="btn-back" onClick={() => navigate('/projects')}>
                ← Back to Projects
              </button>
            </div>
            <div className="project-info">
              <h1>{project.name}</h1>
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-chat" onClick={handleOpenChat}>
              💬 Open Chat
            </button>
            <button className="btn-edit" onClick={() => setShowEditModal(true)}>
              ✏️ Edit Project
            </button>
          </div>
        </div>

        <div className="workspace-tabs">
          <button
            className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            📄 Documents
          </button>
          <button
            className={`tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            🔖 Bookmarks
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>

        <div className="workspace-content">
          {activeTab === 'documents' && (
            <div className="tab-content">
              <section className="documents-section">
                <h2>📤 Upload Project Documents</h2>
                <p>Upload your own documents (PDF, DOCX, TXT, Markdown) to include in this project's context.</p>
                <DocumentUploader
                  projectId={id}
                  onUploadComplete={handleUploadComplete}
                />
                <DocumentList
                  projectId={id}
                  refreshTrigger={documentRefreshTrigger}
                />
              </section>

              <section className="pinned-section">
                <h2>📌 Pinned Knowledge Base Documents</h2>
                <p>Pin documents from the knowledge base to always include in this project's queries. ({pinnedCount}/20 pinned)</p>
                <PinnedDocumentsList
                  projectId={id}
                  refreshTrigger={pinnedRefreshTrigger}
                  onUnpin={handlePinComplete}
                />
                <DocumentPinner
                  projectId={id}
                  onPin={handlePinComplete}
                  currentPinnedCount={pinnedCount}
                />
              </section>
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="tab-content">
              <h2>🔖 Bookmarked Responses</h2>
              <p>Coming soon: Save and organize important responses from your project queries.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-content">
              <h2>⚙️ Project Settings</h2>
              <div className="settings-info">
                <div className="setting-item">
                  <label>Name:</label>
                  <span>{project.name}</span>
                </div>
                <div className="setting-item">
                  <label>Description:</label>
                  <span>{project.description || 'None'}</span>
                </div>
                <div className="setting-item">
                  <label>Objectives:</label>
                  <pre>{project.objectives || 'None'}</pre>
                </div>
                <div className="setting-item">
                  <label>Constraints:</label>
                  <pre>{project.constraints || 'None'}</pre>
                </div>
                <div className="setting-item">
                  <label>Created:</label>
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button className="btn-edit-large" onClick={() => setShowEditModal(true)}>
                ✏️ Edit Project Settings
              </button>
            </div>
          )}
        </div>

        {showEditModal && (
          <EditProjectModal
            project={project}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </div>
  );
}

export default ProjectWorkspace;