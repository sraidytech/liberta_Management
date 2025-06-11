'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/lib/language-context';
import { OrderDetailsModal } from '@/components/admin/order-details-modal';

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

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-gray-100 text-gray-800'
};

const shippingStatusColors = {
  'CRÉÉ': 'bg-blue-100 text-blue-800',
  'DEMANDE DE RAMASSAGE': 'bg-yellow-100 text-yellow-800',
  'EN COURS': 'bg-purple-100 text-purple-800',
  'EN ATTENTE DE TRANSIT': 'bg-orange-100 text-orange-800',
  'EN TRANSIT POUR EXPÉDITION': 'bg-indigo-100 text-indigo-800',
  'EN TRANSIT POUR RETOUR': 'bg-red-100 text-red-800',
  'EN ATTENTE': 'bg-gray-100 text-gray-800',
  'EN RUPTURE DE STOCK': 'bg-red-100 text-red-800',
  'PRÊT À EXPÉDIER': 'bg-green-100 text-green-800',
  'ASSIGNÉ': 'bg-blue-100 text-blue-800',
  'EXPÉDIÉ': 'bg-indigo-100 text-indigo-800',
  'ALERTÉ': 'bg-yellow-100 text-yellow-800',
  'LIVRÉ': 'bg-emerald-100 text-emerald-800',
  'REPORTÉ': 'bg-orange-100 text-orange-800',
  'ANNULÉ': 'bg-red-100 text-red-800',
  'PRÊT À RETOURNER': 'bg-gray-100 text-gray-800',
  'PRIS PAR LE MAGASIN': 'bg-green-100 text-green-800',
  'NON REÇU': 'bg-red-100 text-red-800'
};

export default function OrdersPage() {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/orders/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${apiUrl}/api/v1/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data.orders);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
      } else {
        showToast({
          type: 'error',
          title: t('error'),
          message: t('failedToFetchOrders')
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: t('failedToFetchOrders')
      });
    } finally {
      setLoading(false);
    }
  };

  // Sync orders from all active stores
  const syncOrders = async (fullSync = false) => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/orders/sync-all-stores`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullSync
        })
      });

      if (response.ok) {
        const data = await response.json();
        const { totalSyncedCount, storesProcessed, results } = data.data;
        
        // Show detailed success message
        const successfulStores = results.filter((r: any) => r.success);
        const failedStores = results.filter((r: any) => !r.success);
        
        let message = `${t('successfullySynced')} ${totalSyncedCount} ${t('orders')} from ${successfulStores.length}/${storesProcessed} stores`;
        
        if (failedStores.length > 0) {
          message += `\n${t('failedStores')}: ${failedStores.map((s: any) => s.storeName).join(', ')}`;
        }
        
        showToast({
          type: totalSyncedCount > 0 ? 'success' : 'warning',
          title: t('success'),
          message
        });
        
        fetchOrders();
        fetchStats();
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || t('failedToSyncOrders')
        });
      }
    } catch (error) {
      console.error('Error syncing orders:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: t('failedToSyncOrders')
      });
    } finally {
      setSyncing(false);
    }
  };

  // Test EcoManager integration
  const testEcoManagerIntegration = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/orders/test-ecomanager?storeIdentifier=NATU`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: t('success'),
          message: `${data.message}. Found ${data.data.summary.totalEnDispatchOrders} "En dispatch" orders`
        });
        
        // Log detailed results to console for inspection
        console.log('EcoManager Test Results:', data.data);
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || 'Failed to test EcoManager integration'
        });
      }
    } catch (error) {
      console.error('Error testing EcoManager integration:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to test EcoManager integration'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Delete all orders
  const deleteAllOrders = async () => {
    if (!confirm('Are you sure you want to delete ALL orders? This action cannot be undone!')) {
      return;
    }

    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/orders/delete-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: t('success'),
          message: `${data.message}`
        });
        
        // Refresh the page data
        fetchOrders();
        fetchStats();
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || 'Failed to delete all orders'
        });
      }
    } catch (error) {
      console.error('Error deleting all orders:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to delete all orders'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Sync shipping status from Maystro
  const syncShippingStatus = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/orders/sync-shipping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: t('success'),
          message: `${data.message}`
        });
        
        // Refresh the orders
        fetchOrders();
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || 'Failed to sync shipping status'
        });
      }
    } catch (error) {
      console.error('Error syncing shipping status:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to sync shipping status'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Test Maystro integration
  const testMaystroIntegration = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/orders/test-maystro`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: t('success'),
          message: data.message
        });
        
        // Log detailed results to console for inspection
        console.log('Maystro Test Results:', data.data);
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || 'Failed to test Maystro integration'
        });
      }
    } catch (error) {
      console.error('Error testing Maystro integration:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to test Maystro integration'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        showToast({
          type: 'success',
          title: t('success'),
          message: t('orderStatusUpdatedSuccessfully')
        });
        fetchOrders();
        fetchStats();
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || t('failedToUpdateOrderStatus')
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: t('failedToUpdateOrderStatus')
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [currentPage, limit, search, statusFilter, sortBy, sortOrder]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('ordersManagement')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('manageAndTrackOrders')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => syncOrders(false)}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncing ? t('syncing') : t('syncNewOrders')}
            </Button>
            <Button
              onClick={() => syncOrders(true)}
              disabled={syncing}
              variant="outline"
            >
              {t('fullSync')}
            </Button>
            <Button
              onClick={deleteAllOrders}
              disabled={syncing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete All Orders
            </Button>
            <Button
              onClick={syncShippingStatus}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {syncing ? t('syncing') : t('syncShippingStatus')}
            </Button>
            <Button
              onClick={testMaystroIntegration}
              disabled={syncing}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              {t('testMaystroIntegration')}
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('totalOrders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('pendingOrders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ordersByStatus.pending}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('deliveredOrders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ordersByStatus.delivered}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search')}
              </label>
              <Input
                type="text"
                placeholder={t('searchOrders')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('sortBy')}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">{t('createdDate')}</option>
                <option value="orderDate">{t('orderDate')}</option>
                <option value="total">{t('totalAmount')}</option>
                <option value="status">{t('status')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('itemsPerPage')}
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('order')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('shippingStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('agent')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('total')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      {t('noOrdersFound')}
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.reference}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.ecoManagerId && `ECO-${order.ecoManagerId}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {order._count.items} {t('items')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer.telephone}
                          </div>
                          <div className="text-xs text-gray-400">
                            {order.customer.wilaya}, {order.customer.commune}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status as keyof typeof statusColors]}`}>
                          {order.status === 'PENDING' ? t('pending') :
                           order.status === 'ASSIGNED' ? t('assigned') :
                           order.status === 'IN_PROGRESS' ? t('inProgress') :
                           order.status === 'CONFIRMED' ? t('confirmed') :
                           order.status === 'SHIPPED' ? t('shipped') :
                           order.status === 'DELIVERED' ? t('delivered') :
                           order.status === 'CANCELLED' ? t('cancelled') :
                           order.status === 'RETURNED' ? t('returned') :
                           order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.shippingStatus ? (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${shippingStatusColors[order.shippingStatus as keyof typeof shippingStatusColors] || 'bg-gray-100 text-gray-800'}`}>
                              {order.shippingStatus}
                            </span>
                            {order.trackingNumber && (
                              <div className="text-xs text-gray-500 mt-1">
                                {t('trackingNumber')}: {order.trackingNumber}
                              </div>
                            )}
                          </div>
                        ) : (
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
                          <span className="text-sm text-gray-400">{t('unassigned')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => setSelectedOrder(order)}
                          variant="outline"
                          size="sm"
                        >
                          {t('viewDetails')}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalCount}
            itemsPerPage={limit}
          />
        )}

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={updateOrderStatus}
        />
      </div>
    </AdminLayout>
  );
}