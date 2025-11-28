'use client';

import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaBuyingService, DashboardStats, AnalyticsBySource, AdSource, MediaBuyingEntry } from '@/services/media-buying.service';
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
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Inline translations
const t = {
  en: {
    title: 'Analytics Dashboard',
    subtitle: 'Track your media buying performance and ROI',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    custom: 'Custom',
    export: 'Export Report',
    loading: 'Loading analytics...',
    error: 'Error loading data',
    noData: 'No data available for this period',
    overview: 'Performance Overview',
    totalSpend: 'Total Spend',
    totalLeads: 'Total Leads',
    avgCPL: 'Avg. Cost Per Lead',
    conversions: 'Conversions',
    conversionRate: 'Conversion Rate',
    roas: 'ROAS',
    spendBySource: 'Spend Distribution',
    leadsbySource: 'Leads Volume by Source',
    performanceBySource: 'Source Performance',
    source: 'Source',
    spend: 'Spend',
    leads: 'Leads',
    cpl: 'CPL',
    share: 'Share',
    vsLastPeriod: 'vs last period',
    usd: 'USD',
    dzd: 'DZD',
    dailyTrends: 'Daily Performance Trends',
    spendTrend: 'Spend Trend',
    leadsTrend: 'Leads Trend',
  },
  fr: {
    title: 'Tableau de Bord Analytique',
    subtitle: 'Suivez vos performances d\'achat média et votre ROI',
    dateRange: 'Période',
    startDate: 'Date Début',
    endDate: 'Date Fin',
    thisMonth: 'Ce Mois',
    lastMonth: 'Mois Dernier',
    last7Days: '7 Derniers Jours',
    last30Days: '30 Derniers Jours',
    custom: 'Personnalisé',
    export: 'Exporter Rapport',
    loading: 'Chargement des analyses...',
    error: 'Erreur de chargement',
    noData: 'Aucune donnée disponible pour cette période',
    overview: 'Aperçu des Performances',
    totalSpend: 'Dépenses Totales',
    totalLeads: 'Total Leads',
    avgCPL: 'Coût Moyen Par Lead',
    conversions: 'Conversions',
    conversionRate: 'Taux de Conversion',
    roas: 'ROAS',
    spendBySource: 'Répartition des Dépenses',
    leadsbySource: 'Volume de Leads par Source',
    performanceBySource: 'Performance par Source',
    source: 'Source',
    spend: 'Dépense',
    leads: 'Leads',
    cpl: 'CPL',
    share: 'Part',
    vsLastPeriod: 'vs période précédente',
    usd: 'USD',
    dzd: 'DZD',
    dailyTrends: 'Tendances Journalières',
    spendTrend: 'Tendance Dépenses',
    leadsTrend: 'Tendance Leads',
  },
};

type DatePreset = 'thisMonth' | 'lastMonth' | 'last7Days' | 'last30Days' | 'custom';

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/20 text-sm">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 capitalize">{entry.name}:</span>
            <span className="font-bold text-gray-900">
              {entry.name.toLowerCase().includes('spend') || entry.name.toLowerCase().includes('cost')
                ? (currency === 'USD' ? `$${entry.value.toFixed(2)}` : `${entry.value.toLocaleString()} DZD`)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function MediaBuyingAnalyticsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sourceAnalytics, setSourceAnalytics] = useState<AnalyticsBySource[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    applyDatePreset('thisMonth');
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadAnalytics();
    }
  }, [startDate, endDate]);

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

      // Fetch stats, source analytics, and entries for trends in parallel
      const [statsData, sourceData, entriesData] = await Promise.all([
        mediaBuyingService.getDashboardStats(startDate, endDate),
        mediaBuyingService.getAnalyticsBySource(startDate, endDate),
        mediaBuyingService.getEntries({ startDate, endDate, limit: 1000 })
      ]);

      setStats(statsData);
      setSourceAnalytics(sourceData);

      // Process entries for trend chart
      const entries = entriesData.entries;
      const groupedByDate = entries.reduce((acc: any, entry) => {
        const date = new Date(entry.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
        if (!acc[date]) {
          acc[date] = { date, spend: 0, leads: 0 };
        }
        acc[date].spend += entry.spendUSD;
        acc[date].leads += entry.totalLeads;
        return acc;
      }, {});

      // Sort by date (this is a simple sort, might need better date parsing for strict ordering but works for now)
      const sortedTrends = Object.values(groupedByDate).sort((a: any, b: any) => {
        // Simple heuristic sort or rely on API return order if it was sorted
        return 0;
      });
      // Actually, let's rely on the API returning entries, but we should probably sort the keys properly.
      // Better approach: generate all dates in range and fill.
      // For simplicity in this UI overhaul, we'll just use the entries as returned (usually sorted by date desc, so reverse)

      // Re-process with proper sorting
      const trendMap = new Map();
      entries.forEach(entry => {
        const dateKey = entry.date.split('T')[0];
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { date: dateKey, spend: 0, leads: 0 });
        }
        const curr = trendMap.get(dateKey);
        curr.spend += entry.spendUSD;
        curr.leads += entry.totalLeads;
      });

      const sortedTrendData = Array.from(trendMap.values())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item: any) => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' })
        }));

      setTrendData(sortedTrendData);

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
      return value > 0 ? 'text-red-500' : value < 0 ? 'text-green-500' : 'text-gray-500';
    }
    return value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return null;
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-8 w-full pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{t[language].title}</h1>
            <p className="text-gray-500 mt-2 text-lg">{t[language].subtitle}</p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            {t[language].export}
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card className="p-2 bg-white/70 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl">
          <div className="flex flex-wrap items-center gap-2 p-2">
            <div className="flex items-center gap-2 mr-4 px-3 py-2 bg-gray-100/50 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700">{t[language].dateRange}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['thisMonth', 'lastMonth', 'last7Days', 'last30Days'] as DatePreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={datePreset === preset ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => applyDatePreset(preset)}
                  className={`rounded-xl transition-all ${datePreset === preset
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200'
                    : 'hover:bg-gray-100 text-gray-600'
                    }`}
                >
                  {t[language][preset]}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto bg-gray-50 p-1 rounded-xl border border-gray-100">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                className="w-auto border-none bg-transparent focus:ring-0 text-sm"
              />
              <span className="text-gray-400 font-medium">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                className="w-auto border-none bg-transparent focus:ring-0 text-sm"
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-500 animate-pulse">{t[language].loading}</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500 bg-red-50 rounded-3xl border border-red-100">
            {error}
          </div>
        ) : (
          <>
            {/* Overview KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Spend */}
              <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t[language].totalSpend}</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                      {formatCurrency(stats?.totalSpendUSD || 0)}
                    </p>
                    <p className="text-xs font-medium text-gray-400 mt-1">
                      {formatCurrency(stats?.totalSpendDZD || 0, 'DZD')}
                    </p>
                    {stats?.periodComparison && (
                      <div className={`flex items-center mt-3 text-xs font-semibold px-2 py-1 rounded-full w-fit ${stats.periodComparison.spendChange > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        {getChangeIcon(stats.periodComparison.spendChange)}
                        <span className="ml-1">{formatPercentage(stats.periodComparison.spendChange)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              {/* Total Leads */}
              <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t[language].totalLeads}</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats?.totalLeads || 0}</p>
                    {stats?.periodComparison && (
                      <div className={`flex items-center mt-3 text-xs font-semibold px-2 py-1 rounded-full w-fit ${stats.periodComparison.leadsChange > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                        {getChangeIcon(stats.periodComparison.leadsChange)}
                        <span className="ml-1">{formatPercentage(stats.periodComparison.leadsChange)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              {/* Avg CPL */}
              <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t[language].avgCPL}</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                      {formatCurrency(stats?.avgCostPerLead || 0)}
                    </p>
                    {stats?.periodComparison && (
                      <div className={`flex items-center mt-3 text-xs font-semibold px-2 py-1 rounded-full w-fit ${stats.periodComparison.cplChange > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        {getChangeIcon(stats.periodComparison.cplChange)}
                        <span className="ml-1">{formatPercentage(stats.periodComparison.cplChange)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                    <Target className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              {/* Conversions */}
              <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{t[language].conversions}</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">{stats?.totalConversions || 0}</p>
                    <p className="text-sm font-medium text-green-600 mt-1 flex items-center">
                      <Activity className="w-3 h-3 mr-1" />
                      {((stats?.conversionRate || 0) * 100).toFixed(1)}% {t[language].conversionRate}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Trend Chart */}
            <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-xl rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{t[language].dailyTrends}</h3>
                  <p className="text-sm text-gray-500">Spend vs Leads over time</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span className="text-gray-600">{t[language].spend} ($)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                    <span className="text-gray-600">{t[language].leads}</span>
                  </div>
                </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="displayDate"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="spend"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSpend)"
                      name="Spend"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="leads"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                      name="Leads"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spend Distribution */}
              <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-xl rounded-3xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PieChartIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  {t[language].spendBySource}
                </h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                  {sourceAnalytics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceAnalytics as any[]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="totalSpendUSD"
                          nameKey="sourceName"
                        >
                          {sourceAnalytics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.sourceColor || '#8B5CF6'} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(value, entry: any) => (
                            <span className="text-gray-600 text-sm font-medium ml-1">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-400">No data to display</div>
                  )}
                </div>
              </Card>

              {/* Leads Distribution */}
              <Card className="p-6 bg-white/80 backdrop-blur-md border-white/40 shadow-xl rounded-3xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  {t[language].leadsbySource}
                </h3>
                <div className="h-[300px] w-full">
                  {sourceAnalytics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourceAnalytics} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="sourceName"
                          tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }}
                          width={100}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
                                  <p className="font-bold">{data.sourceName}</p>
                                  <p className="text-blue-600">{data.totalLeads} Leads</p>
                                  <p className="text-gray-500 text-xs mt-1">{formatCurrency(data.avgCostPerLead)} / lead</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="totalLeads" radius={[0, 4, 4, 0]} barSize={20}>
                          {sourceAnalytics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.sourceColor || '#3B82F6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No data to display</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Detailed Table */}
            {sourceAnalytics.length > 0 && (
              <Card className="overflow-hidden bg-white/80 backdrop-blur-md border-white/40 shadow-xl rounded-3xl">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">{t[language].performanceBySource}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t[language].source}
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t[language].spend} (USD)
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t[language].spend} (DZD)
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t[language].leads}
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t[language].cpl}
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t[language].share}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sourceAnalytics.map((source) => (
                        <tr key={source.sourceId} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                style={{ backgroundColor: source.sourceColor || '#8B5CF6' }}
                              >
                                {source.sourceName.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-900">{source.sourceName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                            {formatCurrency(source.totalSpendUSD)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                            {(source.totalSpendDZD || 0).toLocaleString()} DZD
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                            {source.totalLeads || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {formatCurrency(source.avgCostPerLead)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm text-gray-600">{(source.percentageOfTotal || 0).toFixed(1)}%</span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${source.percentageOfTotal || 0}%`,
                                    backgroundColor: source.sourceColor || '#8B5CF6'
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
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