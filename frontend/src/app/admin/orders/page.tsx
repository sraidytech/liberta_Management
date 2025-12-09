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
  ArrowUpDown,
  MessageSquare
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
  const [orderTicketCounts, setOrderTicketCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [wilayaSettings, setWilayaSettings] = useState<WilayaDeliverySettings[]>([]);
  const [uniqueWilayas, setUniqueWilayas] = useState<string[]>([]);
  
  // Ultra Modern Features
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  
  // Advanced Filtering
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [customerFilter, setCustomerFilter] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [shippingStatusFilter, setShippingStatusFilter] = useState('');
  const [totalRange, setTotalRange] = useState({ min: '', max: '' });
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'orderDate', direction: 'desc' });
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('orderDate');
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

  // 🚀 PROFESSIONAL SOLUTION: Extract ticket counts from orders response
  // No more separate API calls - ticket counts are included in the main orders query
  const extractTicketCountsFromOrders = (orders: Order[]) => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      // Extract ticket count from the _count field that's now included in the orders response
      counts[order.id] = (order as any)._count?.tickets || 0;
    });
    setOrderTicketCounts(counts);
    console.log('✅ Admin: Ticket counts extracted from orders response:', counts);
  };

  // Get last agent note status - exclude EcoManager confirmation notes
  const getLastNoteStatus = (order: Order): string => {
    if (!order.notes) return '-';
    
    try {
      const notes = JSON.parse(order.notes);
      if (Array.isArray(notes) && notes.length > 0) {
        // Filter out EcoManager confirmation notes
        const agentNotes = notes.filter(note => {
          const noteText = note.type || note.note || '';
          return !noteText.toLowerCase().includes('last confirmation') &&
                 !noteText.toLowerCase().includes('confirmation échouée');
        });
        
        if (agentNotes.length > 0) {
          const lastNote = agentNotes[agentNotes.length - 1];
          const noteText = lastNote.type || lastNote.note || '-';
          return noteText.length > 15 ? noteText.substring(0, 15) + '...' : noteText;
        }
      }
    } catch (error) {
      // If notes is not JSON, check if it's a confirmation note
      const noteText = order.notes;
      if (noteText.toLowerCase().includes('last confirmation') ||
          noteText.toLowerCase().includes('confirmation échouée')) {
        return '-';
      }
      return noteText.length > 15 ? noteText.substring(0, 15) + '...' : noteText;
    }
    
    return '-';
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
      
      // 🚀 FIXED: Connect date range filter to backend API (filters by orderDate)
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      // Advanced filters
      if (shippingStatusFilter) params.append('shippingStatus', shippingStatusFilter);
      if (customerFilter) params.append('customer', customerFilter);
      if (wilayaFilter) params.append('wilaya', wilayaFilter);
      if (agentFilter) params.append('assignedAgentId', agentFilter);
      if (totalRange.min) params.append('minTotal', totalRange.min);
      if (totalRange.max) params.append('maxTotal', totalRange.max);

      const response = await fetch(`${apiUrl}/api/v1/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.data.orders;
        setOrders(orders);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
        
        // Extract unique wilayas from orders
        const wilayaSet = new Set(orders.map((order: Order) => order.customer.wilaya).filter(Boolean));
        const wilayas = Array.from(wilayaSet).sort() as string[];
        setUniqueWilayas(wilayas);
        
        // Fetch ticket counts for all orders
        // 🚀 PROFESSIONAL SOLUTION: Extract ticket counts from orders response
        // No more separate API calls needed!
        if (orders.length > 0) {
          extractTicketCountsFromOrders(orders);
        }
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

  // Fetch available agents for manual assignment
  const fetchAvailableAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/assignments/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableAgents(data.data);
      } else {
        console.error('Failed to fetch available agents');
      }
    } catch (error) {
      console.error('Error fetching available agents:', error);
    }
  };

  // Manually assign order to agent
  const manualAssignOrder = async (orderId: string, agentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/assignments/manual/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: t('success'),
          message: data.message || 'Order assigned successfully'
        });
        
        // Refresh orders and close modal
        fetchOrders();
        setShowAssignModal(false);
        setAssigningOrder(null);
      } else {
        const error = await response.json();
        showToast({
          type: 'error',
          title: t('error'),
          message: error.error?.message || 'Failed to assign order'
        });
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to assign order'
      });
    }
  };

  // Open assignment modal
  const openAssignModal = (orderId: string) => {
    setAssigningOrder(orderId);
    setShowAssignModal(true);
    fetchAvailableAgents();
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
    if (!dateString) {
      return 'N/A';
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    // Load filters
    const saved = localStorage.getItem('orderFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        setDateRange(filters.dateRange || { start: '', end: '' });
        setCustomerFilter(filters.customerFilter || '');
        setWilayaFilter(filters.wilayaFilter || '');
        setAgentFilter(filters.agentFilter || '');
        setShippingStatusFilter(filters.shippingStatusFilter || '');
        setTotalRange(filters.totalRange || { min: '', max: '' });
        setSortConfig(filters.sortConfig || { key: 'orderDate', direction: 'desc' });
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
    
    // Load pagination settings
    const savedPagination = localStorage.getItem('orderPagination');
    if (savedPagination) {
      try {
        const pagination = JSON.parse(savedPagination);
        setLimit(pagination.limit || 25);
        setCurrentPage(pagination.currentPage || 1);
      } catch (e) {
        console.error('Error loading saved pagination:', e);
      }
    }

    // Load search and sort settings
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setSearch(settings.search || '');
        setSortBy(settings.sortBy || 'orderDate');
        setSortOrder(settings.sortOrder || 'desc');
        setShowAdvancedFilters(settings.showAdvancedFilters || false);
      } catch (e) {
        console.error('Error loading saved settings:', e);
      }
    }
    
    // Load saved filter presets
    const savedFiltersList = localStorage.getItem('savedOrderFilters');
    if (savedFiltersList) {
      try {
        setSavedFilters(JSON.parse(savedFiltersList));
      } catch (e) {
        console.error('Error loading saved filters list:', e);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters = {
      dateRange,
      customerFilter,
      wilayaFilter,
      agentFilter,
      shippingStatusFilter,
      totalRange,
      sortConfig
    };
    localStorage.setItem('orderFilters', JSON.stringify(filters));
  }, [dateRange, customerFilter, wilayaFilter, agentFilter, shippingStatusFilter, totalRange, sortConfig]);

  // Save pagination settings whenever they change
  useEffect(() => {
    const pagination = {
      limit,
      currentPage
    };
    localStorage.setItem('orderPagination', JSON.stringify(pagination));
  }, [limit, currentPage]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [search, shippingStatusFilter, dateRange, customerFilter, wilayaFilter, agentFilter, totalRange]);

  // Save general settings whenever they change
  useEffect(() => {
    const settings = {
      search,
      sortBy,
      sortOrder,
      showAdvancedFilters
    };
    localStorage.setItem('orderSettings', JSON.stringify(settings));
  }, [search, sortBy, sortOrder, showAdvancedFilters]);

  // Advanced sorting function
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setSortBy(key);
    setSortOrder(sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc');
  };

  // Bulk selection functions
  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Bulk actions
  const bulkAssignOrders = async (agentId: string) => {
    const orderIds = Array.from(selectedOrders);
    let successCount = 0;
    
    for (const orderId of orderIds) {
      try {
        await manualAssignOrder(orderId, agentId);
        successCount++;
      } catch (error) {
        console.error(`Failed to assign order ${orderId}:`, error);
      }
    }
    
    showToast({
      type: 'success',
      title: t('success'),
      message: `${successCount}/${orderIds.length} orders assigned successfully`
    });
    
    setSelectedOrders(new Set());
    setShowBulkActions(false);
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    const orderIds = Array.from(selectedOrders);
    let successCount = 0;
    
    for (const orderId of orderIds) {
      try {
        await updateOrderStatus(orderId, newStatus);
        successCount++;
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
      }
    }
    
    showToast({
      type: 'success',
      title: t('success'),
      message: `${successCount}/${orderIds.length} orders updated successfully`
    });
    
    setSelectedOrders(new Set());
    setShowBulkActions(false);
  };

  // Save current filters as preset
  const saveCurrentFilters = () => {
    const filterName = prompt('Enter a name for this filter preset:');
    if (filterName) {
      const newFilter = {
        id: Date.now().toString(),
        name: filterName,
        filters: {
          dateRange,
          customerFilter,
          wilayaFilter,
          agentFilter,
          shippingStatusFilter,
          totalRange,
          sortConfig
        }
      };
      
      const updated = [...savedFilters, newFilter];
      setSavedFilters(updated);
      localStorage.setItem('savedOrderFilters', JSON.stringify(updated));
      
      showToast({
        type: 'success',
        title: t('success'),
        message: `Filter preset "${filterName}" saved successfully`
      });
    }
  };

  // Load saved filter preset
  const loadFilterPreset = (preset: any) => {
    const { filters } = preset;
    setDateRange(filters.dateRange);
    setCustomerFilter(filters.customerFilter);
    setWilayaFilter(filters.wilayaFilter);
    setAgentFilter(filters.agentFilter);
    setShippingStatusFilter(filters.shippingStatusFilter);
    setTotalRange(filters.totalRange);
    setSortConfig(filters.sortConfig);
    setSortBy(filters.sortConfig.key);
    setSortOrder(filters.sortConfig.direction);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setDateRange({ start: '', end: '' });
    setCustomerFilter('');
    setWilayaFilter('');
    setAgentFilter('');
    setShippingStatusFilter('');
    setTotalRange({ min: '', max: '' });
    setSearch('');
    setSortConfig({ key: 'orderDate', direction: 'desc' });
    setSortBy('orderDate');
    setSortOrder('desc');
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [currentPage, limit, search, shippingStatusFilter, sortBy, sortOrder, dateRange, customerFilter, wilayaFilter, agentFilter, totalRange]);

  // Load wilaya settings and agents on component mount
  useEffect(() => {
    fetchWilayaSettings();
    fetchAvailableAgents();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Clean Modern Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('ordersManagement')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('manageAndTrackOrders')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync Actions */}
            <button
              onClick={() => syncOrders(false)}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? t('syncing') : t('syncNewOrders')}
            </button>


            {/* Bulk Actions */}
            {selectedOrders.size > 0 && (
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Bulk ({selectedOrders.size})
              </button>
            )}

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

        {/* Ultra Clean Pro Search & Filter Interface */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
          {/* Main Search Bar */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('searchByReference')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-3">
                {/* Shipping Status Filter */}
                <div className="relative">
                  <select
                    value={shippingStatusFilter}
                    onChange={(e) => setShippingStatusFilter(e.target.value)}
                    className="appearance-none bg-gray-50/50 border border-gray-200/50 rounded-2xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-gray-700 font-medium min-w-[180px]"
                  >
                    <option value="">All Shipping Status</option>
                    <option value="CRÉÉ">CRÉÉ</option>
                    <option value="DEMANDE DE RAMASSAGE">DEMANDE DE RAMASSAGE</option>
                    <option value="EN COURS">EN COURS</option>
                    <option value="EN ATTENTE DE TRANSIT">EN ATTENTE DE TRANSIT</option>
                    <option value="EN TRANSIT POUR EXPÉDITION">EN TRANSIT POUR EXPÉDITION</option>
                    <option value="EN TRANSIT POUR RETOUR">EN TRANSIT POUR RETOUR</option>
                    <option value="EN ATTENTE">EN ATTENTE</option>
                    <option value="EN RUPTURE DE STOCK">EN RUPTURE DE STOCK</option>
                    <option value="PRÊT À EXPÉDIER">PRÊT À EXPÉDIER</option>
                    <option value="ASSIGNÉ">ASSIGNÉ</option>
                    <option value="EXPÉDIÉ">EXPÉDIÉ</option>
                    <option value="ALERTÉ">ALERTÉ</option>
                    <option value="LIVRÉ">LIVRÉ</option>
                    <option value="REPORTÉ">REPORTÉ</option>
                    <option value="ANNULÉ">ANNULÉ</option>
                    <option value="PRÊT À RETOURNER">PRÊT À RETOURNER</option>
                    <option value="PRIS PAR LE MAGASIN">PRIS PAR LE MAGASIN</option>
                    <option value="NON REÇU">NON REÇU</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Items Per Page */}
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="appearance-none bg-gray-50/50 border border-gray-200/50 rounded-2xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-gray-700 font-medium"
                  >
                    <option value={10}>10 items</option>
                    <option value={25}>25 items</option>
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Page Jump */}
                <div className="relative flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Page:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-20 px-3 py-4 bg-gray-50/50 border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-center font-medium"
                  />
                  <span className="text-sm text-gray-500">of {totalPages}</span>
                </div>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-4 rounded-2xl border transition-all duration-200 font-medium flex items-center gap-2 relative ${
                    showAdvancedFilters
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-gray-50/50 border-gray-200/50 text-gray-700 hover:bg-white hover:border-blue-500/50 hover:text-blue-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {/* Active Filter Indicator */}
                  {(dateRange.start || dateRange.end || customerFilter || wilayaFilter || agentFilter || shippingStatusFilter || totalRange.min || totalRange.max) && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Quick Date Filter Status */}
                {(dateRange.start || dateRange.end) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      {dateRange.start && dateRange.end
                        ? `${dateRange.start} - ${dateRange.end}`
                        : dateRange.start
                          ? `From ${dateRange.start}`
                          : `Until ${dateRange.end}`
                      }
                    </span>
                    <button
                      onClick={() => setDateRange({ start: '', end: '' })}
                      className="ml-1 p-1 hover:bg-blue-100 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Enhanced Date Range Filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Order Date Range
                    </label>
                    
                    {/* Date Range Presets */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setDateRange({ start: today, end: today });
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const dateStr = yesterday.toISOString().split('T')[0];
                          setDateRange({ start: dateStr, end: dateStr });
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        Yesterday
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const lastWeek = new Date();
                          lastWeek.setDate(today.getDate() - 7);
                          setDateRange({
                            start: lastWeek.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          });
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        Last 7 days
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const lastMonth = new Date();
                          lastMonth.setDate(today.getDate() - 30);
                          setDateRange({
                            start: lastMonth.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          });
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        Last 30 days
                      </button>
                      <button
                        onClick={() => setDateRange({ start: '', end: '' })}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Date Inputs */}
                    <div className="space-y-2">
                      <input
                        type="date"
                        placeholder="Start Date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
                      />
                      <input
                        type="date"
                        placeholder="End Date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
                      />
                    </div>
                    
                    {/* Active Filter Indicator */}
                    {(dateRange.start || dateRange.end) && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {dateRange.start && dateRange.end
                          ? `${dateRange.start} to ${dateRange.end}`
                          : dateRange.start
                            ? `From ${dateRange.start}`
                            : `Until ${dateRange.end}`
                        }
                      </div>
                    )}
                  </div>

                  {/* Customer Filter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer
                    </label>
                    <input
                      type="text"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder={t('nameOrPhone')}
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 placeholder-gray-400"
                    />
                  </div>

                  {/* Wilaya Filter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Wilaya
                    </label>
                    <div className="relative">
                      <select
                        value={wilayaFilter}
                        onChange={(e) => setWilayaFilter(e.target.value)}
                        className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
                      >
                        <option value="">All Wilayas</option>
                        {uniqueWilayas.map(wilaya => (
                          <option key={wilaya} value={wilaya}>{wilaya}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Agent Filter */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Agent
                    </label>
                    <div className="relative">
                      <select
                        value={agentFilter}
                        onChange={(e) => setAgentFilter(e.target.value)}
                        className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
                      >
                        <option value="">All Agents</option>
                        {availableAgents.map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.agentCode})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                  <div className="flex gap-3">
                    {savedFilters.length > 0 && (
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const preset = savedFilters.find(f => f.id === e.target.value);
                              if (preset) loadFilterPreset(preset);
                            }
                          }}
                          className="appearance-none bg-gray-50/50 border border-gray-200/50 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-sm"
                        >
                          <option value="">Load Saved Filter</option>
                          {savedFilters.map(filter => (
                            <option key={filter.id} value={filter.id}>{filter.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors duration-200 hover:bg-gray-50 rounded-xl"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={saveCurrentFilters}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Save Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Bulk Actions Panel */}
        {showBulkActions && selectedOrders.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bulk Actions ({selectedOrders.size} orders selected)
              </h3>
              <button
                onClick={() => setShowBulkActions(false)}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-blue-600" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Bulk Assign */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkAssignOrders(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">Assign to Agent</option>
                {availableAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.agentCode}) - {agent.todaysOrders}/{agent.maxOrders}
                  </option>
                ))}
              </select>

              {/* Bulk Status Update */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">Update Status</option>
                <option value="PENDING">{t('pending')}</option>
                <option value="ASSIGNED">{t('assigned')}</option>
                <option value="IN_PROGRESS">{t('inProgress')}</option>
                <option value="CONFIRMED">{t('confirmed')}</option>
                <option value="SHIPPED">{t('shipped')}</option>
                <option value="DELIVERED">{t('delivered')}</option>
                <option value="CANCELLED">{t('cancelled')}</option>
                <option value="RETURNED">{t('returned')}</option>
              </select>

              {/* Clear Selection */}
              <button
                onClick={() => setSelectedOrders(new Set())}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Clean Modern Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* Bulk Select */}
                  <th className="px-3 py-3 text-left w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {selectedOrders.size === orders.length && orders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  
                  {/* Sortable Headers */}
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('reference')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {t('order')}
                      {sortConfig.key === 'reference' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('customer.fullName')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {t('customer')}
                      {sortConfig.key === 'customer.fullName' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {t('status')}
                      {sortConfig.key === 'status' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  
                  <th className="px-3 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-700">{t('shippingStatus')}</span>
                  </th>

                  <th className="px-3 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-700">Agent Note</span>
                  </th>

                  <th className="px-3 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-700">{t('tickets')}</span>
                  </th>

                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('assignedAgent.name')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {t('agent')}
                      {sortConfig.key === 'assignedAgent.name' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('total')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {t('total')}
                      {sortConfig.key === 'total' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('orderDate')}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {t('date')}
                      {sortConfig.key === 'orderDate' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  
                  <th className="px-3 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-700">{t('actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-lg font-medium">{t('loading')}</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <Package className="w-12 h-12" />
                        <span className="text-lg font-medium">{t('noOrdersFound')}</span>
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
                      'hover:bg-slate-50 transition-colors',
                      selectedOrders.has(order.id) ? 'bg-blue-50 border-l-4 border-blue-400' : '',
                      !selectedOrders.has(order.id) ? delayClasses : '' // Only apply delay colors if not selected
                    ].filter(Boolean).join(' ');

                    return (
                      <tr
                        key={order.id}
                        className={rowClasses}
                      >
                      {/* Bulk Select Checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          {selectedOrders.has(order.id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Order Info */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-bold text-slate-900">
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
                            {order.notes && (() => {
                              try {
                                const notesCount = JSON.parse(order.notes).length;
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    <User className="w-3 h-3 mr-1" />
                                    {notesCount}
                                  </span>
                                );
                              } catch (e) {
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <User className="w-3 h-3 mr-1" />
                                    1
                                  </span>
                                );
                              }
                            })()}
                          </div>
                          <div className="text-sm text-slate-500">
                            {order.ecoManagerId && `ECO-${order.ecoManagerId}`}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {order._count.items} {t('items')}
                          </div>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{order.customer.fullName}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span className="truncate">{order.customer.telephone}</span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{order.customer.wilaya}, {order.customer.commune}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full shadow-sm ${statusColors[order.status as keyof typeof statusColors]}`}>
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

                      {/* Shipping Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {order.shippingStatus ? (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${shippingStatusColors[order.shippingStatus as keyof typeof shippingStatusColors] || 'bg-gray-100 text-gray-800'}`}>
                              <Truck className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{order.shippingStatus}</span>
                            </span>
                            {order.trackingNumber && (
                              <div className="text-xs text-slate-500 mt-1 truncate">
                                {order.trackingNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>

                      {/* Agent Note */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm text-slate-600 block truncate" title={getLastNoteStatus(order)}>
                          {getLastNoteStatus(order)}
                        </span>
                      </td>

                      {/* View Tickets */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        {orderTicketCounts[order.id] > 0 ? (
                          <Button
                            onClick={() => {
                              // Open tickets modal for this order
                              window.open(`/admin/tickets?orderId=${order.id}`, '_blank');
                            }}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-1 text-blue-600 border-blue-200 hover:bg-blue-50 px-2 py-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-xs">{orderTicketCounts[order.id]}</span>
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>

                      {/* Agent */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {order.assignedAgent ? (
                          <div className="max-w-[100px]">
                            <div className="text-sm font-medium text-slate-900 flex items-center gap-1 truncate">
                              <User className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="truncate">{order.assignedAgent.name}</span>
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {order.assignedAgent.agentCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{t('unassigned')}</span>
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(order.orderDate)}</span>
                        </div>
                      </td>

                      {/* Ultra Modern Actions */}
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-sm hover:shadow-md transition-all duration-200"
                            title={t('viewDetails')}
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          {/* Assign/Reassign */}
                          <button
                            onClick={() => openAssignModal(order.id)}
                            className={`p-1.5 ${!order.assignedAgent ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-md shadow-sm hover:shadow-md transition-all duration-200`}
                            title={!order.assignedAgent ? t('assign') : 'Reassign'}
                          >
                            <UserPlus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

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

        {/* Manual Assignment Modal */}
        {showAssignModal && assigningOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
              
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Assign Order</h2>
                    <p className="text-gray-600 mt-1">Select an agent to assign this order</p>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availableAgents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => manualAssignOrder(assigningOrder, agent.id)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">{agent.name}</div>
                            <div className="text-sm text-gray-600">{agent.agentCode}</div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <span className="text-xs text-gray-500">
                                {agent.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Today: {agent.todaysOrders}/{agent.maxOrders}
                            </div>
                            <div className="text-xs text-gray-500">
                              {agent.utilizationRate}% capacity
                            </div>
                          </div>
                        </div>
                        
                        {/* Capacity bar */}
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                agent.utilizationRate > 90 ? 'bg-red-500' :
                                agent.utilizationRate > 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(agent.utilizationRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {availableAgents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No agents available</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                  <Button
                    onClick={() => setShowAssignModal(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
