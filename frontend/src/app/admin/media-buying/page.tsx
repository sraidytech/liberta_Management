'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mediaBuyingService, DashboardStats, AnalyticsBySource, BudgetStatus, BudgetAlert } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  DollarSign, 
  Users, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Plus, 
  XCircle,
  AlertCircle,
  PieChart,
  FileText,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Media Buying Dashboard',
    totalSpend: 'Total Spend',
    totalLeads: 'Total Leads',
    costPerLead: 'Cost Per Lead',
    conversions: 'Conversions',
    conversionRate: 'Conversion Rate',
    avgROAS: 'Avg. ROAS',
    spendBySource: 'Spend by Source',
    budgetStatus: 'Budget Status',
    recentAlerts: 'Recent Alerts',
    quickActions: 'Quick Actions',
    addEntry: 'Add Entry',
    viewEntries: 'View Entries',
    viewAll: 'View All',
    loading: 'Loading...',
    error: 'Error loading data',
    noData: 'No data available',
    noAlerts: 'No alerts',
    entries: 'Entries',
    sources: 'Sources',
    budgets: 'Budgets',
    analytics: 'Analytics',
    settings: 'Settings',
    usd: 'USD',
    dzd: 'DZD',
    leads: 'leads',
    spent: 'spent',
    remaining: 'remaining',
    overBudget: 'Over Budget',
    vsLastPeriod: 'vs last period',
    budgetUsed: 'budget used',
  },
  fr: {
    title: 'Tableau de Bord Media Buying',
    totalSpend: 'Dépenses Totales',
    totalLeads: 'Total Leads',
    costPerLead: 'Coût Par Lead',
    conversions: 'Conversions',
    conversionRate: 'Taux de Conversion',
    avgROAS: 'ROAS Moyen',
    spendBySource: 'Dépenses par Source',
    budgetStatus: 'État du Budget',
    recentAlerts: 'Alertes Récentes',
    quickActions: 'Actions Rapides',
    addEntry: 'Ajouter Entrée',
    viewEntries: 'Voir Entrées',
    viewAll: 'Voir Tout',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noData: 'Aucune donnée disponible',
    noAlerts: 'Aucune alerte',
    entries: 'Entrées',
    sources: 'Sources',
    budgets: 'Budgets',
    analytics: 'Analytique',
    settings: 'Paramètres',
    usd: 'USD',
    dzd: 'DZD',
    leads: 'leads',
    spent: 'dépensé',
    remaining: 'restant',
    overBudget: 'Dépassement',
    vsLastPeriod: 'vs période précédente',
    budgetUsed: 'budget utilisé',
  },
};

export default function MediaBuyingDashboard() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sourceAnalytics, setSourceAnalytics] = useState<AnalyticsBySource[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Get current month date range
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [statsData, sourceData, budgetData, alertsData] = await Promise.all([
        mediaBuyingService.getDashboardStats(startDate, endDate),
        mediaBuyingService.getAnalyticsBySource(startDate, endDate),
        mediaBuyingService.getBudgetStatus(now.getMonth() + 1, now.getFullYear()),
        mediaBuyingService.getAlerts(true),
      ]);
      
      setStats(statsData);
      setSourceAnalytics(sourceData);
      setBudgetStatus(budgetData);
      setAlerts(alertsData);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
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

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getChangeColor = (value: number, inverse = false) => {
    if (inverse) {
      return value > 0 ? 'text-red-600' : value < 0 ? 'text-green-600' : 'text-gray-600';
    }
    return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
  };

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'EXCEEDED': return 'bg-red-50 border-red-200 text-red-800';
      case 'THRESHOLD_90': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'THRESHOLD_75': return 'bg-amber-50 border-amber-200 text-amber-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Choose layout based on user role
  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t[language].loading}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">{error}</p>
            <Button onClick={loadDashboardData} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/admin/media-buying/entries?action=new')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t[language].addEntry}
            </Button>
            <Button
              onClick={() => router.push('/admin/media-buying/entries')}
              variant="outline"
            >
              {t[language].viewEntries}
            </Button>
          </div>
        </div>

        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Spend */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
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
                    <span>{formatPercentage(stats.periodComparison.spendChange)} {t[language].vsLastPeriod}</span>
                  </div>
                )}
              </div>
              <div className="p-4 rounded-full bg-purple-50">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </Card>

          {/* Total Leads */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t[language].totalLeads}</p>
                <p className="text-2xl font-bold mt-2">{stats?.totalLeads || 0}</p>
                {stats?.periodComparison && (
                  <div className={`flex items-center mt-2 text-sm ${getChangeColor(stats.periodComparison.leadsChange)}`}>
                    {getChangeIcon(stats.periodComparison.leadsChange)}
                    <span>{formatPercentage(stats.periodComparison.leadsChange)} {t[language].vsLastPeriod}</span>
                  </div>
                )}
              </div>
              <div className="p-4 rounded-full bg-blue-50">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Cost Per Lead */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t[language].costPerLead}</p>
                <p className="text-2xl font-bold mt-2">
                  {formatCurrency(stats?.avgCostPerLead || 0)}
                </p>
                {stats?.periodComparison && (
                  <div className={`flex items-center mt-2 text-sm ${getChangeColor(stats.periodComparison.cplChange, true)}`}>
                    {getChangeIcon(stats.periodComparison.cplChange)}
                    <span>{formatPercentage(stats.periodComparison.cplChange)} {t[language].vsLastPeriod}</span>
                  </div>
                )}
              </div>
              <div className="p-4 rounded-full bg-amber-50">
                <Target className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </Card>

          {/* Conversions */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/media-buying/conversions')}>
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

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/media-buying/entries')}
          >
            <FileText className="w-6 h-6 mb-2" />
            {t[language].entries}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/media-buying/sources')}
          >
            <Megaphone className="w-6 h-6 mb-2" />
            {t[language].sources}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/media-buying/budgets')}
          >
            <DollarSign className="w-6 h-6 mb-2" />
            {t[language].budgets}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/media-buying/analytics')}
          >
            <PieChart className="w-6 h-6 mb-2" />
            {t[language].analytics}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/media-buying/settings')}
          >
            <Target className="w-6 h-6 mb-2" />
            {t[language].settings}
          </Button>
        </div>

        {/* Spend by Source & Budget Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spend by Source */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t[language].spendBySource}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/media-buying/analytics')}
              >
                {t[language].viewAll}
              </Button>
            </div>
            <div className="space-y-4">
              {sourceAnalytics.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t[language].noData}</p>
              ) : (
                sourceAnalytics.slice(0, 5).map((source) => (
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
                        <span className="font-semibold">{formatCurrency(source.totalSpendUSD || 0)}</span>
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
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{source.totalLeads || 0} {t[language].leads}</span>
                      <span>{formatCurrency(source.avgCostPerLead || 0)}/lead</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Budget Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t[language].budgetStatus}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/media-buying/budgets')}
              >
                {t[language].viewAll}
              </Button>
            </div>
            <div className="space-y-4">
              {budgetStatus.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t[language].noData}</p>
              ) : (
                budgetStatus.slice(0, 4).map((budget) => (
                  <div key={budget.budgetId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {budget.sourceName || `${budget.month || 0}/${budget.year || 0}`}
                      </span>
                      <span className={`text-sm font-semibold ${budget.isOverBudget ? 'text-red-600' : 'text-gray-700'}`}>
                        {(budget.percentageUsed || 0).toFixed(0)}% {t[language].budgetUsed}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          budget.isOverBudget ? 'bg-red-500' :
                          (budget.percentageUsed || 0) > 75 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budget.percentageUsed || 0, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatCurrency(budget.spentUSD || 0)} {t[language].spent}</span>
                      <span>
                        {budget.isOverBudget ? (
                          <span className="text-red-600">{t[language].overBudget}</span>
                        ) : (
                          `${formatCurrency(budget.remainingUSD || 0)} ${t[language].remaining}`
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t[language].recentAlerts}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/media-buying/alerts')}
            >
              {t[language].viewAll}
            </Button>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t[language].noAlerts}</p>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-2 ${getAlertTypeColor(alert.alertType)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(alert.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold uppercase">
                      {alert.alertType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}