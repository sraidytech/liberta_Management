'use client';

import React from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AgentNotificationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
    if (!isLoading && isAuthenticated && user?.role !== 'AGENT_SUIVI' && user?.role !== 'AGENT_CALL_CENTER') {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || (user.role !== 'AGENT_SUIVI' && user.role !== 'AGENT_CALL_CENTER')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Agent Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {language === 'fr' ? 'Mes Notifications' : 'My Notifications'}
              </h1>
              <p className="text-gray-600">
                {language === 'fr' ? 'Gérez vos notifications' : 'Manage your notifications'}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {language === 'fr' ? 'Retour' : 'Back'}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Content */}
      <NotificationProvider userId={user.id} userRole={user.role}>
        <NotificationList language={language} />
      </NotificationProvider>
    </div>
  );
}