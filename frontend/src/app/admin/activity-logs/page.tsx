'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { ActivityLogsTable } from '@/components/admin/activity-logs/activity-logs-table';
import { ActivityLogsFilters } from '@/components/admin/activity-logs/activity-logs-filters';
import { ActivityLogsStats } from '@/components/admin/activity-logs/activity-logs-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Trash2 } from 'lucide-react';

interface ActivityLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  actionType: string;
  description: string;
  logLevel: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  metadata?: any;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface ActivityLogFilters {
  userId?: string;
  actionType?: string;
  logLevel?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [stats, setStats] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState<any>(null);

  const fetchLogs = async (page = 1, newFilters = filters) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy: 'timestamp',
        sortOrder: 'desc',
        ...Object.fromEntries(
          Object.entries(newFilters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/activity-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch activity logs');
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/activity-logs/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/activity-logs/filter-options`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleFilterChange = (newFilters: ActivityLogFilters) => {
    setFilters(newFilters);
    fetchLogs(1, newFilters);
  };

  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  const handleRefresh = () => {
    fetchLogs(pagination.page);
    fetchStats();
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
        limit: '10000', // Export more records
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/activity-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Convert to CSV
        const csvContent = [
          ['Timestamp', 'User', 'Action', 'Type', 'Level', 'Description', 'Resource', 'IP Address'].join(','),
          ...data.data.map((log: ActivityLog) => [
            log.timestamp,
            log.userName || 'System',
            log.action,
            log.actionType,
            log.logLevel,
            `"${log.description}"`,
            log.resourceType || '',
            log.ipAddress || '',
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to delete old logs? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/activity-logs/cleanup`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysToKeep: 90 }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully deleted ${data.deletedCount} old log entries`);
        handleRefresh();
      } else {
        alert('Failed to cleanup old logs');
      }
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      alert('Error cleaning up logs');
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchFilterOptions();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
            <p className="text-muted-foreground">
              Monitor and audit all system activities and user actions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="destructive" onClick={handleCleanup}>
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && <ActivityLogsStats stats={stats} />}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityLogsFilters
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
            />
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityLogsTable
              logs={logs}
              loading={loading}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}