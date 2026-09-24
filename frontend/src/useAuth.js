import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

/**
 * Load the signed-in user once and share it with route screens.
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.user || null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * End the session and clear the stored user.
   * @returns {Promise<void>}
   */
  async function logout() {
    await api.post('/api/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, ready, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Session user, ready flag, and logout. Throws outside AuthProvider.
 * @returns {{ user: object|null, setUser: Function, ready: boolean, logout: Function }}
 */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
