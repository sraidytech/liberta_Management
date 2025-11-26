'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { Package, DollarSign, AlertTriangle, XCircle, Plus, TrendingUp, TrendingDown } from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Stock Management',
    totalProducts: 'Total Products',
    totalValue: 'Total Value',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    recentMovements: 'Recent Movements',
    activeAlerts: 'Active Alerts',
    quickActions: 'Quick Actions',
    receiveLot: 'Receive Lot',
    adjustStock: 'Adjust Stock',
    viewAll: 'View All',
    loading: 'Loading...',
    error: 'Error loading data',
    noMovements: 'No recent movements',
    noAlerts: 'No active alerts',
    in: 'IN',
    out: 'OUT',
    adjustment: 'ADJ',
    transfer: 'TRANSFER',
    units: 'units',
    ago: 'ago',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    products: 'Products',
    lots: 'Lots',
    movements: 'Movements',
    alerts: 'Alerts',
    reports: 'Reports',
  },
  fr: {
    title: 'Gestion de Stock',
    totalProducts: 'Total Produits',
    totalValue: 'Valeur Totale',
    lowStock: 'Stock Faible',
    outOfStock: 'Rupture de Stock',
    recentMovements: 'Mouvements Récents',
    activeAlerts: 'Alertes Actives',
    quickActions: 'Actions Rapides',
    receiveLot: 'Recevoir Lot',
    adjustStock: 'Ajuster Stock',
    viewAll: 'Voir Tout',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noMovements: 'Aucun mouvement récent',
    noAlerts: 'Aucune alerte active',
    in: 'ENTRÉE',
    out: 'SORTIE',
    adjustment: 'AJUST',
    transfer: 'TRANSFERT',
    units: 'unités',
    ago: 'il y a',
    critical: 'Critique',
    warning: 'Avertissement',
    info: 'Info',
    products: 'Produits',
    lots: 'Lots',
    movements: 'Mouvements',
    alerts: 'Alertes',
    reports: 'Rapports',
  },
};

interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentMovements: Array<{
    id: string;
    type: string;
    quantity: number;
    product: { name: string };
    createdAt: string;
  }>;
  activeAlerts: Array<{
    id: string;
    severity: string;
    message: string;
    product: { name: string };
    currentQuantity: number;
  }>;
}

export default function StockDashboard() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadDashboardStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      setError(null);
      const data = await stockService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ${t[language].ago}`;
    if (diffHours < 24) return `${diffHours}h ${t[language].ago}`;
    return `${diffDays}d ${t[language].ago}`;
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'OUT': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Package className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-50 border-red-200 text-red-800';
      case 'WARNING': return 'bg-amber-50 border-amber-200 text-amber-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Choose layout based on user role
  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t[language].loading}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">{error || t[language].error}</p>
            <Button onClick={loadDashboardStats} className="mt-4">
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
              onClick={() => router.push('/admin/stock/lots')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t[language].receiveLot}
            </Button>
            <Button
              onClick={() => router.push('/admin/stock/movements')}
              variant="outline"
            >
              {t[language].adjustStock}
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Products */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/stock/products')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t[language].totalProducts}</p>
                <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
              </div>
              <div className="p-4 rounded-full bg-blue-50">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Total Value */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t[language].totalValue}</p>
                <p className="text-3xl font-bold mt-2">
                  ${(stats.totalValue || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-full bg-green-50">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>

          {/* Low Stock */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/stock/alerts')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t[language].lowStock}</p>
                <p className="text-3xl font-bold mt-2">{stats.lowStockCount}</p>
              </div>
              <div className="p-4 rounded-full bg-amber-50">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </Card>

          {/* Out of Stock */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/stock/alerts')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t[language].outOfStock}</p>
                <p className="text-3xl font-bold mt-2">{stats.outOfStockCount}</p>
              </div>
              <div className="p-4 rounded-full bg-red-50">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/stock/products')}
          >
            <Package className="w-6 h-6 mb-2" />
            {t[language].products}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/stock/lots')}
          >
            <Package className="w-6 h-6 mb-2" />
            {t[language].lots}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/stock/movements')}
          >
            <TrendingUp className="w-6 h-6 mb-2" />
            {t[language].movements}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/stock/alerts')}
          >
            <AlertTriangle className="w-6 h-6 mb-2" />
            {t[language].alerts}
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center"
            onClick={() => router.push('/admin/stock/reports')}
          >
            <DollarSign className="w-6 h-6 mb-2" />
            {t[language].reports}
          </Button>
        </div>

        {/* Recent Movements & Active Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Movements */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t[language].recentMovements}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/stock/movements')}
              >
                {t[language].viewAll}
              </Button>
            </div>
            <div className="space-y-3">
              {!stats.recentMovements || stats.recentMovements.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t[language].noMovements}</p>
              ) : (
                stats.recentMovements.slice(0, 5).map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getMovementIcon(movement.type)}
                      <div>
                        <p className="font-medium text-sm">{movement.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {movement.type === 'IN' ? '+' : '-'}{movement.quantity} {t[language].units}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(movement.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Active Alerts */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t[language].activeAlerts}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/stock/alerts')}
              >
                {t[language].viewAll}
              </Button>
            </div>
            <div className="space-y-3">
              {!stats.activeAlerts || stats.activeAlerts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t[language].noAlerts}</p>
              ) : (
                stats.activeAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{alert.product.name}</p>
                        <p className="text-xs mt-1">{alert.message}</p>
                        <p className="text-xs mt-1">
                          {alert.currentQuantity} {t[language].units}
                        </p>
                      </div>
                      <span className="text-xs font-semibold">
                        {t[language][alert.severity.toLowerCase() as keyof typeof t.en]}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}