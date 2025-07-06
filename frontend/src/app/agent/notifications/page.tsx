'use client';

import React from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import AgentLayout from '@/components/agent/agent-layout';

export default function AgentNotificationsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();

  return (
    <AgentLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'fr' ? 'Mes Notifications' : 'My Notifications'}
          </h1>
          <p className="text-gray-600">
            {language === 'fr' ? 'Gérez vos notifications' : 'Manage your notifications'}
          </p>
        </div>

        {/* Notifications Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <NotificationList language={language} />
        </div>
      </div>
    </AgentLayout>
  );
}