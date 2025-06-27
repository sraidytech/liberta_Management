'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  XCircle, 
  Info,
  TrendingUp,
  Database,
  Clock
} from 'lucide-react';

interface ActivityStats {
  totalLogs: number;
  logsByLevel: {
    INFO: number;
    WARNING: number;
    ERROR: number;
  };
  logsByActionType: {
    [key: string]: number;
  };
  topUsers: Array<{
    userId: string;
    userName: string;
    activityCount: number;
  }>;
}

interface ActivityLogsStatsProps {
  stats: ActivityStats;
}

export function ActivityLogsStats({ stats }: ActivityLogsStatsProps) {
  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'AUTHENTICATION':
        return '🔐';
      case 'USER_MANAGEMENT':
        return '👥';
      case 'ORDER_MANAGEMENT':
        return '📦';
      case 'STORE_MANAGEMENT':
        return '🏪';
      case 'ASSIGNMENT':
        return '📋';
      case 'COMMISSION':
        return '💰';
      case 'SYSTEM':
        return '⚙️';
      case 'WEBHOOK':
        return '🔗';
      case 'API_CALL':
        return '🌐';
      case 'ERROR':
        return '❌';
      default:
        return '📊';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.totalLogs)}</div>
          <p className="text-xs text-muted-foreground">
            All activity records
          </p>
        </CardContent>
      </Card>

      {/* Log Levels */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Log Levels</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3 text-blue-500" />
                <span className="text-sm">Info</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatNumber(stats.logsByLevel.INFO || 0)}</span>
                <Badge variant="default" className="text-xs">
                  {getPercentage(stats.logsByLevel.INFO || 0, stats.totalLogs)}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-sm">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatNumber(stats.logsByLevel.WARNING || 0)}</span>
                <Badge variant="secondary" className="text-xs">
                  {getPercentage(stats.logsByLevel.WARNING || 0, stats.totalLogs)}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-3 w-3 text-red-500" />
                <span className="text-sm">Error</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatNumber(stats.logsByLevel.ERROR || 0)}</span>
                <Badge variant="destructive" className="text-xs">
                  {getPercentage(stats.logsByLevel.ERROR || 0, stats.totalLogs)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Action Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Action Types</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.logsByActionType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([actionType, count]) => (
                <div key={actionType} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getActionTypeIcon(actionType)}</span>
                    <span className="text-sm">{actionType.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatNumber(count)}</span>
                    <Badge variant="outline" className="text-xs">
                      {getPercentage(count, stats.totalLogs)}%
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Active Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topUsers.slice(0, 3).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium truncate max-w-[120px]">
                      {user.userName || 'Unknown User'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatNumber(user.activityCount)}</span>
                  <Badge variant="outline" className="text-xs">
                    {getPercentage(user.activityCount, stats.totalLogs)}%
                  </Badge>
                </div>
              </div>
            ))}
            {stats.topUsers.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-2">
                No user activity data
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Types Overview */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Action Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.logsByActionType)
              .sort(([, a], [, b]) => b - a)
              .map(([actionType, count]) => (
                <div key={actionType} className="text-center">
                  <div className="text-2xl mb-1">{getActionTypeIcon(actionType)}</div>
                  <div className="text-lg font-semibold">{formatNumber(count)}</div>
                  <div className="text-xs text-gray-500">{actionType.replace(/_/g, ' ')}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getPercentage(count, stats.totalLogs)}%
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}