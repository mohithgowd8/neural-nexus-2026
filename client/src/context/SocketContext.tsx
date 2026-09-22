import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const isGitHubPages = typeof window !== 'undefined' && (
    window.location.hostname.includes('github.io') ||
    window.location.protocol === 'file:'
  );

  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (isGitHubPages) return typeof navigator !== 'undefined' ? navigator.onLine : true;
    return false;
  });

  useEffect(() => {
    const liveBackendUrl = 'https://apparently-responding-conversation-consultants.trycloudflare.com';
    const socketUrl = isGitHubPages ? liveBackendUrl : (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin);

    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
      timeout: 8000
    });

    socketInstance.on('connect', () => {
      console.log('Connected to central WebSocket server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from central WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection error to central backend:', err.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isGitHubPages]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
