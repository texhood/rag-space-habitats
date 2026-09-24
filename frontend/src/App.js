import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import BrowseKnowledgeBase from './BrowseKnowledgeBase';
import ProjectsPage from './ProjectsPage';
import ProjectWorkspace from './ProjectWorkspace';
import PricingPage from './PricingPage';
import QueryScreen from './QueryScreen';
import { LoginForm, RegisterForm } from './AuthForms';
import { AdminScreen, SubmitScreen, ProfileScreen } from './AccountScreens';
import { AuthProvider, useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import './App.css';
import './BrowseKnowledgeBase.css';
import './ProjectList.css';

/**
 * Pricing screen. Close returns to the previous page.
 */
function PricingRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <PricingPage
      user={user}
      onClose={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/');
      }}
    />
  );
}

/**
 * Route table. Each screen lives in its own module.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<QueryScreen />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/browse" element={<BrowseKnowledgeBase />} />
          <Route path="/pricing" element={<PricingRoute />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="/submit" element={<SubmitScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectWorkspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
