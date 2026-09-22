import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext.js';

interface AdminUser {
  id: string;
  username: string;
  email?: string;
}

interface AdminAuthContextType {
  token: string | null;
  admin: AdminUser | null;
  login: (token: string, admin: AdminUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  token: null,
  admin: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isLoading: true
});

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const savedToken = localStorage.getItem('neural_nexus_admin_token');
    const savedAdmin = localStorage.getItem('neural_nexus_admin_user');
    if (savedToken && savedAdmin) {
      try {
        setToken(savedToken);
        setAdmin(JSON.parse(savedAdmin));
      } catch (e) {
        localStorage.removeItem('neural_nexus_admin_token');
        localStorage.removeItem('neural_nexus_admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (socket && token) {
      socket.emit('JOIN_ROOM', { role: 'admin' });
    }
  }, [socket, token]);

  const login = (newToken: string, newAdmin: AdminUser) => {
    setToken(newToken);
    setAdmin(newAdmin);
    localStorage.setItem('neural_nexus_admin_token', newToken);
    localStorage.setItem('neural_nexus_admin_user', JSON.stringify(newAdmin));
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('neural_nexus_admin_token');
    localStorage.removeItem('neural_nexus_admin_user');
  };

  return (
    <AdminAuthContext.Provider value={{ token, admin, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
