'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/admin/admin-layout';
import { SchedulerSettings } from '@/components/admin/settings/scheduler-settings';
import { MaystroApiSettings } from '@/components/admin/settings/maystro-api-settings';
import { SystemSettings } from '@/components/admin/settings/system-settings';
import { NoteTypesSettings } from '@/components/admin/settings/note-types-settings';
import { WilayaDeliverySettings } from '@/components/admin/settings/wilaya-delivery-settings';

type SettingsTab = 'scheduler' | 'maystro' | 'system' | 'note-types' | 'wilaya-delivery';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('scheduler');

  const tabs = [
    { id: 'scheduler' as SettingsTab, label: 'Background Jobs & Scheduler', icon: '📅' },
    { id: 'maystro' as SettingsTab, label: 'Maystro API Keys', icon: '🚚' },
    { id: 'system' as SettingsTab, label: 'System Settings', icon: '⚙️' },
    { id: 'note-types' as SettingsTab, label: 'Note Types', icon: '📝' },
    { id: 'wilaya-delivery' as SettingsTab, label: 'Wilaya Delivery Times', icon: '🗺️' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Settings</h1>
          <div className="text-sm text-gray-500">
            Configure system-wide settings and integrations
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <Card className="p-1">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                className={`flex-1 justify-start gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Settings Content */}
        <div className="min-h-[600px]">
          {activeTab === 'scheduler' && <SchedulerSettings />}
          {activeTab === 'maystro' && <MaystroApiSettings />}
          {activeTab === 'system' && <SystemSettings />}
          {activeTab === 'note-types' && <NoteTypesSettings />}
          {activeTab === 'wilaya-delivery' && <WilayaDeliverySettings />}
        </div>
      </div>
    </AdminLayout>
  );
}