'use client';

import React from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <NotificationProvider userId={user.id} userRole={user.role}>
      <div className="min-h-screen bg-gray-50">
        <NotificationList language={language} />
      </div>
    </NotificationProvider>
  );
}