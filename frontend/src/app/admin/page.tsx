'use client';

import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import DashboardChart from '@/components/admin/dashboard-chart';
import { useAnalytics } from '@/hooks/useAnalytics';
import Link from 'next/link';
import { 
  Users, 
  ShoppingCart, 
  Store, 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity,
  RefreshCw,
  Eye,
  ArrowUpRight,
  Zap,
  Target,
  Globe,
  Calendar,
  Plus,
  Settings,
  Download,
  Filter
} from 'lucide-react';
import { useState } from 'react';

export default function AdminDashboard() {
  const { language } = useLanguage();
  const { dashboardStats, orderTrends, loading, error, refreshData, fetchOrderTrends } = useAnalytics();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    fetchOrderTrends(period);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-amber-50 text-amber-700 border-amber-200',
      'CONFIRMED': 'bg-blue-50 text-blue-700 border-blue-200',
      'PROCESSING': 'bg-purple-50 text-purple-700 border-purple-200',
      'SHIPPED': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'DELIVERED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'CANCELLED': 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Get availability color
  const getAvailabilityColor = (availability: string) => {
    const colors = {
      'ONLINE': 'bg-emerald-500',
      'BUSY': 'bg-amber-500',
      'OFFLINE': 'bg-gray-400',
    };
    return colors[availability as keyof typeof colors] || 'bg-gray-400';
  };

  if (loading && !dashboardStats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {language === 'fr' ? 'Chargement du tableau de bord' : 'Loading Dashboard'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Récupération des données en temps réel...' : 'Fetching real-time data...'}
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {language === 'fr' ? 'Erreur de connexion' : 'Connection Error'}
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={refreshData}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              {language === 'fr' ? 'Réessayer' : 'Retry'}
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!dashboardStats) return null;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-2">
              {language === 'fr' ? 'Tableau de Bord' : 'Dashboard'}
            </h1>
            <p className="text-lg text-gray-600">
              {language === 'fr' ? 'Vue d\'ensemble de votre système de gestion des commandes' : 'Overview of your order management system'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-medium text-gray-700">
                {language === 'fr' ? 'Actualiser' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Orders */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <ShoppingCart className="w-5 h-5 opacity-80" />
                  <p className="text-blue-100 font-medium">
                    {language === 'fr' ? 'Commandes Totales' : 'Total Orders'}
                  </p>
                </div>
                <p className="text-3xl font-bold mb-2">
                  {formatNumber(dashboardStats.overview.totalOrders)}
                </p>
                <div className="flex items-center">
                  {dashboardStats.overview.orderGrowth.startsWith('+') ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span className="text-sm font-medium">
                    {dashboardStats.overview.orderGrowth} {language === 'fr' ? 'ce mois' : 'this month'}
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="w-8 h-8" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          </div>

          {/* Revenue */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 opacity-80" />
                  <p className="text-emerald-100 font-medium">
                    {language === 'fr' ? 'Revenus' : 'Revenue'}
                  </p>
                </div>
                <p className="text-3xl font-bold mb-2">
                  {formatCurrency(dashboardStats.overview.monthRevenue)}
                </p>
                <div className="flex items-center">
                  {dashboardStats.overview.revenueGrowth.startsWith('+') ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span className="text-sm font-medium">
                    {dashboardStats.overview.revenueGrowth} {language === 'fr' ? 'ce mois' : 'this month'}
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          </div>

          {/* Active Agents */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 opacity-80" />
                  <p className="text-purple-100 font-medium">
                    {language === 'fr' ? 'Agents Actifs' : 'Active Agents'}
                  </p>
                </div>
                <p className="text-3xl font-bold mb-2">
                  {dashboardStats.overview.activeAgents}/{dashboardStats.overview.totalAgents}
                </p>
                <div className="flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {dashboardStats.overview.agentUtilization}% {language === 'fr' ? 'utilisation' : 'utilization'}
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          </div>

          {/* Today's Performance */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-5 h-5 opacity-80" />
                  <p className="text-orange-100 font-medium">
                    {language === 'fr' ? 'Aujourd\'hui' : 'Today'}
                  </p>
                </div>
                <p className="text-3xl font-bold mb-2">
                  {dashboardStats.overview.todayOrders}
                </p>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {dashboardStats.overview.weekOrders} {language === 'fr' ? 'cette semaine' : 'this week'}
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <DashboardChart 
            data={orderTrends} 
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Status Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {language === 'fr' ? 'Distribution des Statuts' : 'Order Status Distribution'}
                </h2>
                <p className="text-gray-600">
                  {language === 'fr' ? 'Répartition des commandes par statut' : 'Breakdown of orders by status'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {dashboardStats.ordersByStatus.map((status, index) => (
                <div key={status.status} className="text-center p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(status.status)} mb-4`}>
                    {status.status.toLowerCase().replace('_', ' ')}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(status.count)}</p>
                  <p className="text-sm text-gray-600">
                    {((status.count / dashboardStats.overview.totalOrders) * 100).toFixed(1)}% {language === 'fr' ? 'du total' : 'of total'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Store Performance */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {language === 'fr' ? 'Performance Magasins' : 'Store Performance'}
                </h2>
                <p className="text-gray-600">
                  {language === 'fr' ? 'Activité par magasin' : 'Activity by store'}
                </p>
              </div>
              <Store className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-4">
              {dashboardStats.stores.slice(0, 5).map((store) => (
                <div key={store.identifier} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${store.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-bold text-gray-900">{store.identifier}</p>
                      <p className="text-sm text-gray-600">{formatNumber(store.orders)} {language === 'fr' ? 'commandes' : 'orders'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(store.revenue)}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Globe className="w-3 h-3 mr-1" />
                      {store.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders & Top Agents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {language === 'fr' ? 'Commandes Récentes' : 'Recent Orders'}
                </h2>
                <p className="text-gray-600">
                  {language === 'fr' ? 'Dernières commandes reçues' : 'Latest received orders'}
                </p>
              </div>
              <Link href="/admin/orders" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                <Eye className="w-5 h-5" />
                <span className="font-medium">
                  {language === 'fr' ? 'Voir tout' : 'View all'}
                </span>
              </Link>
            </div>
            <div className="space-y-4">
              {dashboardStats.recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{order.reference}</p>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                      {order.status.toLowerCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Agents */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {language === 'fr' ? 'Top Agents' : 'Top Agents'}
                </h2>
                <p className="text-gray-600">
                  {language === 'fr' ? 'Agents les plus performants' : 'Best performing agents'}
                </p>
              </div>
              <Link href="/admin/users" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                <Target className="w-5 h-5" />
                <span className="font-medium">
                  {language === 'fr' ? 'Gérer' : 'Manage'}
                </span>
              </Link>
            </div>
            <div className="space-y-4">
              {dashboardStats.topAgents.slice(0, 5).map((agent, index) => (
                <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{agent.name?.[0] || 'A'}</span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getAvailabilityColor(agent.availability)} rounded-full border-2 border-white`}></div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-600">{agent.monthlyOrders} {language === 'fr' ? 'commandes ce mois' : 'orders this month'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{agent.utilization}%</p>
                    <p className="text-sm text-gray-600">{agent.currentOrders}/{agent.maxOrders}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded-2xl p-8 border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <Link href="/admin/users" className="group flex items-center space-x-4 p-6 bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-100">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{language === 'fr' ? 'Gérer Agents' : 'Manage Agents'}</p>
                <p className="text-sm text-gray-600">{language === 'fr' ? 'Voir tous les agents' : 'View all agents'}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </Link>

            <Link href="/admin/orders" className="group flex items-center space-x-4 p-6 bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-100">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{language === 'fr' ? 'Voir Commandes' : 'View Orders'}</p>
                <p className="text-sm text-gray-600">{language === 'fr' ? 'Toutes les commandes' : 'All orders'}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
            </Link>

            <Link href="/admin/stores" className="group flex items-center space-x-4 p-6 bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-100">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{language === 'fr' ? 'Config Magasins' : 'Store Config'}</p>
                <p className="text-sm text-gray-600">{language === 'fr' ? 'Paramètres magasins' : 'Store settings'}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </Link>

            <Link href="/admin/assignments" className="group flex items-center space-x-4 p-6 bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-100">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{language === 'fr' ? 'Assignations' : 'Assignments'}</p>
                <p className="text-sm text-gray-600">{language === 'fr' ? 'Gestion des assignations' : 'Manage assignments'}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </Link>

            <Link href="/admin/reports" className="group flex items-center space-x-4 p-6 bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-100">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{language === 'fr' ? 'Rapports Avancés' : 'Advanced Reports'}</p>
                <p className="text-sm text-gray-600">{language === 'fr' ? 'Analytics détaillées' : 'Detailed analytics'}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}