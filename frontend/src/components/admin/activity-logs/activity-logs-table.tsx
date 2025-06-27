'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  User, 
  Clock, 
  Globe, 
  Server,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ActivityLogsTableProps {
  logs: ActivityLog[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function ActivityLogsTable({ logs, loading, pagination, onPageChange }: ActivityLogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogLevelBadge = (level: string) => {
    const variants = {
      ERROR: 'destructive',
      WARNING: 'secondary',
      INFO: 'default',
    } as const;

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'default'}>
        {level}
      </Badge>
    );
  };

  const getActionTypeBadge = (actionType: string) => {
    const colors = {
      AUTHENTICATION: 'bg-green-100 text-green-800',
      USER_MANAGEMENT: 'bg-blue-100 text-blue-800',
      ORDER_MANAGEMENT: 'bg-purple-100 text-purple-800',
      STORE_MANAGEMENT: 'bg-orange-100 text-orange-800',
      ASSIGNMENT: 'bg-indigo-100 text-indigo-800',
      COMMISSION: 'bg-yellow-100 text-yellow-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
      WEBHOOK: 'bg-pink-100 text-pink-800',
      API_CALL: 'bg-cyan-100 text-cyan-800',
      ERROR: 'bg-red-100 text-red-800',
    } as const;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[actionType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {actionType.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusCodeColor = (statusCode?: number) => {
    if (!statusCode) return 'text-gray-500';
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600';
    if (statusCode >= 300 && statusCode < 400) return 'text-yellow-600';
    if (statusCode >= 400 && statusCode < 500) return 'text-orange-600';
    if (statusCode >= 500) return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Timestamp</th>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Level</th>
              <th className="text-left p-3 font-medium">Description</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formatTimestamp(log.timestamp)}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">
                        {log.userName || 'System'}
                      </div>
                      {log.userRole && (
                        <div className="text-xs text-gray-500">
                          {log.userRole.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {log.action}
                  </code>
                </td>
                <td className="p-3">
                  {getActionTypeBadge(log.actionType)}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {getLogLevelIcon(log.logLevel)}
                    {getLogLevelBadge(log.logLevel)}
                  </div>
                </td>
                <td className="p-3">
                  <div className="max-w-md truncate text-sm">
                    {log.description}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {log.httpMethod && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {log.httpMethod}
                      </span>
                    )}
                    {log.statusCode && (
                      <span className={`text-xs font-medium ${getStatusCodeColor(log.statusCode)}`}>
                        {log.statusCode}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No activity logs found
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Activity Log Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Timestamp</label>
                    <p className="text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Log Level</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getLogLevelIcon(selectedLog.logLevel)}
                      {getLogLevelBadge(selectedLog.logLevel)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">User</label>
                    <p className="text-sm">{selectedLog.userName || 'System'}</p>
                    {selectedLog.userRole && (
                      <p className="text-xs text-gray-500">{selectedLog.userRole}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Action Type</label>
                    <div className="mt-1">
                      {getActionTypeBadge(selectedLog.actionType)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Action</label>
                  <code className="block text-sm bg-gray-100 p-2 rounded mt-1">
                    {selectedLog.action}
                  </code>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm mt-1">{selectedLog.description}</p>
                </div>

                {selectedLog.resourceType && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Resource Type</label>
                      <p className="text-sm">{selectedLog.resourceType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Resource ID</label>
                      <p className="text-sm">{selectedLog.resourceId || 'N/A'}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedLog.ipAddress || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Endpoint</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Server className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedLog.endpoint || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {(selectedLog.httpMethod || selectedLog.statusCode) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">HTTP Method</label>
                      <p className="text-sm">{selectedLog.httpMethod || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status Code</label>
                      <p className={`text-sm ${getStatusCodeColor(selectedLog.statusCode)}`}>
                        {selectedLog.statusCode || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Old Values */}
                {selectedLog.oldValues && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Previous Values</label>
                    <div className="mt-1 bg-red-50 border border-red-200 rounded p-3">
                      <pre className="text-xs text-red-800 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* New Values */}
                {selectedLog.newValues && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">New Values</label>
                    <div className="mt-1 bg-green-50 border border-green-200 rounded p-3">
                      <pre className="text-xs text-green-800 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.newValues, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.metadata && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Additional Details</label>
                    <div className="mt-1 bg-gray-50 border border-gray-200 rounded p-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}