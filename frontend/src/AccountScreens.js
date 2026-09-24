import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import SubmitContent from './SubmitContent';
import UserProfile from './UserProfile';
import { useAuth } from './useAuth';

/**
 * Admin tools. Signed-out visitors go to login. Other users return to Query.
 */
export function AdminScreen() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/app" replace />;
  return <AdminPanel onClose={() => navigate('/app')} />;
}

/**
 * Submit a document to the library.
 */
export function SubmitScreen() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <SubmitContent user={user} onClose={() => navigate('/app')} />;
}

/**
 * Account page. Profile edits are written back onto the shared session user.
 */
export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, setUser, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <UserProfile
      user={user}
      onClose={() => navigate('/app')}
      onUserUpdate={(updatedUser) => setUser((prev) => ({ ...prev, ...updatedUser }))}
    />
  );
}
