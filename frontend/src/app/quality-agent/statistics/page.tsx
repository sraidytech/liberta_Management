'use client';

import { useState, useEffect } from 'react';
import QualityLayout from '@/components/quality/quality-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { QualityStatistics, QualityTrend, AgentPerformance } from '@/types/quality';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  CalendarIcon
} from 'lucide-react';

export default function QualityStatisticsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  
  const [statistics, setStatistics] = useState<QualityStatistics | null>(null);
  const [trends, setTrends] = useState<QualityTrend[]>([]);
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Build query params for custom date range
      let statsParams = '';
      let trendsParams = `period=${timeRange}`;
      
      if (timeRange === 'custom' && startDate && endDate) {
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        statsParams = `?startDate=${startDateStr}&endDate=${endDateStr}`;
        trendsParams = `period=custom&startDate=${startDateStr}&endDate=${endDateStr}`;
      }

      // Fetch statistics
      try {
        const statsResponse = await fetch(`${apiBaseUrl}/api/v1/quality/statistics${statsParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('Statistics data received:', statsData);
          // The API returns { success: true, data: { statistics: {...} } }
          setStatistics(statsData.data?.statistics || statsData.data || null);
        } else {
          console.error('Statistics fetch failed:', statsResponse.status, statsResponse.statusText);
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
      }

      // Fetch trends
      try {
        const trendsResponse = await fetch(`${apiBaseUrl}/api/v1/quality/trends?${trendsParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (trendsResponse.ok) {
          const trendsData = await trendsResponse.json();
          console.log('Trends data received:', trendsData);
          // The API returns { success: true, data: { trends: [...] } }
          setTrends(trendsData.data?.trends || trendsData.data || []);
        } else {
          console.error('Trends fetch failed:', trendsResponse.status, trendsResponse.statusText);
        }
      } catch (err) {
        console.error('Error fetching trends:', err);
      }

      // Fetch performance (only for managers)
      if (user?.role === 'TEAM_MANAGER' || user?.role === 'ADMIN') {
        try {
          const perfResponse = await fetch(`${apiBaseUrl}/api/v1/quality/performance`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (perfResponse.ok) {
            const perfData = await perfResponse.json();
            console.log('Performance data received:', perfData);
            setPerformance(perfData.data || []);
          } else {
            console.error('Performance fetch failed:', perfResponse.status, perfResponse.statusText);
          }
        } catch (err) {
          console.error('Error fetching performance:', err);
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (!hours || isNaN(hours) || hours === 0) {
      return '0h';
    }
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    const wholeHours = Math.floor(hours);
    const mins = Math.round((hours % 1) * 60);
    return mins > 0 ? `${wholeHours}h ${mins}m` : `${wholeHours}h`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'MINOR': return 'bg-blue-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'MAJOR': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <QualityLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">{t('loading')}</div>
        </div>
      </QualityLayout>
    );
  }

  return (
    <QualityLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-6 space-y-6">
        {/* Header with Enhanced Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('qualityStatistics')}</h1>
              <p className="text-gray-600 mt-1">{t('viewDetailedStatistics')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">{t('today')}</option>
                <option value="week">{t('lastWeek')}</option>
                <option value="month">{t('lastMonth')}</option>
                <option value="quarter">{t('lastQuarter')}</option>
                <option value="year">{t('lastYear')}</option>
                <option value="custom">{t('customRange')}</option>
              </select>
              {timeRange === 'custom' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>{t('startDate')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>{t('endDate')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t('apply')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('pendingReviews')}</p>
                  <p className="text-3xl font-bold mt-2">{statistics.pendingReviews || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('completedToday')}</p>
                  <p className="text-3xl font-bold mt-2">{statistics.completedToday || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('approvalRate')}</p>
                  <p className="text-3xl font-bold mt-2">{(statistics.approvalRate || 0).toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('averageReviewTime')}</p>
                  <p className="text-3xl font-bold mt-2">{formatDuration(statistics.averageReviewTime || 0)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issues by Severity */}
          {statistics && statistics.issuesBySeverity && Object.keys(statistics.issuesBySeverity).length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChart className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold">{t('issuesBySeverity')}</h2>
              </div>
              <div className="space-y-4">
                {Object.entries(statistics.issuesBySeverity).map(([severity, count]) => {
                  const severityValues = Object.values(statistics.issuesBySeverity || {});
                  const total = severityValues.reduce((a, b) => (a || 0) + (b || 0), 0);
                  const percentage = total > 0 ? ((count || 0) / total) * 100 : 0;
                  
                  return (
                    <div key={severity}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {t(`${severity.toLowerCase()}Severity` as any)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {count || 0} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getSeverityColor(severity)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Quality Trends */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">{t('qualityTrends')}</h2>
            </div>
            {trends.length > 0 ? (
              <div className="space-y-3">
                {trends.slice(0, 7).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">
                      {new Date(trend.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{trend.approved}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">{trend.rejected}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">{trend.escalated}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">{t('noDataAvailable')}</p>
            )}
          </Card>
        </div>

        {/* Agent Performance */}
        {performance.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">{t('agentPerformanceComparison')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('agent')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('totalReviews')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('approved')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('rejected')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('escalated')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('approvalRate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('avgReviewTime')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {performance.map((agent) => (
                    <tr key={agent.agentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{agent.agentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.totalReviewed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {agent.decisionBreakdown.APPROVED || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {agent.decisionBreakdown.REJECTED || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {agent.decisionBreakdown.ESCALATED || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.approvalRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(agent.averageReviewTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        </div>
      </div>
    </QualityLayout>
  );
}