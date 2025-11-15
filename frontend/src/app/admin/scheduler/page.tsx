'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/admin-layout';

interface SchedulerStatus {
  status: string;
  isRunning: boolean;
  startedAt?: string;
  stoppedAt?: string;
  activeJobs: string[];
  lastSyncs: {
    ecomanager: {
      lastStart?: string;
      lastEnd?: string;
      lastResults?: any;
      lastError?: any;
    };
    shippingStatus: {
      lastStart?: string;
      lastEnd?: string;
      lastResults?: any;
      lastError?: any;
    };
    cleanup: {
      lastRun?: string;
      lastError?: any;
    };
  };
}

interface NextSyncTimes {
  nextEcoManagerSync: string;
  nextShippingStatusSync: string;
  nextDailyCleanup: string;
  currentTime: string;
}

export default function SchedulerPage() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [nextSyncTimes, setNextSyncTimes] = useState<NextSyncTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/v1/scheduler/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchedulerStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    }
  };

  const fetchNextSyncTimes = async () => {
    try {
      const response = await fetch('/api/v1/scheduler/next-sync-times', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNextSyncTimes(data.data);
      }
    } catch (error) {
      console.error('Error fetching next sync times:', error);
    }
  };

  const handleSchedulerAction = async (action: 'start' | 'stop') => {
    setActionLoading(action);
    try {
      const response = await fetch(`/api/v1/scheduler/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchSchedulerStatus();
        await fetchNextSyncTimes();
      }
    } catch (error) {
      console.error(`Error ${action}ing scheduler:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualSync = async (type: 'ecomanager' | 'shipping') => {
    setActionLoading(`sync-${type}`);
    try {
      const response = await fetch(`/api/v1/scheduler/trigger/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchSchedulerStatus();
      }
    } catch (error) {
      console.error(`Error triggering ${type} sync:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSchedulerStatus(), fetchNextSyncTimes()]);
      setLoading(false);
    };

    loadData();

    // 🔧 FIX: Reduce aggressive polling - refresh every 2 minutes instead of 30 seconds
    // Only refresh if page is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        // Don't show loading spinner on auto-refresh
        Promise.all([fetchSchedulerStatus(), fetchNextSyncTimes()]);
      }
    }, 120000); // 2 minutes
    
    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        Promise.all([fetchSchedulerStatus(), fetchNextSyncTimes()]);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'stopped':
        return <Badge className="bg-red-500">Stopped</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading scheduler status...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Background Job Scheduler</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => handleSchedulerAction('start')}
              disabled={schedulerStatus?.isRunning || actionLoading === 'start'}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'start' ? 'Starting...' : 'Start Scheduler'}
            </Button>
            <Button
              onClick={() => handleSchedulerAction('stop')}
              disabled={!schedulerStatus?.isRunning || actionLoading === 'stop'}
              variant="destructive"
            >
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop Scheduler'}
            </Button>
          </div>
        </div>

        {/* Scheduler Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Scheduler Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                {schedulerStatus && getStatusBadge(schedulerStatus.status)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Started At</label>
              <div className="mt-1 text-sm">{formatDateTime(schedulerStatus?.startedAt)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Active Jobs</label>
              <div className="mt-1 text-sm">{schedulerStatus?.activeJobs.length || 0}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Time</label>
              <div className="mt-1 text-sm">{formatDateTime(nextSyncTimes?.currentTime)}</div>
            </div>
          </div>
        </Card>

        {/* Next Sync Times */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Next Scheduled Syncs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">EcoManager Sync</h3>
              <p className="text-sm text-blue-700 mt-1">Every hour from 8 AM to 8 PM</p>
              <p className="text-sm font-medium mt-2">{formatDateTime(nextSyncTimes?.nextEcoManagerSync)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900">Shipping Status Sync</h3>
              <p className="text-sm text-green-700 mt-1">Every 6 hours (00:00, 06:00, 12:00, 18:00)</p>
              <p className="text-sm font-medium mt-2">{formatDateTime(nextSyncTimes?.nextShippingStatusSync)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900">Daily Cleanup</h3>
              <p className="text-sm text-purple-700 mt-1">Every day at 2:00 AM</p>
              <p className="text-sm font-medium mt-2">{formatDateTime(nextSyncTimes?.nextDailyCleanup)}</p>
            </div>
          </div>
        </Card>

        {/* Manual Sync Controls */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Manual Sync Controls</h2>
          <div className="flex gap-4">
            <Button
              onClick={() => handleManualSync('ecomanager')}
              disabled={actionLoading === 'sync-ecomanager'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === 'sync-ecomanager' ? 'Syncing...' : 'Sync EcoManager Now'}
            </Button>
            <Button
              onClick={() => handleManualSync('shipping')}
              disabled={actionLoading === 'sync-shipping'}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'sync-shipping' ? 'Syncing...' : 'Sync Shipping Status Now'}
            </Button>
          </div>
        </Card>

        {/* Last Sync Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EcoManager Sync Results */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">EcoManager Sync Status</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Last Started</label>
                <div className="text-sm">{formatDateTime(schedulerStatus?.lastSyncs.ecomanager.lastStart)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Completed</label>
                <div className="text-sm">{formatDateTime(schedulerStatus?.lastSyncs.ecomanager.lastEnd)}</div>
              </div>
              {schedulerStatus?.lastSyncs.ecomanager.lastResults && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Results</label>
                  <div className="text-sm bg-gray-50 p-2 rounded mt-1">
                    {Object.entries(schedulerStatus.lastSyncs.ecomanager.lastResults).map(([store, result]: [string, any]) => (
                      <div key={store} className="flex justify-between">
                        <span>{store}:</span>
                        <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                          {result.success ? `${result.syncedCount || 0} orders` : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {schedulerStatus?.lastSyncs.ecomanager.lastError && (
                <div>
                  <label className="text-sm font-medium text-red-500">Last Error</label>
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                    {schedulerStatus.lastSyncs.ecomanager.lastError.error}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Shipping Status Sync Results */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Shipping Status Sync</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Last Started</label>
                <div className="text-sm">{formatDateTime(schedulerStatus?.lastSyncs.shippingStatus.lastStart)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Completed</label>
                <div className="text-sm">{formatDateTime(schedulerStatus?.lastSyncs.shippingStatus.lastEnd)}</div>
              </div>
              {schedulerStatus?.lastSyncs.shippingStatus.lastResults && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Results</label>
                  <div className="text-sm bg-gray-50 p-2 rounded mt-1">
                    <div className="flex justify-between">
                      <span>Orders Updated:</span>
                      <span className="text-green-600">{schedulerStatus.lastSyncs.shippingStatus.lastResults.updated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <span className="text-red-600">{schedulerStatus.lastSyncs.shippingStatus.lastResults.errors}</span>
                    </div>
                  </div>
                </div>
              )}
              {schedulerStatus?.lastSyncs.shippingStatus.lastError && (
                <div>
                  <label className="text-sm font-medium text-red-500">Last Error</label>
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                    {schedulerStatus.lastSyncs.shippingStatus.lastError.error}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}