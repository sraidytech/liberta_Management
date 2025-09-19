'use client';

import React, { useState } from 'react';
import { Bell, BellRing, Check, CheckCheck, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { createTranslator, Language } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { handleNotificationClick, getNotificationNavigationDescription } from '@/lib/notification-navigation';

interface NotificationBellProps {
  className?: string;
  language?: Language;
}

export function NotificationBell({ className = '', language = 'en' }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    loading,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const t = createTranslator(language);
  const router = useRouter();
  const { user } = useAuth();

  const handleNotificationItemClick = async (notification: any) => {
    // Close the dropdown
    setIsOpen(false);
    
    // Handle navigation and mark as read
    await handleNotificationClick(notification, user?.role, router, markAsRead);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_ASSIGNMENT':
        return '📋';
      case 'ORDER_UPDATE':
        return '🔄';
      case 'SHIPPING_UPDATE':
        return '🚚';
      case 'TICKET_CREATED':
        return '🎫';
      case 'TICKET_UPDATED':
        return '📝';
      case 'TICKET_MESSAGE':
      case 'NEW_TICKET_MESSAGE':
        return '💬';
      case 'TICKET_STATUS_UPDATED':
        return '🔄';
      case 'SYSTEM_ALERT':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ORDER_ASSIGNMENT':
        return 'border-l-blue-500';
      case 'ORDER_UPDATE':
        return 'border-l-green-500';
      case 'SHIPPING_UPDATE':
        return 'border-l-purple-500';
      case 'TICKET_CREATED':
        return 'border-l-indigo-500';
      case 'TICKET_UPDATED':
        return 'border-l-cyan-500';
      case 'TICKET_MESSAGE':
      case 'NEW_TICKET_MESSAGE':
        return 'border-l-teal-500';
      case 'TICKET_STATUS_UPDATED':
        return 'border-l-orange-500';
      case 'SYSTEM_ALERT':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 ${
          isConnected
            ? 'text-gray-600 hover:text-gray-900'
            : 'text-gray-400'
        }`}
        title={isConnected ? t('notifications') : t('disconnectedFromServer')}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator */}
        <div
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('notifications')}
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({unreadCount} {t('unread')})
                  </span>
                )}
              </h3>
              
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    title={t('markAllAsRead')}
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>{t('markAllRead')}</span>
                  </button>
                )}
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  {t('loadingNotifications')}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>{t('noNotificationsYet')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Show only the first 5 notifications in dropdown */}
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationItemClick(notification)}
                      className={`px-4 py-3 cursor-pointer transition-colors duration-150 border-l-4 ${
                        notification.isRead
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-blue-50 hover:bg-blue-100'
                      } ${getNotificationColor(notification.type)} group`}
                      title={getNotificationNavigationDescription(notification, user?.role)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Notification Icon */}
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              notification.isRead ? 'text-gray-900' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </p>
                            
                            {!notification.isRead && (
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              </div>
                            )}
                          </div>
                          
                          <p className={`text-sm mt-1 ${
                            notification.isRead ? 'text-gray-600' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {/* Order Reference */}
                          {notification.order && (
                            <p className="text-xs text-gray-500 mt-1">
                              Order: {notification.order.reference}
                            </p>
                          )}
                          
                          {/* Timestamp */}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show "and X more" message if there are more notifications */}
                  {notifications.length > 5 && (
                    <div className="px-4 py-2 text-center text-sm text-gray-500 bg-gray-50">
                      {t('andMoreNotifications').replace('{count}', (notifications.length - 5).toString())}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Always show the "View all" button */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to role-specific notifications page
                  if (user?.role === 'ADMIN' || user?.role === 'TEAM_MANAGER') {
                    router.push('/admin/notifications');
                  } else {
                    router.push('/agent/notifications');
                  }
                }}
                className="w-full text-sm bg-blue-600 text-white hover:bg-blue-700 font-medium py-3 px-4 rounded-md transition-colors duration-150 flex items-center justify-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>{t('viewAllNotifications')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}