'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SystemInfo {
  nodeEnv: string;
  version: string;
  uptime: string;
  memoryUsage: {
    used: number;
    total: number;
  };
  databaseStatus: 'connected' | 'disconnected';
  redisStatus: 'connected' | 'disconnected';
}

export function SystemSettings() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('/api/v1/scheduler/system-info', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const info = data.data;
        
        // Format uptime
        const uptimeSeconds = info.uptime;
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeFormatted = `${days} days, ${hours} hours, ${minutes} minutes`;
        
        setSystemInfo({
          nodeEnv: info.nodeEnv,
          version: info.version,
          uptime: uptimeFormatted,
          memoryUsage: info.memoryUsage,
          databaseStatus: info.databaseStatus,
          redisStatus: info.redisStatus
        });
      }
    } catch (error) {
      console.error('Error fetching system info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: 'connected' | 'disconnected') => {
    return status === 'connected' 
      ? <Badge className="bg-green-500">Operational</Badge>
      : <Badge className="bg-red-500">Offline</Badge>;
  };

  const formatMemoryUsage = (used: number, total: number) => {
    const percentage = Math.round((used / total) * 100);
    return `${used}MB / ${total}MB (${percentage}%)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading system information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Overview</h2>
        <p className="text-gray-600 mt-1">Monitor system health and performance</p>
      </div>

      {/* System Health Overview */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Environment</label>
            <div className="mt-1">
              <Badge className={systemInfo?.nodeEnv === 'production' ? 'bg-green-500' : 'bg-yellow-500'}>
                {systemInfo?.nodeEnv?.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Version</label>
            <div className="mt-1 text-sm font-medium">{systemInfo?.version}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Uptime</label>
            <div className="mt-1 text-sm">{systemInfo?.uptime}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Memory Usage</label>
            <div className="mt-1 text-sm">
              {systemInfo && formatMemoryUsage(systemInfo.memoryUsage.used, systemInfo.memoryUsage.total)}
            </div>
          </div>
        </div>
      </Card>

      {/* Service Status */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Database Service</h4>
              <p className="text-sm text-gray-600">Primary data storage</p>
            </div>
            {systemInfo && getStatusBadge(systemInfo.databaseStatus)}
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Cache Service</h4>
              <p className="text-sm text-gray-600">Session and cache storage</p>
            </div>
            {systemInfo && getStatusBadge(systemInfo.redisStatus)}
          </div>
        </div>
      </Card>

      {/* System Actions */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">System Maintenance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
            <div className="font-medium mb-1">🔄 Restart Services</div>
            <div className="text-sm text-gray-600">Restart background services</div>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
            <div className="font-medium mb-1">🧹 Clear Cache</div>
            <div className="text-sm text-gray-600">Clear system cache</div>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
            <div className="font-medium mb-1">📊 Generate Report</div>
            <div className="text-sm text-gray-600">System health report</div>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
            <div className="font-medium mb-1">🔧 Database Maintenance</div>
            <div className="text-sm text-gray-600">Optimize database</div>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
            <div className="font-medium mb-1">📋 Export Logs</div>
            <div className="text-sm text-gray-600">Download system logs</div>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
            <div className="font-medium mb-1">⚙️ System Configuration</div>
            <div className="text-sm text-gray-600">Update system settings</div>
          </Button>
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {systemInfo?.databaseStatus === 'connected' && systemInfo?.redisStatus === 'connected' ? '100%' : '0%'}
            </div>
            <div className="text-sm text-blue-700">Services Online</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {systemInfo ? `${systemInfo.memoryUsage.used}MB` : '0MB'}
            </div>
            <div className="text-sm text-green-700">Memory Used</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {systemInfo?.nodeEnv === 'production' ? 'PROD' : 'DEV'}
            </div>
            <div className="text-sm text-purple-700">Environment</div>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">📋 System Information</h3>
        <div className="space-y-2 text-gray-700">
          <div className="flex justify-between">
            <span>Application Version:</span>
            <span className="font-medium">{systemInfo?.version}</span>
          </div>
          <div className="flex justify-between">
            <span>Environment:</span>
            <span className="font-medium">{systemInfo?.nodeEnv}</span>
          </div>
          <div className="flex justify-between">
            <span>System Uptime:</span>
            <span className="font-medium">{systemInfo?.uptime}</span>
          </div>
          <div className="flex justify-between">
            <span>Memory Usage:</span>
            <span className="font-medium">
              {systemInfo ? formatMemoryUsage(systemInfo.memoryUsage.used, systemInfo.memoryUsage.total) : 'Loading...'}
            </span>
          </div>
        </div>
      </Card>

      {/* Support Information */}
      <Card className="p-6 bg-blue-50">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">🛠️ Technical Support</h3>
        <div className="space-y-2 text-blue-800">
          <p>• System monitoring is active 24/7</p>
          <p>• Automated backups are performed daily</p>
          <p>• Security updates are applied automatically</p>
          <p>• For technical support, contact your system administrator</p>
        </div>
      </Card>
    </div>
  );
}