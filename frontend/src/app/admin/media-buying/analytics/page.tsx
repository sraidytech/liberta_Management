'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaBuyingService, DashboardStats, AnalyticsBySource, AdSource } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Analytics',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    custom: 'Custom',
    export: 'Export',
    loading: 'Loading...',
    error: 'Error loading data',
    noData: 'No data available',
    overview: 'Overview',
    totalSpend: 'Total Spend',
    totalLeads: 'Total Leads',
    avgCPL: 'Avg. Cost Per Lead',
    conversions: 'Conversions',
    conversionRate: 'Conversion Rate',
    roas: 'ROAS',
    spendBySource: 'Spend by Source',
    leadsbySource: 'Leads by Source',
    performanceBySource: 'Performance by Source',
    source: 'Source',
    spend: 'Spend',
    leads: 'Leads',
    cpl: 'CPL',
    share: 'Share',
    vsLastPeriod: 'vs last period',
    usd: 'USD',
    dzd: 'DZD',
  },
  fr: {
    title: 'Analytique',
    dateRange: 'Période',
    startDate: 'Date Début',
    endDate: 'Date Fin',
    thisMonth: 'Ce Mois',
    lastMonth: 'Mois Dernier',
    last7Days: '7 Derniers Jours',
    last30Days: '30 Derniers Jours',
    custom: 'Personnalisé',
    export: 'Exporter',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noData: 'Aucune donnée disponible',
    overview: 'Aperçu',
    totalSpend: 'Dépenses Totales',
    totalLeads: 'Total Leads',
    avgCPL: 'Coût Moyen Par Lead',
    conversions: 'Conversions',
    conversionRate: 'Taux de Conversion',
    roas: 'ROAS',
    spendBySource: 'Dépenses par Source',
    leadsbySource: 'Leads par Source',
    performanceBySource: 'Performance par Source',
    source: 'Source',
    spend: 'Dépense',
    leads: 'Leads',
    cpl: 'CPL',
    share: 'Part',
    vsLastPeriod: 'vs période précédente',
    usd: 'USD',
    dzd: 'DZD',
  },
};

type DatePreset = 'thisMonth' | 'lastMonth' | 'last7Days' | 'last30Days' | 'custom';

export default function MediaBuyingAnalyticsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sourceAnalytics, setSourceAnalytics] = useState<AnalyticsBySource[]>([]);
  const [sources, setSources] = useState<AdSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadSources();
    applyDatePreset('thisMonth');
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadAnalytics();
    }
  }, [startDate, endDate]);

  const loadSources = async () => {
    try {
      const data = await mediaBuyingService.getSources();
      setSources(data);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  };

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last7Days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30Days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const loadAnalytics = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [statsData, sourceData] = await Promise.all([
        mediaBuyingService.getDashboardStats(startDate, endDate),
        mediaBuyingService.getAnalyticsBySource(startDate, endDate),
      ]);
      
      setStats(statsData);
      setSourceAnalytics(sourceData);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await mediaBuyingService.exportData('csv', {
        startDate,
        endDate,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-buying-analytics-${startDate}-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency: 'USD' | 'DZD' = 'USD') => {
    const safeAmount = amount ?? 0;
    if (currency === 'USD') {
      return `$${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${safeAmount.toLocaleString()} DZD`;
  };

  const formatPercentage = (value: number | undefined | null) => {
    const safeValue = value ?? 0;
    const sign = safeValue >= 0 ? '+' : '';
    return `${sign}${safeValue.toFixed(1)}%`;
  };

  const getChangeColor = (value: number, inverse = false) => {
    if (inverse) {
      return value > 0 ? 'text-red-600' : value < 0 ? 'text-green-600' : 'text-gray-600';
    }
    return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return null;
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t[language].export}
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{t[language].dateRange}:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(['thisMonth', 'lastMonth', 'last7Days', 'last30Days'] as DatePreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={datePreset === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyDatePreset(preset)}
                  className={datePreset === preset ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {t[language][preset]}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                className="w-40"
              />
              <span className="text-gray-400">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                className="w-40"
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : (
          <>
            {/* Overview KPIs */}
            <div>
              <h2 className="text-lg font-semibold mb-4">{t[language].overview}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Spend */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].totalSpend}</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(stats?.totalSpendUSD || 0)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatCurrency(stats?.totalSpendDZD || 0, 'DZD')}
                      </p>
                      {stats?.periodComparison && (
                        <div className={`flex items-center mt-2 text-sm ${getChangeColor(stats.periodComparison.spendChange, true)}`}>
                          {getChangeIcon(stats.periodComparison.spendChange)}
                          <span>{formatPercentage(stats.periodComparison.spendChange)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-full bg-purple-50">
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </Card>

                {/* Total Leads */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].totalLeads}</p>
                      <p className="text-2xl font-bold mt-2">{stats?.totalLeads || 0}</p>
                      {stats?.periodComparison && (
                        <div className={`flex items-center mt-2 text-sm ${getChangeColor(stats.periodComparison.leadsChange)}`}>
                          {getChangeIcon(stats.periodComparison.leadsChange)}
                          <span>{formatPercentage(stats.periodComparison.leadsChange)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-full bg-blue-50">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </Card>

                {/* Avg CPL */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].avgCPL}</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(stats?.avgCostPerLead || 0)}
                      </p>
                      {stats?.periodComparison && (
                        <div className={`flex items-center mt-2 text-sm ${getChangeColor(stats.periodComparison.cplChange, true)}`}>
                          {getChangeIcon(stats.periodComparison.cplChange)}
                          <span>{formatPercentage(stats.periodComparison.cplChange)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-full bg-amber-50">
                      <Target className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                </Card>

                {/* Conversions */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].conversions}</p>
                      <p className="text-2xl font-bold mt-2">{stats?.totalConversions || 0}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {((stats?.conversionRate || 0) * 100).toFixed(1)}% {t[language].conversionRate}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-green-50">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Performance by Source */}
            <div>
              <h2 className="text-lg font-semibold mb-4">{t[language].performanceBySource}</h2>
              
              {sourceAnalytics.length === 0 ? (
                <Card className="p-12">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <PieChart className="w-12 h-12 mb-4 text-gray-300" />
                    <p>{t[language].noData}</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Spend Distribution */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      {t[language].spendBySource}
                    </h3>
                    <div className="space-y-4">
                      {sourceAnalytics.map((source) => (
                        <div key={source.sourceId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: source.sourceColor || '#8B5CF6' }}
                              />
                              <span className="font-medium text-sm">{source.sourceName || 'Unknown'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">{formatCurrency(source.totalSpendUSD)}</span>
                              <span className="text-gray-500 text-sm ml-2">
                                ({(source.percentageOfTotal || 0).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${source.percentageOfTotal || 0}%`,
                                backgroundColor: source.sourceColor || '#8B5CF6'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Leads Distribution */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      {t[language].leadsbySource}
                    </h3>
                    <div className="space-y-4">
                      {sourceAnalytics.map((source) => {
                        const totalLeads = sourceAnalytics.reduce((sum, s) => sum + (s.totalLeads || 0), 0);
                        const percentage = totalLeads > 0 ? ((source.totalLeads || 0) / totalLeads) * 100 : 0;
                        return (
                          <div key={source.sourceId} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: source.sourceColor || '#8B5CF6' }}
                                />
                                <span className="font-medium text-sm">{source.sourceName || 'Unknown'}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">{source.totalLeads || 0}</span>
                                <span className="text-gray-500 text-sm ml-2">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: source.sourceColor || '#8B5CF6'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Detailed Table */}
            {sourceAnalytics.length > 0 && (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].source}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].spend} (USD)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].spend} (DZD)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].leads}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].cpl}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].share}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sourceAnalytics.map((source) => (
                        <tr key={source.sourceId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: source.sourceColor || '#8B5CF6' }}
                              />
                              <span className="font-medium">{source.sourceName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                            {formatCurrency(source.totalSpendUSD)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                            {(source.totalSpendDZD || 0).toLocaleString()} DZD
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {source.totalLeads || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                            {formatCurrency(source.avgCostPerLead)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {(source.percentageOfTotal || 0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-3 whitespace-nowrap">Total</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {formatCurrency(sourceAnalytics.reduce((sum, s) => sum + (s.totalSpendUSD || 0), 0))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                          {sourceAnalytics.reduce((sum, s) => sum + (s.totalSpendDZD || 0), 0).toLocaleString()} DZD
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {sourceAnalytics.reduce((sum, s) => sum + (s.totalLeads || 0), 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {formatCurrency(stats?.avgCostPerLead || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                            100%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}