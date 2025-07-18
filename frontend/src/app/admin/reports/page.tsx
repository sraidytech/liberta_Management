'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import ReportsHeader from '@/components/admin/reports/reports-header';
import ReportsFilters from '@/components/admin/reports/reports-filters';
import SalesReports from '@/components/admin/reports/sales-reports';
import AgentReports from '@/components/admin/reports/agent-reports';
import CommuneAnalytics from '@/components/admin/reports/commune-analytics';
import { useReports } from '@/hooks/useReports';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  RefreshCw,
  MapPin,
  UserCheck,
  CheckCircle
} from 'lucide-react';

export default function ReportsPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'sales' | 'agents' | 'geographic' | 'customers'>('sales');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);
  const [communeLoading, setCommuneLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'last30days',
    startDate: '',
    endDate: '',
    storeId: '',
    agentId: '',
    status: '',
    wilaya: '',
    minRevenue: '',
    maxRevenue: ''
  });

  const {
    salesData,
    agentData,
    agentNotesData,
    geographicData,
    communeData,
    customerData,
    loading,
    error,
    refreshData,
    exportData,
    fetchCommuneData
  } = useReports(filters);

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshData();
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshData]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleWilayaClick = async (wilaya: string) => {
    setSelectedWilaya(wilaya);
    setCommuneLoading(true);
    try {
      await fetchCommuneData(wilaya);
    } catch (error) {
      console.error('Failed to fetch commune data:', error);
    } finally {
      setCommuneLoading(false);
    }
  };

  const handleBackToWilayas = () => {
    setSelectedWilaya(null);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      await exportData(format, activeTab);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading && !salesData && !agentData && !geographicData && !customerData) {
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
                {language === 'fr' ? 'Chargement des rapports' : 'Loading Reports'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Génération des analyses en cours...' : 'Generating analytics...'}
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
              {language === 'fr' ? 'Erreur de chargement' : 'Loading Error'}
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

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <ReportsHeader 
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={setAutoRefresh}
          onRefresh={refreshData}
          onExport={handleExport}
          loading={loading}
        />

        {/* Filters */}
        <ReportsFilters 
          filters={filters}
          onFiltersChange={handleFilterChange}
        />

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('sales')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sales'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>{language === 'fr' ? 'Rapports de Ventes' : 'Sales Reports'}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'agents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>{language === 'fr' ? 'Performance des Agents' : 'Agent Performance'}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('geographic')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'geographic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>{language === 'fr' ? 'Analyse Géographique' : 'Geographic Analytics'}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>{language === 'fr' ? 'Analyse Clients' : 'Customer Analytics'}</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'sales' && (
              <SalesReports 
                data={salesData}
                loading={loading}
                filters={filters}
              />
            )}
            {activeTab === 'agents' && (
              <AgentReports
                data={agentData}
                agentNotesData={agentNotesData}
                loading={loading}
                filters={filters}
              />
            )}
            {activeTab === 'geographic' && (
              <div className="space-y-6">
                {selectedWilaya ? (
                  <CommuneAnalytics
                    data={communeData}
                    loading={communeLoading}
                    onBack={handleBackToWilayas}
                  />
                ) : (
                  <>
                    {/* Summary Cards */}
                    {geographicData?.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">
                              {language === 'fr' ? 'Chiffre d\'Affaires Total' : 'Total Revenue'}
                            </h4>
                            <DollarSign className="w-8 h-8 text-green-600" />
                          </div>
                          <div className="text-3xl font-bold text-green-600">
                            {geographicData.summary.totalRevenue.toLocaleString()} DA
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {language === 'fr' ? 'Commandes livrées uniquement' : 'Delivered orders only'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">
                              {language === 'fr' ? 'Ventes Totales' : 'Total Sales'}
                            </h4>
                            <CheckCircle className="w-8 h-8 text-blue-600" />
                          </div>
                          <div className="text-3xl font-bold text-blue-600">
                            {geographicData.summary.totalDeliveredOrders}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {language === 'fr' ? 'Commandes livrées' : 'Delivered orders'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">
                              {language === 'fr' ? 'Valeur Moyenne' : 'Average Order Value'}
                            </h4>
                            <TrendingUp className="w-8 h-8 text-purple-600" />
                          </div>
                          <div className="text-3xl font-bold text-purple-600">
                            {geographicData.summary.averageOrderValue.toLocaleString()} DA
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {language === 'fr' ? 'Par commande' : 'Per order'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">
                              {language === 'fr' ? 'Wilayas Actives' : 'Active Wilayas'}
                            </h4>
                            <MapPin className="w-8 h-8 text-orange-600" />
                          </div>
                          <div className="text-3xl font-bold text-orange-600">
                            {geographicData.summary.totalWilayas}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {language === 'fr' ? 'Régions couvertes' : 'Regions covered'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-center py-12">
                      <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {language === 'fr' ? 'Analyse Géographique' : 'Geographic Analytics'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {language === 'fr' ? 'Cliquez sur une wilaya pour voir les communes' : 'Click on a wilaya to see communes'}
                      </p>
                      {geographicData && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {geographicData.ordersByWilaya?.map((item) => (
                            <button
                              key={item.wilaya}
                              onClick={() => handleWilayaClick(item.wilaya)}
                              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                  {item.wilaya}
                                </h4>
                                <span className="text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                                  {item.orders}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                                {language === 'fr' ? 'Commandes' : 'Orders'}
                              </div>
                              <div className="text-sm text-blue-600 font-medium mt-2 group-hover:text-blue-700 transition-colors">
                                {item.revenue.toLocaleString()} DA
                              </div>
                              <div className="text-xs text-gray-500 mt-2 group-hover:text-blue-600 transition-colors">
                                {language === 'fr' ? 'Cliquer pour voir les communes' : 'Click to view communes'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'customers' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                {customerData?.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          {language === 'fr' ? 'Chiffre d\'Affaires Total' : 'Total Revenue'}
                        </h4>
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        {customerData.summary.totalRevenue.toLocaleString()} DA
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {language === 'fr' ? 'Commandes livrées uniquement' : 'Delivered orders only'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          {language === 'fr' ? 'Ventes Totales' : 'Total Sales'}
                        </h4>
                        <CheckCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-blue-600">
                        {customerData.summary.totalDeliveredOrders}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {language === 'fr' ? 'Commandes livrées' : 'Delivered orders'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          {language === 'fr' ? 'Valeur Moyenne' : 'Average Order Value'}
                        </h4>
                        <TrendingUp className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="text-3xl font-bold text-purple-600">
                        {customerData.summary.averageOrderValue.toLocaleString()} DA
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {language === 'fr' ? 'Par commande' : 'Per order'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          {language === 'fr' ? 'Clients Actifs' : 'Active Customers'}
                        </h4>
                        <Users className="w-8 h-8 text-orange-600" />
                      </div>
                      <div className="text-3xl font-bold text-orange-600">
                        {customerData.summary.totalCustomers}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {language === 'fr' ? 'Dans la période' : 'In period'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center py-12">
                  <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {language === 'fr' ? 'Analyse Clients' : 'Customer Analytics'}
                  </h3>
                  <p className="text-gray-600">
                    {language === 'fr' ? 'Métriques de rétention et comportement client' : 'Customer retention and behavior metrics'}
                  </p>
                  {customerData && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">
                            {language === 'fr' ? 'Clients Actifs' : 'Active Customers'}
                          </h4>
                          <Users className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="text-3xl font-bold text-green-600">
                          {customerData.summary?.totalCustomers || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">
                            {language === 'fr' ? 'Nouveaux Clients' : 'New Customers'}
                          </h4>
                          <UserCheck className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="text-3xl font-bold text-purple-600">
                          {customerData.summary?.newCustomers || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">
                            {language === 'fr' ? 'Clients Récurrents' : 'Returning Customers'}
                          </h4>
                          <TrendingUp className="w-8 h-8 text-orange-600" />
                        </div>
                        <div className="text-3xl font-bold text-orange-600">
                          {customerData.summary?.returningCustomers || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">
                            {language === 'fr' ? 'Taux de Rétention' : 'Retention Rate'}
                          </h4>
                          <BarChart3 className="w-8 h-8 text-cyan-600" />
                        </div>
                        <div className="text-3xl font-bold text-cyan-600">
                          {customerData.summary?.retentionRate ? `${customerData.summary.retentionRate.toFixed(1)}%` : '0%'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}