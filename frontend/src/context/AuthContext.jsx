/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

function syncTokenToServiceWorker(token) {
  if ('serviceWorker' in navigator) {
    const sync = () => {
      if (navigator.serviceWorker.controller) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_CONFIG',
          token: token,
          apiUrl: apiUrl
        });
      }
    };
    
    // If controller exists, send it. Otherwise wait for state change
    if (navigator.serviceWorker.controller) {
      sync();
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', sync);
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('crm_user');
    return raw ? JSON.parse(raw) : null;
  });

  // Sync token on mount if present
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          syncTokenToServiceWorker(token);
        });
      }
    }
  }, []);

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('crm_token', res.data.token);
    localStorage.setItem('crm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    
    // Sync token after login
    syncTokenToServiceWorker(res.data.token);
    
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    
    // Clear token in Service Worker
    syncTokenToServiceWorker('');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
