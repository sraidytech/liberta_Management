'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import ReportsHeader from '@/components/admin/reports/reports-header';
import ReportsFilters from '@/components/admin/reports/reports-filters';
import SalesReports from '@/components/admin/reports/sales-reports';
import AgentReports from '@/components/admin/reports/agent-reports';
import CommuneAnalytics from '@/components/admin/reports/commune-analytics';
import CustomerAnalysis from '@/components/admin/reports/customer-analysis';
import SatisfactionReports from '@/components/admin/reports/satisfaction-reports';
import TicketReports from '@/components/admin/reports/ticket-reports';
import { useReportsLazy } from '@/hooks/useReportsLazy';
import { useSatisfactionAnalytics } from '@/hooks/useSatisfactionAnalytics';
import { useTicketAnalytics } from '@/hooks/useTicketAnalytics';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  RefreshCw,
  MapPin,
  UserCheck,
  CheckCircle,
  Info,
  XCircle,
  Truck,
  Star,
  MessageSquare
} from 'lucide-react';

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white border-2 border-gray-200 text-gray-800 text-sm leading-relaxed rounded-lg px-4 py-3 max-w-[400px] shadow-2xl">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="break-words">
                  {content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'sales' | 'agents' | 'geographic' | 'customers' | 'satisfaction' | 'tickets'>('sales');
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
  } = useReportsLazy(filters, activeTab);

  // Satisfaction and Ticket analytics hooks
  const satisfactionAnalytics = useSatisfactionAnalytics(filters);
  const ticketAnalytics = useTicketAnalytics(filters);

  // Auto-refresh functionality with Page Visibility API
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDataRef = useRef(refreshData);
  
  // Keep refreshData ref updated
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);
  
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (!autoRefresh) return;
    
    // Set up auto-refresh with Page Visibility API
    const startInterval = () => {
      refreshIntervalRef.current = setInterval(() => {
        // Only refresh if page is visible
        if (!document.hidden) {
          refreshDataRef.current();
        }
      }, 5 * 60 * 1000); // 5 minutes
    };
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear interval
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      } else {
        // Page is visible, restart interval if autoRefresh is on
        if (autoRefresh && !refreshIntervalRef.current) {
          startInterval();
        }
      }
    };
    
    // Start interval if page is visible
    if (!document.hidden) {
      startInterval();
    }
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh]);

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
              <button
                onClick={() => setActiveTab('satisfaction')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'satisfaction'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>{language === 'fr' ? 'Satisfaction Client' : 'Customer Satisfaction'}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>{language === 'fr' ? 'Système de Tickets' : 'Ticket System'}</span>
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

                    <div className="space-y-8">
                      {/* Geographic Analytics Header */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <MapPin className="w-8 h-8 text-gray-400" />
                          <h3 className="text-xl font-semibold text-gray-900">
                            {language === 'fr' ? 'Analyse Géographique' : 'Geographic Analytics'}
                          </h3>
                          <Tooltip content={language === 'fr' ?
                            'Analyse détaillée des performances par wilaya incluant commandes totales, livrées, annulées et taux de livraison' :
                            'Detailed performance analysis by wilaya including total orders, delivered, cancelled and delivery rate'}>
                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                          </Tooltip>
                        </div>
                        <p className="text-gray-600">
                          {language === 'fr' ? 'Cliquez sur une wilaya pour voir les communes' : 'Click on a wilaya to see communes'}
                        </p>
                      </div>

                      {/* Geographic Summary Cards */}
                      {geographicData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                          {/* Total Orders */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <MapPin className="w-5 h-5 text-blue-600" />
                                  <p className="text-blue-700 font-medium text-sm">
                                    {language === 'fr' ? 'Total Commandes' : 'Total Orders'}
                                  </p>
                                  <Tooltip content={language === 'fr' ?
                                    'Nombre total de commandes dans toutes les wilayas pour la période sélectionnée' :
                                    'Total number of orders across all wilayas for the selected period'}>
                                    <Info className="w-4 h-4 text-blue-500 cursor-help" />
                                  </Tooltip>
                                </div>
                                <p className="text-2xl font-bold text-blue-600 mb-1">
                                  {geographicData.summary.totalOrders?.toLocaleString() || 0}
                                </p>
                                <p className="text-sm text-blue-600">
                                  {language === 'fr' ? 'toutes wilayas' : 'all wilayas'}
                                </p>
                              </div>
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-blue-600" />
                              </div>
                            </div>
                          </div>

                          {/* Delivered Orders */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <p className="text-green-700 font-medium text-sm">
                                    {language === 'fr' ? 'Commandes Livrées' : 'Orders Delivered'}
                                  </p>
                                  <Tooltip content={language === 'fr' ?
                                    'Nombre de commandes livrées avec succès (statut LIVRÉ) dans toutes les wilayas' :
                                    'Number of successfully delivered orders (LIVRÉ status) across all wilayas'}>
                                    <Info className="w-4 h-4 text-green-500 cursor-help" />
                                  </Tooltip>
                                </div>
                                <p className="text-2xl font-bold text-green-600 mb-1">
                                  {geographicData.summary.totalDeliveredOrders?.toLocaleString() || 0}
                                </p>
                                <p className="text-sm text-green-600">
                                  {language === 'fr' ? 'livrées avec succès' : 'successfully delivered'}
                                </p>
                              </div>
                              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              </div>
                            </div>
                          </div>

                          {/* Delivery Rate */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Truck className="w-5 h-5 text-purple-600" />
                                  <p className="text-purple-700 font-medium text-sm">
                                    {language === 'fr' ? 'Taux de Livraison' : 'Delivery Rate'}
                                  </p>
                                  <Tooltip content={language === 'fr' ?
                                    'Pourcentage global de commandes livrées par rapport au total des commandes' :
                                    'Overall percentage of delivered orders compared to total orders'}>
                                    <Info className="w-4 h-4 text-purple-500 cursor-help" />
                                  </Tooltip>
                                </div>
                                <p className="text-2xl font-bold text-purple-600 mb-1">
                                  {geographicData.summary.deliveryRate?.toFixed(1) || 0}%
                                </p>
                                <p className="text-sm text-purple-600">
                                  {language === 'fr' ? 'taux global' : 'overall rate'}
                                </p>
                              </div>
                              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Truck className="w-6 h-6 text-purple-600" />
                              </div>
                            </div>
                          </div>

                          {/* Cancelled Orders */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-100">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <XCircle className="w-5 h-5 text-red-600" />
                                  <p className="text-red-700 font-medium text-sm">
                                    {language === 'fr' ? 'Commandes Annulées' : 'Orders Cancelled'}
                                  </p>
                                  <Tooltip content={language === 'fr' ?
                                    'Nombre total de commandes annulées dans toutes les wilayas' :
                                    'Total number of cancelled orders across all wilayas'}>
                                    <Info className="w-4 h-4 text-red-500 cursor-help" />
                                  </Tooltip>
                                </div>
                                <p className="text-2xl font-bold text-red-600 mb-1">
                                  {geographicData.summary.totalCancelledOrders?.toLocaleString() || 0}
                                </p>
                                <p className="text-sm text-red-600">
                                  {language === 'fr' ? 'commandes annulées' : 'cancelled orders'}
                                </p>
                              </div>
                              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wilaya Cards */}
                      {geographicData && (
                        <div className="space-y-6">
                          <div className="text-center">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {language === 'fr' ? 'Performance par Wilaya' : 'Performance by Wilaya'}
                            </h3>
                            <p className="text-gray-600">
                              {language === 'fr' ? 'Cliquez sur une wilaya pour voir les communes' : 'Click on a wilaya to see communes'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {geographicData.ordersByWilaya?.map((item, index) => (
                              <div
                                key={item.wilaya}
                                onClick={() => handleWilayaClick(item.wilaya)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{index + 1}</span>
                                  </div>
                                  <MapPin className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                
                                <h4 className="font-semibold text-gray-900 text-lg mb-4 group-hover:text-blue-600 transition-colors">
                                  {item.wilaya}
                                </h4>
                                
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      {language === 'fr' ? 'Total Commandes' : 'Total Orders'}
                                    </span>
                                    <span className="font-semibold text-gray-900">{item.orders}</span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      {language === 'fr' ? 'Livrées' : 'Delivered'}
                                    </span>
                                    <span className="font-semibold text-green-600">{item.completedOrders || 0}</span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      {language === 'fr' ? 'Annulées' : 'Cancelled'}
                                    </span>
                                    <span className="font-semibold text-red-600">{item.cancelledOrders || 0}</span>
                                  </div>
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      {language === 'fr' ? 'Taux Livraison' : 'Delivery Rate'}
                                    </span>
                                    <span className="font-semibold text-purple-600">{item.deliveryRate?.toFixed(1) || 0}%</span>
                                  </div>
                                  
                                  <div className="pt-3 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-gray-600">
                                        {language === 'fr' ? 'Chiffre d\'Affaires' : 'Revenue'}
                                      </span>
                                      <span className="font-bold text-blue-600">{item.revenue?.toLocaleString() || 0} DA</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-4 text-center">
                                  <span className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">
                                    {language === 'fr' ? 'Cliquer pour voir les communes' : 'Click to view communes'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'customers' && (
              <CustomerAnalysis
                data={customerData}
                loading={loading}
                filters={filters}
              />
            )}
            {activeTab === 'satisfaction' && (
              <SatisfactionReports
                data={satisfactionAnalytics.data}
                loading={satisfactionAnalytics.loading}
                filters={filters}
              />
            )}
            {activeTab === 'tickets' && (
              <TicketReports
                data={ticketAnalytics.data}
                loading={ticketAnalytics.loading}
                filters={filters}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}