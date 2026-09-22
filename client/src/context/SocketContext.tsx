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
    if (isGitHubPages) {
      // In standalone GitHub Pages mode, reflect browser online status
      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Safe mock socket to handle event listeners without network errors
      const listeners = new Map<string, Set<Function>>();
      const mockSocket: any = {
        connected: navigator.onLine,
        on: (event: string, fn: Function) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(fn);
          return mockSocket;
        },
        off: (event: string, fn?: Function) => {
          if (!fn) listeners.delete(event);
          else listeners.get(event)?.delete(fn);
          return mockSocket;
        },
        emit: (event: string, data: any) => {
          listeners.get(event)?.forEach(fn => {
            try { fn(data); } catch (e) { console.error(e); }
          });
          return mockSocket;
        },
        disconnect: () => {}
      };

      setSocket(mockSocket as Socket);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Normal backend environment (localhost or deployed node server)
    const socketUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 5000
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
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
