'use client';

import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import CoordinateurLayout from '@/components/coordinateur/coordinateur-layout';
import { NotificationList } from '@/components/notifications/NotificationList';

export default function CoordinateurNotificationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();

  if (isLoading) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </CoordinateurLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Please log in to view notifications.</p>
        </div>
      </CoordinateurLayout>
    );
  }

  return (
    <CoordinateurLayout>
      <NotificationProvider>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              Stay updated with important alerts and messages
            </p>
          </div>
          
          <NotificationList
            userRole={user.role}
            language={language}
          />
        </div>
      </NotificationProvider>
    </CoordinateurLayout>
  );
}