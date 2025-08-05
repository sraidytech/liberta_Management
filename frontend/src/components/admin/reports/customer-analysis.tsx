'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import {
  Users,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  UserCheck,
  BarChart3
} from 'lucide-react';

interface DetailedCustomer {
  id: string;
  fullName: string;
  telephone: string;
  email?: string;
  wilaya: string;
  commune: string;
  address?: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  orderFrequency: string;
  preferredProducts: string[];
  customerLifetimeValue: number;
  orderHistory: OrderHistoryItem[];
}

interface OrderHistoryItem {
  orderId: string;
  orderDate: Date;
  status: string;
  total: number;
  storeIdentifier: string;
  products: string[];
}

interface CustomerListData {
  customers: DetailedCustomer[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface CustomerAnalysisProps {
  data: {
    summary: {
      totalCustomers: number;
      averageOrdersPerCustomer: number;
      retentionRate: number;
      newCustomers: number;
      returningCustomers: number;
      totalRevenue: number;
      totalDeliveredOrders: number;
      averageOrderValue: number;
    };
    topCustomers: Array<{
      id: string;
      name: string;
      phone: string;
      location: string;
      totalOrders: number;
      totalRevenue: number;
    }>;
    customerRetention: {
      oneTimeCustomers: number;
      repeatCustomers: number;
      retentionRate: number;
    };
    newVsReturning: {
      newCustomers: number;
      returningCustomers: number;
      total: number;
    };
  } | null;
  loading: boolean;
  filters: any;
}

export default function CustomerAnalysis({ data, loading, filters }: CustomerAnalysisProps) {
  const { language } = useLanguage();
  const [activeCustomers, setActiveCustomers] = useState<CustomerListData | null>(null);
  const [returningCustomers, setReturningCustomers] = useState<CustomerListData | null>(null);
  const [activeCustomersLoading, setActiveCustomersLoading] = useState(false);
  const [returningCustomersLoading, setReturningCustomersLoading] = useState(false);
  const [activeCustomersPage, setActiveCustomersPage] = useState(1);
  const [returningCustomersPage, setReturningCustomersPage] = useState(1);
  const [activeCustomersSearch, setActiveCustomersSearch] = useState('');
  const [returningCustomersSearch, setReturningCustomersSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<DetailedCustomer | null>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  // Convert date range to actual dates
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'custom':
        if (filters.startDate && filters.endDate) {
          startDate = new Date(filters.startDate);
          endDate = new Date(filters.endDate);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Fetch active customers list
  const fetchActiveCustomers = async (page = 1, search = '') => {
    setActiveCustomersLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search,
        startDate,
        endDate,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.wilaya && { wilaya: filters.wilaya }),
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/customers/active?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.success) {
        setActiveCustomers(result.data);
      }
    } catch (error) {
      console.error('Error fetching active customers:', error);
    } finally {
      setActiveCustomersLoading(false);
    }
  };

  // Fetch returning customers list
  const fetchReturningCustomers = async (page = 1, search = '') => {
    setReturningCustomersLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search,
        startDate,
        endDate,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.wilaya && { wilaya: filters.wilaya }),
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/customers/returning?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.success) {
        setReturningCustomers(result.data);
      }
    } catch (error) {
      console.error('Error fetching returning customers:', error);
    } finally {
      setReturningCustomersLoading(false);
    }
  };

  // Export customer data
  const exportCustomerData = async (type: 'active' | 'returning', format: 'excel' | 'csv') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        type,
        format,
        startDate,
        endDate,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.wilaya && { wilaya: filters.wilaya }),
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/customers/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_customers_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // For Excel, we'll handle it as JSON and create Excel on frontend
        const result = await response.json();
        if (result.success) {
          // Here you would integrate with a library like xlsx to create Excel file
          console.log('Excel export data:', result.data);
          alert(language === 'fr' ? 'Export Excel en cours de développement' : 'Excel export in development');
        }
      }
    } catch (error) {
      console.error('Error exporting customer data:', error);
      alert(language === 'fr' ? 'Erreur lors de l\'export' : 'Export error');
    }
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchActiveCustomers(1, '');
    fetchReturningCustomers(1, '');
  }, [filters]);

  // Handle active customers pagination
  const handleActiveCustomersPageChange = (page: number) => {
    setActiveCustomersPage(page);
    fetchActiveCustomers(page, activeCustomersSearch);
  };

  // Handle returning customers pagination
  const handleReturningCustomersPageChange = (page: number) => {
    setReturningCustomersPage(page);
    fetchReturningCustomers(page, returningCustomersSearch);
  };

  // Handle active customers search
  const handleActiveCustomersSearch = (search: string) => {
    setActiveCustomersSearch(search);
    setActiveCustomersPage(1);
    fetchActiveCustomers(1, search);
  };

  // Handle returning customers search
  const handleReturningCustomersSearch = (search: string) => {
    setReturningCustomersSearch(search);
    setReturningCustomersPage(1);
    fetchReturningCustomers(1, search);
  };

  // Show order history modal
  const showCustomerOrderHistory = (customer: DetailedCustomer) => {
    setSelectedCustomer(customer);
    setShowOrderHistory(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          <p className="text-gray-600">
            {language === 'fr' ? 'Chargement des analyses clients...' : 'Loading customer analytics...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                {language === 'fr' ? 'Chiffre d\'Affaires Total' : 'Total Revenue'}
              </h4>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">
              {data.summary.totalRevenue.toLocaleString()} DA
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {language === 'fr' ? 'Commandes livrées uniquement' : 'Delivered orders only'}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                {language === 'fr' ? 'Clients Actifs' : 'Active Customers'}
              </h4>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {data.summary.totalCustomers}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {language === 'fr' ? 'Dans la période' : 'In period'}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                {language === 'fr' ? 'Nouveaux Clients' : 'New Customers'}
              </h4>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {data.summary.newCustomers}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {language === 'fr' ? 'Première commande' : 'First order'}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                {language === 'fr' ? 'Clients Fidèles' : 'Returning Customers'}
              </h4>
              <Package className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {data.summary.returningCustomers}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {language === 'fr' ? 'Commandes multiples' : 'Multiple orders'}
            </div>
          </div>
        </div>
      )}

      {/* Customer Analytics and Retention Rate Section */}
      <div className="text-center py-12">
        <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {language === 'fr' ? 'Analyse Clients' : 'Customer Analytics'}
        </h3>
        <p className="text-gray-600">
          {language === 'fr' ? 'Métriques de rétention et comportement client' : 'Customer retention and behavior metrics'}
        </p>
        {data && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  {language === 'fr' ? 'Clients Actifs' : 'Active Customers'}
                </h4>
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                {data.summary?.totalCustomers || 0}
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
                {data.summary?.newCustomers || 0}
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
                {data.summary?.returningCustomers || 0}
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
                {data.summary?.retentionRate ? `${data.summary.retentionRate.toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Customers Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                {language === 'fr' ? 'Clients Actifs' : 'Active Customers'}
                {activeCustomers && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({activeCustomers.pagination.totalCount})
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                  value={activeCustomersSearch}
                  onChange={(e) => handleActiveCustomersSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => exportCustomerData('active', 'csv')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => exportCustomerData('active', 'excel')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeCustomersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Client' : 'Customer'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Contact' : 'Contact'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Localisation' : 'Location'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Commandes' : 'Orders'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Chiffre d\'Affaires' : 'Revenue'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Dernière Commande' : 'Last Order'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Actions' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeCustomers?.customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                          <div className="text-sm text-gray-500">{customer.orderFrequency}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{customer.telephone}</span>
                      </div>
                      {customer.email && (
                        <div className="text-sm text-gray-500 mt-1">{customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">{customer.wilaya}</div>
                          <div className="text-sm text-gray-500">{customer.commune}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.totalOrders}</div>
                      <div className="text-sm text-gray-500">
                        {customer.averageOrderValue.toLocaleString()} DA {language === 'fr' ? 'moy.' : 'avg.'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {customer.totalRevenue.toLocaleString()} DA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => showCustomerOrderHistory(customer)}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {language === 'fr' ? 'Historique' : 'History'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Active Customers Pagination */}
        {activeCustomers?.pagination && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {language === 'fr' ? 'Affichage de' : 'Showing'} {((activeCustomers.pagination.currentPage - 1) * 50) + 1} {language === 'fr' ? 'à' : 'to'} {Math.min(activeCustomers.pagination.currentPage * 50, activeCustomers.pagination.totalCount)} {language === 'fr' ? 'sur' : 'of'} {activeCustomers.pagination.totalCount} {language === 'fr' ? 'clients' : 'customers'}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleActiveCustomersPageChange(activeCustomersPage - 1)}
                disabled={!activeCustomers.pagination.hasPrevPage}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm font-medium">
                {activeCustomers.pagination.currentPage} / {activeCustomers.pagination.totalPages}
              </span>
              <button
                onClick={() => handleActiveCustomersPageChange(activeCustomersPage + 1)}
                disabled={!activeCustomers.pagination.hasNextPage}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Returning Customers Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                {language === 'fr' ? 'Clients Fidèles' : 'Returning Customers'}
                {returningCustomers && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({returningCustomers.pagination.totalCount})
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                  value={returningCustomersSearch}
                  onChange={(e) => handleReturningCustomersSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => exportCustomerData('returning', 'csv')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => exportCustomerData('returning', 'excel')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {returningCustomersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Client' : 'Customer'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Contact' : 'Contact'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Localisation' : 'Location'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Commandes' : 'Orders'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Chiffre d\'Affaires' : 'Revenue'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Dernière Commande' : 'Last Order'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'fr' ? 'Actions' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returningCustomers?.customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                          <div className="text-sm text-gray-500">{customer.orderFrequency}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{customer.telephone}</span>
                      </div>
                      {customer.email && (
                        <div className="text-sm text-gray-500 mt-1">{customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">{customer.wilaya}</div>
                          <div className="text-sm text-gray-500">{customer.commune}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.totalOrders}</div>
                      <div className="text-sm text-gray-500">
                        {customer.averageOrderValue.toLocaleString()} DA {language === 'fr' ? 'moy.' : 'avg.'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-orange-600">
                        {customer.totalRevenue.toLocaleString()} DA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => showCustomerOrderHistory(customer)}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {language === 'fr' ? 'Historique' : 'History'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Returning Customers Pagination */}
        {returningCustomers?.pagination && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {language === 'fr' ? 'Affichage de' : 'Showing'} {((returningCustomers.pagination.currentPage - 1) * 50) + 1} {language === 'fr' ? 'à' : 'to'} {Math.min(returningCustomers.pagination.currentPage * 50, returningCustomers.pagination.totalCount)} {language === 'fr' ? 'sur' : 'of'} {returningCustomers.pagination.totalCount} {language === 'fr' ? 'clients' : 'customers'}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleReturningCustomersPageChange(returningCustomersPage - 1)}
                disabled={!returningCustomers.pagination.hasPrevPage}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm font-medium">
                {returningCustomers.pagination.currentPage} / {returningCustomers.pagination.totalPages}
              </span>
              <button
                onClick={() => handleReturningCustomersPageChange(returningCustomersPage + 1)}
                disabled={!returningCustomers.pagination.hasNextPage}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order History Modal */}
      {showOrderHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {language === 'fr' ? 'Historique des Commandes' : 'Order History'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCustomer.fullName} - {selectedCustomer.telephone}
                </p>
              </div>
              <button
                onClick={() => setShowOrderHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium">
                    {language === 'fr' ? 'Total Commandes' : 'Total Orders'}
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {selectedCustomer.totalOrders}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 font-medium">
                    {language === 'fr' ? 'Chiffre d\'Affaires' : 'Total Revenue'}
                  </div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {selectedCustomer.totalRevenue.toLocaleString()} DA
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 font-medium">
                    {language === 'fr' ? 'Valeur Moyenne' : 'Average Order'}
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {selectedCustomer.averageOrderValue.toLocaleString()} DA
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {language === 'fr' ? 'Historique des Commandes' : 'Order Timeline'}
                </h4>
                {selectedCustomer.orderHistory.map((order, index) => (
                  <div key={order.orderId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {selectedCustomer.orderHistory.length - index}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {language === 'fr' ? 'Commande' : 'Order'} #{order.orderId.slice(-8)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(order.orderDate).toLocaleDateString()} - {order.storeIdentifier}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {order.total.toLocaleString()} DA
                        </div>
                        <div className={`text-sm px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                    {order.products.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          {language === 'fr' ? 'Produits:' : 'Products:'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {order.products.slice(0, 3).map((product, idx) => (
                            <span key={idx} className="text-xs bg-white px-2 py-1 rounded border">
                              {product}
                            </span>
                          ))}
                          {order.products.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{order.products.length - 3} {language === 'fr' ? 'autres' : 'more'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}