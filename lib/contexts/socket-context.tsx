"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';

/**
 * Socket.IO Context
 * 
 * Production-grade WebSocket connection management with:
 * - JWT authentication
 * - Auto-reconnection with exponential backoff
 * - Organization/project room management
 * - Connection status tracking
 */

// Notification payload from server
export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data: {
    taskId?: string;
    taskTitle?: string;
    projectId?: string;
    projectName?: string;
    sprintId?: string;
    sprintName?: string;
    fromStatus?: string;
    toStatus?: string;
    assignedRole?: 'assignee' | 'reviewer' | 'tester' | 'reporter';
    triggeredBy: {
      id: string;
      name: string;
      email: string;
    };
    [key: string]: any;
  };
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

// Socket connection status
export interface SocketStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

// Context value type
interface SocketContextValue {
  socket: Socket | null;
  status: SocketStatus;
  lastNotification: NotificationPayload | null;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

const defaultStatus: SocketStatus = {
  isConnected: false,
  isConnecting: false,
  error: null,
  lastConnected: null,
  reconnectAttempts: 0,
};

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user, isAuthenticated, isLoaded } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>(defaultStatus);
  const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);
  
  const reconnectAttemptsRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const notificationPromptKey = 'flotick:browser-notification-prompted-at';
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // Start with 1 second

  const getNotificationUrl = useCallback((payload: NotificationPayload): string => {
    if (payload.data?.taskId) return `/tasks/${payload.data.taskId}`;
    if (payload.data?.sprintId) return `/sprints/${payload.data.sprintId}`;
    return '/notifications';
  }, []);

  const showBrowserNotification = useCallback((payload: NotificationPayload) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return;

    const notification = new Notification(payload.title, {
      body: payload.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `${payload.type}:${payload.data.taskId || payload.data.sprintId || Date.now()}`,
      requireInteraction: payload.priority === 'high',
      data: { url: getNotificationUrl(payload) },
    });

    notification.onclick = () => {
      window.focus();
      const targetUrl = (notification.data as { url?: string } | undefined)?.url;
      if (targetUrl) window.location.href = targetUrl;
      notification.close();
    };

    window.setTimeout(() => notification.close(), payload.priority === 'high' ? 15000 : 8000);
  }, [getNotificationUrl]);

  /**
   * Get the socket URL based on environment
   */
  /**
   * Get the socket URL based on environment
   */
  const getSocketUrl = useCallback((): string => {
    // In browser environment
    if (typeof window !== 'undefined') {
      // Environment-driven URL resolution only
      const backendUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        // Parse the URL safely to extract just the origin, 
        // avoiding regex bugs where domains like "api.flotick.in" are truncated.
        try {
          const parsed = new URL(backendUrl, window.location.origin);
          return parsed.origin;
        } catch (e) {
          return backendUrl.replace(/\/$/, '');
        }
      }
    }
    
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SOCKET_URL or NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL.');
  }, []);

  /**
   * Get JWT token for WebSocket authentication via secure BFF endpoint
   * This fetches a short-lived socket token that doesn't expose the main JWT
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const apiBase = (
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        ''
      ).replace(/\/$/, '');
      const url = apiBase
        ? `${apiBase}/api/v1/auth/socket-token`
        : '/api/auth/socket-token';

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Failed to get socket token:', response.status);
        return null;
      }

      const data = await response.json();
      // Return the socket token which can be exchanged for the real token on the backend
      return data.data?.socketToken || null;
    } catch (error) {
      console.error('Error getting socket token:', error);
      return null;
    }
  }, []);

  /**
   * Connect to Socket.IO server
   */
  const connect = useCallback(async () => {
    if (!isAuthenticated || !isLoaded || !user) {
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      setStatus(prev => ({ ...prev, error: 'No authentication token available' }));
      return;
    }

    setStatus(prev => ({ ...prev, isConnecting: true, error: null }));

    const socketUrl = getSocketUrl();
    
    // Use socket token for auth - backend will exchange it for real JWT
    const newSocket = io(socketUrl, {
      auth: { socketToken: token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: baseReconnectDelay,
      reconnectionDelayMax: 15000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Socket.IO basic connection established');
      // Set to true immediately upon transport connection
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastConnected: new Date(),
        reconnectAttempts: 0,
      }));
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('connected', (data: { userId: string; organizationId: string; rooms: string[] }) => {
      console.log('Socket fully authenticated:', data);
      // Re-verify connected status upon high-level authentication event
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));

      // Request browser notification permission at most once every 7 days
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        const lastPromptedAt = Number(window.localStorage.getItem(notificationPromptKey) || 0);
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (!lastPromptedAt || Date.now() - lastPromptedAt > sevenDaysMs) {
          window.localStorage.setItem(notificationPromptKey, Date.now().toString());
          Notification.requestPermission().catch((error) => {
            console.warn('Browser notification permission request failed:', error);
          });
        }
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
      }));

      // Attempt reconnection if not a manual disconnect
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message,
      }));
    });

    newSocket.io.on('reconnect_attempt', (attempt) => {
      reconnectAttemptsRef.current = attempt;
      setStatus(prev => ({
        ...prev,
        reconnectAttempts: attempt,
      }));
    });

    newSocket.io.on('reconnect_failed', () => {
      setStatus(prev => ({
        ...prev,
        error: 'Connection failed after multiple attempts',
      }));
    });

    // Notification event
    newSocket.on('notification', (payload: NotificationPayload) => {
      console.log('Notification received:', payload.title);
      setLastNotification(payload);
      showBrowserNotification(payload);
    });

    // Room events
    newSocket.on('room:joined', (data: { room: string }) => {
      console.log('📍 Joined room:', data.room);
    });

    // Sync notification read state across devices
    newSocket.on('notification:read:sync', (data: { notificationId: string }) => {
      // This can be used to sync notification state across browser tabs
      console.log('🔄 Notification read sync:', data.notificationId);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [isAuthenticated, isLoaded, user, getAuthToken, getSocketUrl, showBrowserNotification]);

  /**
   * Schedule reconnection with exponential backoff
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setStatus(defaultStatus);
  }, []);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [disconnect, connect]);

  /**
   * Join a project room
   */
  const joinProject = useCallback((projectId: string) => {
    if (socket?.connected) {
      socket.emit('join:project', projectId);
    }
  }, [socket]);

  /**
   * Leave a project room
   */
  const leaveProject = useCallback((projectId: string) => {
    if (socket?.connected) {
      socket.emit('leave:project', projectId);
    }
  }, [socket]);

  /**
   * Mark notification as read (sync across devices)
   */
  const markNotificationRead = useCallback((notificationId: string) => {
    if (socket?.connected) {
      socket.emit('notification:read', notificationId);
    }
  }, [socket]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && isLoaded && user && !socket) {
      connect();
    }
  }, [isAuthenticated, isLoaded, user, socket, connect]);

  // Cleanup on unmount or auth change
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated && socket) {
      disconnect();
    }
  }, [isAuthenticated, socket, disconnect]);

  const value: SocketContextValue = {
    socket,
    status,
    lastNotification,
    joinProject,
    leaveProject,
    markNotificationRead,
    disconnect,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access Socket.IO context
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

/**
 * Hook for just the connection status
 */
export function useSocketStatus(): SocketStatus {
  const { status } = useSocket();
  return status;
}

/**
 * Hook for last notification
 */
export function useLastNotification(): NotificationPayload | null {
  const { lastNotification } = useSocket();
  return lastNotification;
}
