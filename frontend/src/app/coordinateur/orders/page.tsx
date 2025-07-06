'use client';

import { useState, useEffect } from 'react';
import CoordinateurLayout from '@/components/coordinateur/coordinateur-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/lib/language-context';
import { OrderDetailsModal } from '@/components/coordinateur/order-details-modal';
import {
  calculateOrderDelay,
  getDelayRowClasses,
  getDelayBadgeProps,
  type OrderDelayInfo,
  type WilayaDeliverySettings
} from '@/lib/delivery-delay-utils';
import {
  User,
  Eye,
  UserPlus,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Filter,
  Search,
  Calendar,
  MapPin,
  Phone,
  Package,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  MoreHorizontal,
  Download,
  Upload,
  Settings,
  SlidersHorizontal,
  Check,
  Square,
  CheckSquare,
  RefreshCw,
  Loader2,
  Trash2,
  Save,
  ArrowUpDown
} from 'lucide-react';

interface Order {
  id: string;
  reference: string;
  ecoManagerId?: string;
  status: string;
  shippingStatus?: string;
  trackingNumber?: string;
  maystroOrderId?: string;
  alertedAt?: string;
  alertReason?: string;
  abortReason?: string;
  additionalMetaData?: any;
  total: number;
  orderDate: string;
  createdAt: string;
  notes?: string;
  internalNotes?: string;
  delayInfo?: OrderDelayInfo;
  customer: {
    id: string;
    fullName: string;
    telephone: string;
    wilaya: string;
    commune: string;
  };
  assignedAgent?: {
    id: string;
    name: string;
    agentCode: string;
  };
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  _count: {
    items: number;
  };
}

interface DashboardStats {
  totalOrders: number;
  ordersByStatus: {
    pending: number;
    assigned: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  totalRevenue: number;
  recentOrders: Order[];
  period: string;
}

export default function CoordinateurOrdersPage() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Filters and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shippingStatusFilter, setShippingStatusFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Available agents for filtering
  const [availableAgents, setAvailableAgents] = useState<Array<{id: string, name: string, agentCode: string}>>([]);
  
  // Wilaya delivery settings for delay calculation
  const [wilayaSettings, setWilayaSettings] = useState<WilayaDeliverySettings[]>([]);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
      });


      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (shippingStatusFilter) params.append('shippingStatus', shippingStatusFilter);
      if (storeFilter) params.append('storeIdentifier', storeFilter);
      if (agentFilter) params.append('assignedAgentId', agentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOrders(data.data.orders || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setTotalCount(data.data.pagination?.totalCount || 0);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
      showToast({
        type: 'error',
        title: t('error'),
        message: t('failedToFetchOrders')
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch available agents
  const fetchAvailableAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/assignments/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableAgents(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  // Fetch wilaya delivery settings
  const fetchWilayaSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/wilaya-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWilayaSettings(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching wilaya settings:', error);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const data = await response.json();
      if (data.success) {
        showToast({
          type: 'success',
          title: t('success'),
          message: t('orderStatusUpdatedSuccessfully')
        });
        
        // Refresh orders
        await fetchOrders();
        await fetchStats();
      } else {
        throw new Error(data.error?.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: t('failedToUpdateOrderStatus')
      });
      throw error;
    }
  };

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    // Load filters
    const saved = localStorage.getItem('coordinateurOrderFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        setSearchTerm(filters.searchTerm || '');
        setStatusFilter(filters.statusFilter || '');
        setShippingStatusFilter(filters.shippingStatusFilter || '');
        setStoreFilter(filters.storeFilter || '');
        setAgentFilter(filters.agentFilter || '');
        setStartDate(filters.startDate || '');
        setEndDate(filters.endDate || '');
        setSortBy(filters.sortBy || 'orderDate');
        setSortOrder(filters.sortOrder || 'desc');
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
    
    // Load pagination settings
    const savedPagination = localStorage.getItem('coordinateurOrderPagination');
    if (savedPagination) {
      try {
        const pagination = JSON.parse(savedPagination);
        setItemsPerPage(pagination.itemsPerPage || 25);
        setCurrentPage(pagination.currentPage || 1);
      } catch (e) {
        console.error('Error loading saved pagination:', e);
      }
    }

    fetchAvailableAgents();
    fetchWilayaSettings();
  }, []);

  // Fetch orders when dependencies change - EXACT same pattern as admin
  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, shippingStatusFilter, storeFilter, agentFilter, startDate, endDate, sortBy, sortOrder]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters = {
      searchTerm,
      statusFilter,
      shippingStatusFilter,
      storeFilter,
      agentFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder
    };
    localStorage.setItem('coordinateurOrderFilters', JSON.stringify(filters));
  }, [searchTerm, statusFilter, shippingStatusFilter, storeFilter, agentFilter, startDate, endDate, sortBy, sortOrder]);

  // Save pagination settings whenever they change
  useEffect(() => {
    const pagination = {
      itemsPerPage,
      currentPage
    };
    localStorage.setItem('coordinateurOrderPagination', JSON.stringify(pagination));
  }, [itemsPerPage, currentPage]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, shippingStatusFilter, storeFilter, agentFilter, startDate, endDate]);


  // Handlers
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
    setIsOrderModalOpen(false);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setShippingStatusFilter('');
    setStoreFilter('');
    setAgentFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    
    // Clear localStorage as well
    localStorage.removeItem('coordinateurOrderFilters');
    localStorage.removeItem('coordinateurOrderPagination');
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('pending') },
      ASSIGNED: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('assigned') },
      IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-800', label: t('inProgress') },
      CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', label: t('confirmed') },
      SHIPPED: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: t('shipped') },
      DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: t('delivered') },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: t('cancelled') },
      RETURNED: { bg: 'bg-gray-100', text: 'text-gray-800', label: t('returned') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getShippingStatusBadge = (shippingStatus: string) => {
    if (!shippingStatus) return null;
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {shippingStatus}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <CoordinateurLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('ordersManagement')}</h1>
            <p className="text-gray-600 mt-1">{t('manageAndTrackOrders')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('totalOrders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('pendingOrders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ordersByStatus.pending.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('deliveredOrders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ordersByStatus.delivered.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Truck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Search and Filter Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('searchOrders')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('filter')}
              </Button>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('status')}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('allStatuses')}</option>
                    <option value="PENDING">{t('pending')}</option>
                    <option value="ASSIGNED">{t('assigned')}</option>
                    <option value="IN_PROGRESS">{t('inProgress')}</option>
                    <option value="CONFIRMED">{t('confirmed')}</option>
                    <option value="SHIPPED">{t('shipped')}</option>
                    <option value="DELIVERED">{t('delivered')}</option>
                    <option value="CANCELLED">{t('cancelled')}</option>
                    <option value="RETURNED">{t('returned')}</option>
                  </select>
                </div>

                {/* Shipping Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('shippingStatus')}</label>
                  <select
                    value={shippingStatusFilter}
                    onChange={(e) => setShippingStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Shipping Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="PICKED_UP">Picked Up</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="RETURNED">Returned</option>
                  </select>
                </div>

                {/* Agent Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('assignedAgent')}</label>
                  <select
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Agents</option>
                    <option value="unassigned">{t('unassigned')}</option>
                    {availableAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.agentCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items Per Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('itemsPerPage')}</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('reference')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{t('order')}</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{t('status')}</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('shippingStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('assignedAgent')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('total')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{t('total')}</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{t('date')}</span>
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">{t('loading')}</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center text-red-600">
                        <AlertCircle className="h-8 w-8 mr-2" />
                        <span>{error}</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Package className="h-12 w-12 mb-4" />
                        <span className="text-lg font-medium">{t('noOrdersFound')}</span>
                        <span className="text-sm">Try adjusting your search criteria</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    // Calculate delay info if not provided by backend
                    const delayInfo = order.delayInfo || calculateOrderDelay(
                      order.id,
                      order.customer.wilaya,
                      order.orderDate,
                      order.shippingStatus,
                      wilayaSettings
                    );
                    
                    // Get delay-based row classes
                    const delayClasses = getDelayRowClasses(delayInfo);
                    
                    // Combine all classes
                    const rowClasses = [
                      'hover:bg-gray-50',
                      delayClasses
                    ].filter(Boolean).join(' ');

                    return (
                      <tr key={order.id} className={rowClasses}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium text-gray-900">
                              {order.reference}
                            </div>
                            {/* Delay Badge */}
                            {(() => {
                              const delayBadge = getDelayBadgeProps(delayInfo);
                              if (delayBadge.show) {
                                return (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${delayBadge.className}`}>
                                    <Clock className="w-3 h-3 mr-1" />
                                    {delayBadge.text}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order._count.items} {t('items')}
                          </div>
                          {order.trackingNumber && (
                            <div className="text-xs text-blue-600 font-mono">
                              {order.trackingNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer.fullName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {order.customer.telephone}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {order.customer.wilaya}, {order.customer.commune}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.shippingStatus ? getShippingStatusBadge(order.shippingStatus) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.assignedAgent ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.assignedAgent.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.assignedAgent.agentCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{t('unassigned')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                language={language}
                showItemsPerPage={true}
              />
            </div>
          </div>
        </Card>

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isOrderModalOpen}
          onClose={handleCloseOrderModal}
        />
      </div>
    </CoordinateurLayout>
  );
}