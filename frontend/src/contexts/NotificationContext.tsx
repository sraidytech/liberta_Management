'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: 'ORDER_ASSIGNMENT' | 'ORDER_UPDATE' | 'SYSTEM_ALERT' | 'SHIPPING_UPDATE' | 'TICKET_CREATED' | 'TICKET_UPDATED' | 'TICKET_MESSAGE' | 'NEW_TICKET_MESSAGE' | 'TICKET_STATUS_UPDATED';
  title: string;
  message: string;
  orderId?: string;
  order?: {
    id: string;
    reference: string;
    status: string;
    customer?: {
      fullName: string;
      telephone: string;
    };
  };
  ticketId?: string;
  ticket?: {
    id: string;
    reference: string;
    status: string;
    title: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  userRole?: string;
}

export function NotificationProvider({ children, userId, userRole }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Connected to notification server');
      
      // Join user room for targeted notifications
      newSocket.emit('join', userId);
      
      // Join appropriate rooms based on user role
      if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
        newSocket.emit('join_agents', { userId, role: userRole });
      } else if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
        newSocket.emit('join_managers');
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from notification server');
    });

    // Listen for new notifications
    newSocket.on('new_notification', (notification: Notification) => {
      console.log('🔔 New notification received:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep only 20 most recent
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      }
    });

    // Listen for agent-specific notifications
    newSocket.on('agent_notification', (data: any) => {
      console.log('👥 Agent notification:', data);
    });

    // Listen for manager-specific notifications
    newSocket.on('manager_notification', (data: any) => {
      console.log('👔 Manager notification:', data);
    });

    // Listen for assignment updates
    newSocket.on('new_assignments', (data: { count: number; source?: string }) => {
      console.log('🎯 New assignments:', data);
      if (data.count > 0) {
        // This could trigger a notification or UI update
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId, userRole]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = async (page = 1, limit = 20) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/notifications?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      if (page === 1) {
        setNotifications(data.data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.data.notifications]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh unread count
  const refreshUnreadCount = async () => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/notifications/unread-count`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      setUnreadCount(data.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/notifications/mark-all-read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      refreshUnreadCount();
    }
  }, [userId]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    refreshUnreadCount,
    loading,
    error,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}