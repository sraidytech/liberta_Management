'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/language-context';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  BarChart3,
  PieChart,
  Activity,
  Store,
  Package,
  Calendar
} from 'lucide-react';

interface SalesData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    // New Financial KPIs
    grossMargin: number;
    grossMarginPercentage: number;
    revenuePerCustomer: number;
    uniqueCustomers: number;
    repeatPurchaseRate: number;
    conversionRate: number;
    customerLifetimeValue: number;
    totalAllOrders: number;
  };
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  revenueByStore: Array<{
    store: string;
    revenue: number;
    orders: number;
  }>;
  revenueByStatus: Array<{
    status: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    product: string;
    revenue: number;
    quantity: number;
    orders: number;
  }>;
  monthlyComparison: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

interface SalesReportsProps {
  data: SalesData | null;
  loading: boolean;
  filters: any;
}

export default function SalesReports({ data, loading, filters }: SalesReportsProps) {
  const { language } = useLanguage();

  // Add safety checks for data structure
  const safeData = data ? {
    ...data,
    summary: {
      totalRevenue: data.summary?.totalRevenue || 0,
      totalOrders: data.summary?.totalOrders || 0,
      averageOrderValue: data.summary?.averageOrderValue || 0,
      grossMargin: data.summary?.grossMargin || 0,
      grossMarginPercentage: data.summary?.grossMarginPercentage || 30,
      revenuePerCustomer: data.summary?.revenuePerCustomer || 0,
      uniqueCustomers: data.summary?.uniqueCustomers || 0,
      repeatPurchaseRate: data.summary?.repeatPurchaseRate || 0,
      conversionRate: data.summary?.conversionRate || 0,
      customerLifetimeValue: data.summary?.customerLifetimeValue || 0,
      totalAllOrders: data.summary?.totalAllOrders || 0,
    }
  } : null;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-amber-500',
      'CONFIRMED': 'bg-blue-500',
      'SHIPPED': 'bg-indigo-500',
      'DELIVERED': 'bg-emerald-500',
      'CANCELLED': 'bg-red-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  // Calculate chart dimensions and data
  const chartData = useMemo(() => {
    if (!safeData) return null;

    // Daily revenue chart data - limit to last 14 days and recalculate max
    const limitedDailyData = (safeData.dailyRevenue || []).slice(-14);
    const maxRevenue = Math.max(...limitedDailyData.map(d => d.revenue));
    const dailyChartData = limitedDailyData.map(item => ({
      ...item,
      heightPercentage: maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
    }));

    // Store performance pie chart
    const totalStoreRevenue = (safeData.revenueByStore || []).reduce((sum, store) => sum + store.revenue, 0);
    const storeChartData = (safeData.revenueByStore || []).map((store, index) => {
      const percentage = totalStoreRevenue > 0 ? (store.revenue / totalStoreRevenue) * 100 : 0;
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      return {
        ...store,
        percentage,
        color: colors[index % colors.length]
      };
    });

    return { dailyChartData, storeChartData };
  }, [safeData]);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 rounded-2xl h-96 animate-pulse"></div>
      </div>
    );
  }

  if (!safeData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">
          {language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Primary Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 opacity-80" />
                <p className="text-emerald-100 font-medium">
                  {language === 'fr' ? 'Revenus Totaux' : 'Total Revenue'}
                </p>
              </div>
              <p className="text-3xl font-bold mb-2">
                {formatCurrency(safeData.summary.totalRevenue)}
              </p>
              <p className="text-sm text-emerald-100">
                {formatNumber(safeData.summary.totalOrders)} {language === 'fr' ? 'commandes' : 'orders'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>

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
                {formatNumber(safeData.summary.totalOrders)}
              </p>
              <p className="text-sm text-blue-100">
                {language === 'fr' ? 'Période sélectionnée' : 'Selected period'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShoppingCart className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>

        {/* Average Order Value */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <p className="text-purple-100 font-medium">
                  {language === 'fr' ? 'Panier Moyen' : 'Avg Order Value'}
                </p>
              </div>
              <p className="text-3xl font-bold mb-2">
                {formatCurrency(safeData.summary.averageOrderValue)}
              </p>
              <p className="text-sm text-purple-100">
                {language === 'fr' ? 'Par commande' : 'Per order'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Financial KPIs Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {language === 'fr' ? 'Indicateurs Financiers' : 'Financial KPIs'}
            </h3>
            <p className="text-gray-600">
              {language === 'fr' ? 'Métriques financières avancées' : 'Advanced financial metrics'}
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gross Margin */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-medium text-sm">
                    {language === 'fr' ? 'Marge Brute' : 'Gross Margin'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {formatCurrency(safeData.summary.grossMargin)}
                </p>
                <p className="text-sm text-green-600">
                  {safeData.summary.grossMarginPercentage.toFixed(1)}% {language === 'fr' ? 'marge' : 'margin'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Revenue per Customer */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-700 font-medium text-sm">
                    {language === 'fr' ? 'CA/Client' : 'Revenue/Customer'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {formatCurrency(safeData.summary.revenuePerCustomer)}
                </p>
                <p className="text-sm text-blue-600">
                  {formatNumber(safeData.summary.uniqueCustomers)} {language === 'fr' ? 'clients' : 'customers'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Repeat Purchase Rate */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <p className="text-purple-700 font-medium text-sm">
                    {language === 'fr' ? 'Taux Fidélité' : 'Repeat Rate'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-purple-600 mb-1">
                  {safeData.summary.repeatPurchaseRate.toFixed(1)}%
                </p>
                <p className="text-sm text-purple-600">
                  {language === 'fr' ? 'clients fidèles' : 'loyal customers'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  <p className="text-orange-700 font-medium text-sm">
                    {language === 'fr' ? 'Taux Conversion' : 'Conversion Rate'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-orange-600 mb-1">
                  {safeData.summary.conversionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-orange-600">
                  {safeData.summary.totalOrders}/{safeData.summary.totalAllOrders} {language === 'fr' ? 'livrées' : 'delivered'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Lifetime Value */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Valeur Vie Client (CLV)' : 'Customer Lifetime Value (CLV)'}
              </h4>
              <p className="text-gray-600">
                {language === 'fr' ? 'Valeur moyenne générée par client' : 'Average value generated per customer'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-600">
                {formatCurrency(safeData.summary.customerLifetimeValue)}
              </p>
              <p className="text-sm text-indigo-600">
                {language === 'fr' ? 'par client' : 'per customer'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Revenue Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Tendance des Revenus' : 'Revenue Trend'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Évolution quotidienne' : 'Daily evolution'}
              </p>
            </div>
            <Activity className="w-8 h-8 text-gray-400" />
          </div>

          {/* Line Chart */}
          <div className="relative h-64">
            {chartData && chartData.dailyChartData.length > 0 ? (
              <div className="flex items-end justify-between h-full space-x-1">
                {chartData.dailyChartData.map((item, index) => {
                  // Calculate height in pixels for better visibility
                  const maxHeight = 240; // Leave some space for labels
                  const minHeight = 20; // Minimum visible height
                  const heightPx = item.heightPercentage > 0
                    ? Math.max(minHeight, (item.heightPercentage / 100) * maxHeight)
                    : minHeight;
                  
                  return (
                    <div key={index} className="flex flex-col items-center group flex-1">
                      <div className="relative w-full">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                          style={{
                            height: `${heightPx}px`,
                            minHeight: '20px'
                          }}
                        >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                            <div className="font-bold">{new Date(item.date).toLocaleDateString()}</div>
                            <div>{formatCurrency(item.revenue)}</div>
                            <div>{item.orders} {language === 'fr' ? 'commandes' : 'orders'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Calendar className="w-12 h-12 mb-2" />
              </div>
            )}
          </div>
        </div>

        {/* Revenue by Store */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Revenus par Magasin' : 'Revenue by Store'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Répartition des ventes' : 'Sales distribution'}
              </p>
            </div>
            <Store className="w-8 h-8 text-gray-400" />
          </div>

          {/* Donut Chart */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {chartData && chartData.storeChartData.map((store, index) => {
                  const radius = 35;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDasharray = `${(store.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -chartData.storeChartData
                    .slice(0, index)
                    .reduce((acc, s) => acc + (s.percentage / 100) * circumference, 0);

                  return (
                    <circle
                      key={store.store}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={store.color}
                      strokeWidth="8"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 hover:stroke-width-10"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {(safeData.revenueByStore || []).length}
                  </div>
                  <div className="text-sm text-gray-600">
                    {language === 'fr' ? 'Magasins' : 'Stores'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {chartData && chartData.storeChartData.map((store) => (
              <div key={store.store} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: store.color }}
                  ></div>
                  <span className="font-medium text-gray-900">{store.store}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {formatCurrency(store.revenue)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {store.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue by Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Revenus par Statut' : 'Revenue by Status'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Performance par statut' : 'Performance by status'}
              </p>
            </div>
            <PieChart className="w-8 h-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            {(safeData.revenueByStatus || []).map((status) => {
              // Calculate percentage based on total revenue from all statuses
              const totalStatusRevenue = (safeData.revenueByStatus || []).reduce((sum, s) => sum + s.revenue, 0);
              const percentage = totalStatusRevenue > 0
                ? (status.revenue / totalStatusRevenue) * 100
                : 0;
              // Cap percentage at 100% to prevent overflow
              const cappedPercentage = Math.min(percentage, 100);
              
              return (
                <div key={status.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                      <span className="font-medium text-gray-900 capitalize">
                        {status.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(status.revenue)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {cappedPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStatusColor(status.status)}`}
                      style={{ width: `${cappedPercentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Top Produits' : 'Top Products'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Meilleurs vendeurs' : 'Best sellers'}
              </p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            {(safeData.topProducts || []).slice(0, 5).map((product, index) => (
              <div key={product.product} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.product}</p>
                  <p className="text-sm text-gray-600">
                    {product.quantity} {language === 'fr' ? 'vendus' : 'sold'} • {product.orders} {language === 'fr' ? 'commandes' : 'orders'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {language === 'fr' ? 'Comparaison Mensuelle' : 'Monthly Comparison'}
            </h3>
            <p className="text-gray-600">
              {language === 'fr' ? 'Performance sur l\'année' : 'Year performance'}
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(safeData.monthlyComparison || []).filter(m => m.revenue > 0).slice(-6).map((month) => (
            <div key={month.month} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all">
              <div className="text-sm font-medium text-gray-600 mb-2">
                {month.month.slice(0, 3)}
              </div>
              <div className="text-lg font-bold text-gray-900 mb-1">
                {formatCurrency(month.revenue)}
              </div>
              <div className="text-xs text-gray-500">
                {month.orders} {language === 'fr' ? 'cmd' : 'orders'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}