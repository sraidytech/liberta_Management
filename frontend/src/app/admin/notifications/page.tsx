'use client';

import React from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminNotificationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
    if (!isLoading && isAuthenticated && user?.role !== 'ADMIN' && user?.role !== 'TEAM_MANAGER') {
      router.push('/agent');
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'TEAM_MANAGER')) {
    return null;
  }

  return (
    <AdminLayout>
      <NotificationProvider userId={user.id} userRole={user.role}>
        <NotificationList language={language} userRole={user.role} />
      </NotificationProvider>
    </AdminLayout>
  );
}