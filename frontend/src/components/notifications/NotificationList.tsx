'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Filter, RefreshCw, Trash2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { createTranslator, Language } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { handleNotificationClick, getNotificationNavigationDescription } from '@/lib/notification-navigation';

interface NotificationListProps {
  language?: Language;
  userRole?: string;
}

export function NotificationList({ language = 'en', userRole }: NotificationListProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    loading,
    error,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const t = createTranslator(language);

  const handleRefresh = () => {
    fetchNotifications(1, 50);
  };

  const handleDeleteAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete ALL notifications in the system? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/notifications/delete-all`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully deleted ${result.data.deletedCount} notifications`);
        fetchNotifications(1, 50); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Error: ${error.error?.message || 'Failed to delete notifications'}`);
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      alert('Failed to delete notifications. Please try again.');
    }
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
        return 'border-l-blue-500 bg-blue-50';
      case 'ORDER_UPDATE':
        return 'border-l-green-500 bg-green-50';
      case 'SHIPPING_UPDATE':
        return 'border-l-purple-500 bg-purple-50';
      case 'TICKET_CREATED':
        return 'border-l-indigo-500 bg-indigo-50';
      case 'TICKET_UPDATED':
        return 'border-l-cyan-500 bg-cyan-50';
      case 'TICKET_MESSAGE':
      case 'NEW_TICKET_MESSAGE':
        return 'border-l-teal-500 bg-teal-50';
      case 'TICKET_STATUS_UPDATED':
        return 'border-l-orange-500 bg-orange-50';
      case 'SYSTEM_ALERT':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'ORDER_ASSIGNMENT':
        return t('orderAssignment');
      case 'ORDER_UPDATE':
        return t('orderUpdate');
      case 'SHIPPING_UPDATE':
        return t('shippingUpdate');
      case 'TICKET_CREATED':
        return 'Ticket Created';
      case 'TICKET_UPDATED':
        return 'Ticket Updated';
      case 'TICKET_MESSAGE':
      case 'NEW_TICKET_MESSAGE':
        return 'Ticket Message';
      case 'TICKET_STATUS_UPDATED':
        return 'Ticket Status';
      case 'SYSTEM_ALERT':
        return t('systemAlert');
      default:
        return t('notification');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'read' && !notification.isRead) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  const notificationTypes = ['ORDER_ASSIGNMENT', 'ORDER_UPDATE', 'SHIPPING_UPDATE', 'TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_MESSAGE', 'NEW_TICKET_MESSAGE', 'TICKET_STATUS_UPDATED', 'SYSTEM_ALERT'];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="h-8 w-8 mr-3 text-blue-600" />
              {t('notifications')}
            </h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? (
                <>
                  {unreadCount} {t('unread')} {t('notifications').toLowerCase()}
                </>
              ) : (
                t('noNotifications')
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCheck className="h-4 w-4" />
                <span>{t('markAllRead')}</span>
              </button>
            )}
            
            {userRole === 'ADMIN' && (
              <button
                onClick={handleDeleteAllNotifications}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('filter')}:</span>
          </div>
          
          {/* Read Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">{t('status')}:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="unread">{t('unread')}</option>
              <option value="read">{t('markAsRead')}</option>
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">{t('notificationTypes')}:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('allStatuses')}</option>
              {notificationTypes.map(type => (
                <option key={type} value={type}>
                  {getNotificationTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">{t('loadingNotifications')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'unread' ? t('noNotifications') : t('noNotificationsYet')}
            </h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? 'All notifications have been read'
                : 'Notifications will appear here when you receive them'
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-l-4 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer group ${
                notification.isRead
                  ? 'bg-white border-l-gray-300'
                  : getNotificationColor(notification.type)
              }`}
              onClick={() => handleNotificationClick(notification, userRole, router, markAsRead)}
              title={getNotificationNavigationDescription(notification, userRole)}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 text-2xl">
                  {getNotificationIcon(notification.type)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-lg font-semibold ${
                        notification.isRead ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        notification.isRead 
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {getNotificationTypeLabel(notification.type)}
                      </span>
                      
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title={t('markAsRead')}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    notification.isRead ? 'text-gray-600' : 'text-gray-800'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {/* Order Reference */}
                  {notification.order && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">
                        {t('order')}: {notification.order.reference}
                      </span>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length > 0 && filteredNotifications.length >= 20 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => fetchNotifications(Math.ceil(notifications.length / 20) + 1, 20)}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('loading') : t('learnMore')}
          </button>
        </div>
      )}
    </div>
  );
}