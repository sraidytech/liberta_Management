'use client';

import AgentLayout from '@/components/agent/agent-layout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { useToast } from '@/components/ui/toast';
import {
  Package,
  Phone,
  User,
  MapPin,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Eye,
  Truck,
  AlertCircle,
  DollarSign,
  X,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  StickyNote,
  ToggleLeft,
  ToggleRight,
  Check,
  X as XIcon
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
  notes?: string;
  internalNotes?: string;
  orderDate: string;
  createdAt: string;
  assignedAt: string;
  customer: {
    id: string;
    fullName: string;
    telephone: string;
    email?: string;
    wilaya: string;
    commune: string;
    address?: string;
  };
  assignedAgent?: {
    id: string;
    name: string;
    agentCode: string;
  };
  items: Array<{
    id: string;
    title: string;
    sku?: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  _count: {
    items: number;
    tickets: number;  // 🚀 Add ticket count to interface
  };
}

export default function AgentOrdersPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderTicketCounts, setOrderTicketCounts] = useState<Record<string, number>>({});
  const [totalAssignedOrders, setTotalAssignedOrders] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [selectedShippingStatuses, setSelectedShippingStatuses] = useState<string[]>([]);
  const [availableShippingStatuses, setAvailableShippingStatuses] = useState<string[]>([]);
  const [loadingShippingStatuses, setLoadingShippingStatuses] = useState(false);
  
  // Pagination and filtering (matching admin implementation)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('orderDate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // New filtering states
  const [hideDeliveredOrders, setHideDeliveredOrders] = useState(true); // Auto-filter enabled by default
  const [selectedNoteTypes, setSelectedNoteTypes] = useState<string[]>([]);
  const [showNoteTypeDropdown, setShowNoteTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showShippingStatusDropdown, setShowShippingStatusDropdown] = useState(false);
  const [showOnlyOrdersWithNotes, setShowOnlyOrdersWithNotes] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteType, setNoteType] = useState('');
  const [customNote, setCustomNote] = useState('');
  
  // Ticket system state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState('CUSTOMER_ISSUE');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketAssigneeId, setTicketAssigneeId] = useState('');
  const [availableAssignees, setAvailableAssignees] = useState<Array<{
    id: string;
    name: string;
    role: string;
    agentCode?: string;
  }>>([]);
  const [creatingTicket, setCreatingTicket] = useState(false);
  
  // View tickets state
  const [showViewTicketsModal, setShowViewTicketsModal] = useState(false);
  const [orderTickets, setOrderTickets] = useState<Array<any>>([]);
  const [selectedOrderForTickets, setSelectedOrderForTickets] = useState<Order | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicketForView, setSelectedTicketForView] = useState<any>(null);
  const [showTicketDetailModal, setShowTicketDetailModal] = useState(false);
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [sendingTicketMessage, setSendingTicketMessage] = useState(false);

  // Predefined note options
  const noteOptions = [
    { value: 'CLIENT_NO_RESPONSE_1', label: 'Client (PAS DE REPONSE 1)' },
    { value: 'CLIENT_NO_RESPONSE_2', label: 'Client (PAS DE REPONSE 2)' },
    { value: 'CLIENT_NO_RESPONSE_3', label: 'Client (PAS DE REPONSE 3)' },
    { value: 'CLIENT_NO_RESPONSE_4_SMS', label: 'Client (PAS DE REPONSE 4+SMS)' },
    { value: 'CLIENT_POSTPONED', label: 'CLIENT (REPORTER)', hasRemark: true },
    { value: 'CLIENT_CANCELLED', label: 'CLIENT (ANNULE)', hasRemark: true },
    { value: 'RELAUNCHED', label: 'Relancé' },
    { value: 'REFUND', label: 'Remboursement' },
    { value: 'EXCHANGE', label: 'Echange' },
    { value: 'POSTPONED_TO_DATE', label: 'Reporté à une date' },
    { value: 'APPROVED_TO_DATE', label: 'Approuvé à une date' },
    { value: 'PROBLEM_CLIENT_DELIVERY', label: 'Problem (client / livreur)', hasRemark: true },
    { value: 'PROBLEM_ORDER', label: 'Problem (commande)', hasRemark: true },
    { value: 'DELIVERED_PENDING', label: 'Livrée (en attente de finalisation)' },
    { value: 'CUSTOM', label: 'Autre (personnalisé)', hasRemark: true }
  ];

  // Status options for multi-select
  const statusOptions = [
    { value: 'PENDING', label: t('pending') },
    { value: 'ASSIGNED', label: t('assigned') },
    { value: 'CONFIRMED', label: t('confirmed') },
    { value: 'SHIPPED', label: t('shipped') },
    { value: 'DELIVERED', label: t('delivered') },
    { value: 'CANCELLED', label: t('cancelled') },
    { value: 'RETURNED', label: t('returned') }
  ];

  // Dynamic shipping status options from database
  const shippingStatusOptions = availableShippingStatuses.map(status => ({
    value: status,
    label: status // Use the actual status as label since they can be in any language
  }));

  const fetchAgentStats = async () => {
    if (!user?.id) return;

    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/assignments/agent/${user.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setTotalAssignedOrders(data.data.assignedOrders);
          console.log('📊 Total assigned orders from stats:', data.data.assignedOrders);
        }
      } else {
        console.error('❌ Failed to fetch agent stats:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching agent stats:', error);
    }
  };

  const fetchOrders = async (page: number = currentPage) => {
    if (!user?.id) {
      console.log('❌ No user ID available, user object:', user);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching orders for agent ID:', user.id, 'Page:', page);
      console.log('👤 User details:', { id: user.id, name: user.name, role: user.role, agentCode: (user as any).agentCode });
      
      // Use the correct API URL from environment variable with pagination and filters
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const params = new URLSearchParams();
      params.append('assignedAgentId', user.id);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (search) params.append('search', search);
      if (statusFilter.length > 0 && !statusFilter.includes('ALL')) {
        params.append('status', statusFilter.join(','));
      }
      if (selectedShippingStatuses.length > 0) {
        params.append('shippingStatus', selectedShippingStatuses.join(','));
      }
      if (hideDeliveredOrders) params.append('excludeStatus', 'DELIVERED');
      if (selectedNoteTypes.length > 0) {
        params.append('noteTypes', selectedNoteTypes.join(','));
      }
      if (showOnlyOrdersWithNotes) params.append('hasAgentNotes', 'true');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      const url = `${apiBaseUrl}/api/v1/orders?${params.toString()}`;
      console.log('📡 Full API URL:', url);
      console.log('🌐 API Base URL:', apiBaseUrl);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 API Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Full API Response:', data);
        console.log('📋 Orders array:', data.data?.orders);
        console.log('🔢 Number of orders:', data.data?.orders?.length || 0);
        console.log('📄 Pagination info:', data.data?.pagination);
        
        const orders = data.data?.orders || [];
        const pagination = data.data?.pagination || {};
        
        setOrders(orders);
        setCurrentPage(pagination.currentPage || page);
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.totalCount || 0);
        
        console.log('✅ Orders set in state, count:', orders.length);
        console.log('📄 Pagination state updated:', {
          currentPage: pagination.currentPage || page,
          totalPages: pagination.totalPages || 1,
          totalCount: pagination.totalCount || 0
        });
        
        // 🚀 PROFESSIONAL SOLUTION: Extract ticket counts from orders response
        // No more separate API calls needed!
        if (orders.length > 0) {
          extractTicketCountsFromOrders(orders);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('💥 Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAssignees = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/assignees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableAssignees(data.data?.assignees || []);
      } else {
        console.error('❌ Failed to fetch assignees:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching assignees:', error);
    }
  };

  const fetchShippingStatuses = async () => {
    setLoadingShippingStatuses(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/orders/shipping-statuses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableShippingStatuses(data.data?.shippingStatuses || []);
      } else {
        console.error('❌ Failed to fetch shipping statuses:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching shipping statuses:', error);
    } finally {
      setLoadingShippingStatuses(false);
    }
  };

  // 🚀 PROFESSIONAL SOLUTION: Extract ticket counts from orders response
  // No more separate API calls - ticket counts are included in the main orders query
  const extractTicketCountsFromOrders = (orders: Order[]) => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      // Extract ticket count from the _count field that's now included in the orders response
      counts[order.id] = order._count?.tickets || 0;
    });
    setOrderTicketCounts(counts);
    console.log('✅ Ticket counts extracted from orders response:', counts);
  };

  const fetchOrderTickets = async (orderId: string) => {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets?orderId=${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrderTickets(data.data?.tickets || []);
      } else {
        console.error('❌ Failed to fetch order tickets:', response.status);
        setOrderTickets([]);
      }
    } catch (error) {
      console.error('💥 Error fetching order tickets:', error);
      setOrderTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const viewOrderTickets = (order: Order) => {
    setSelectedOrderForTickets(order);
    setShowViewTicketsModal(true);
    fetchOrderTickets(order.id);
  };

  const viewTicketDetail = async (ticket: any) => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${ticket.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedTicketForView(data.data.ticket);
        setShowTicketDetailModal(true);
      } else {
        console.error('❌ Failed to fetch ticket details:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching ticket details:', error);
    }
  };

  const addTicketMessage = async () => {
    if (!selectedTicketForView || !newTicketMessage.trim()) return;

    setSendingTicketMessage(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${selectedTicketForView.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newTicketMessage.trim(),
          isInternal: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the selected ticket with the new message
        const updatedTicket = {
          ...selectedTicketForView,
          messages: [...(selectedTicketForView.messages || []), data.data.message]
        };
        setSelectedTicketForView(updatedTicket);
        
        setNewTicketMessage('');
        showToast({
          type: 'success',
          title: t('messageAddedSuccessfully')
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to add message:', response.status, errorText);
        showToast({
          type: 'error',
          title: t('failedToAddMessage')
        });
      }
    } catch (error) {
      console.error('💥 Error adding message:', error);
      showToast({
        type: 'error',
        title: t('failedToAddMessage')
      });
    } finally {
      setSendingTicketMessage(false);
    }
  };

  const createTicket = async () => {
    if (!ticketOrder || !ticketTitle.trim() || !ticketDescription.trim()) {
      return;
    }

    setCreatingTicket(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: ticketOrder.id,
          title: ticketTitle.trim(),
          category: ticketCategory,
          priority: ticketPriority,
          description: ticketDescription.trim(),
          assigneeId: ticketAssigneeId || undefined
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Ticket created successfully:', result);
        
        // Reset form and close modal
        setTicketTitle('');
        setTicketCategory('CUSTOMER_ISSUE');
        setTicketPriority('MEDIUM');
        setTicketDescription('');
        setTicketAssigneeId('');
        setShowTicketModal(false);
        setTicketOrder(null);
        
        // Update ticket count for this order
        setOrderTicketCounts(prev => ({
          ...prev,
          [ticketOrder.id]: (prev[ticketOrder.id] || 0) + 1
        }));
        
        // Show success toast notification
        showToast({
          type: 'success',
          title: t('ticketCreatedSuccessfully'),
          message: `Ticket created for order ${ticketOrder.reference}`
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create ticket:', response.status, errorText);
        showToast({
          type: 'error',
          title: t('failedToCreateTicket'),
          message: 'Please try again or contact support.'
        });
      }
    } catch (error) {
      console.error('💥 Error creating ticket:', error);
      showToast({
        type: 'error',
        title: t('failedToCreateTicket'),
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string, noteType?: string, customNote?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      console.log('🔄 Updating order status:', { orderId, newStatus, notes, noteType, customNote });
      
      const response = await fetch(`${apiBaseUrl}/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          notes,
          noteType,
          customNote
        })
      });
      
      console.log('📊 Status update response:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Status updated successfully:', result);
        fetchOrders();
        setSelectedOrder(null);
      } else {
        const errorText = await response.text();
        console.error('❌ Status update failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('💥 Error updating order status:', error);
    }
  };



  useEffect(() => {
    if (showTicketModal) {
      fetchAvailableAssignees();
    }
  }, [showTicketModal]);

  // Load pagination and filter settings from localStorage
  useEffect(() => {
    try {
      const savedPagination = localStorage.getItem('agentOrderPagination');
      if (savedPagination) {
        const pagination = JSON.parse(savedPagination);
        setLimit(pagination.limit || 25);
        setCurrentPage(pagination.currentPage || 1);
      }
      
      // Load filter settings
      const savedFilters = localStorage.getItem('agentOrderFilters');
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        setHideDeliveredOrders(filters.hideDeliveredOrders !== undefined ? filters.hideDeliveredOrders : true);
        setSelectedNoteTypes(filters.selectedNoteTypes || []);
        setShowOnlyOrdersWithNotes(filters.showOnlyOrdersWithNotes || false);
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }, []);

  // Save pagination settings to localStorage
  useEffect(() => {
    const pagination = {
      limit,
      currentPage
    };
    localStorage.setItem('agentOrderPagination', JSON.stringify(pagination));
  }, [limit, currentPage]);

  // Save filter settings to localStorage
  useEffect(() => {
    const filters = {
      hideDeliveredOrders,
      selectedNoteTypes,
      showOnlyOrdersWithNotes
    };
    localStorage.setItem('agentOrderFilters', JSON.stringify(filters));
  }, [hideDeliveredOrders, selectedNoteTypes, showOnlyOrdersWithNotes]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [search, statusFilter]);

  // 🚀 DEBOUNCED API CALLS - Prevent excessive requests
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedFetchData = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (user?.id) {
        console.log('🔄 Debounced fetch triggered');
        fetchOrders();
        // Only fetch agent stats every 30 seconds to reduce API calls
        const lastStatsFetch = sessionStorage.getItem('lastAgentStatsFetch');
        const now = Date.now();
        if (!lastStatsFetch || now - parseInt(lastStatsFetch) > 30000) {
          fetchAgentStats();
          sessionStorage.setItem('lastAgentStatsFetch', now.toString());
        }
      }
    }, 300); // 300ms debounce
  }, [user?.id, currentPage, limit, search, statusFilter, selectedShippingStatuses, sortBy, sortOrder, hideDeliveredOrders, selectedNoteTypes, showOnlyOrdersWithNotes]);

  // Trigger fetchOrders when filters change (with debouncing)
  useEffect(() => {
    debouncedFetchData();
    
    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [debouncedFetchData]);

  // Fetch shipping statuses on component mount
  useEffect(() => {
    fetchShippingStatuses();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showNoteTypeDropdown && !target.closest('.note-type-dropdown')) {
        setShowNoteTypeDropdown(false);
      }
      if (showStatusDropdown && !target.closest('.status-dropdown')) {
        setShowStatusDropdown(false);
      }
      if (showShippingStatusDropdown && !target.closest('.shipping-status-dropdown')) {
        setShowShippingStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNoteTypeDropdown, showStatusDropdown, showShippingStatusDropdown]);

  // Since we're doing server-side filtering, we don't need client-side filtering
  const filteredOrders = orders;

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

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const getShippingStatusColor = (status: string) => {
    return shippingStatusColors[status as keyof typeof shippingStatusColors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'ASSIGNED': return <Package className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />;
      case 'CONFIRMED': return <CheckCircle className="h-4 w-4" />;
      case 'SHIPPED': return <Truck className="h-4 w-4" />;
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      case 'RETURNED': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Function to get the last AGENT note from an order (excluding only specific system notes)
  const getLastNote = (order: Order) => {
    if (!order.notes) return null;
    
    try {
      const notesHistory = JSON.parse(order.notes);
      if (Array.isArray(notesHistory) && notesHistory.length > 0) {
        // Filter out only specific system-generated notes
        const agentNotes = notesHistory.filter(note => {
          const noteText = note.text || note.customNote || note.note || '';
          
          // Only exclude the specific system note mentioned by user
          const isSystemNote =
            noteText.includes('Last confirmation: Confirmation échouée');
            
          return !isSystemNote && noteText.trim().length > 0;
        });
        
        if (agentNotes.length > 0) {
          const lastNote = agentNotes[agentNotes.length - 1];
          return {
            text: lastNote.text || lastNote.customNote || lastNote.note || 'Note added',
            timestamp: lastNote.timestamp || lastNote.createdAt || order.createdAt,
            type: lastNote.type || lastNote.noteType || 'CUSTOM',
            addedBy: lastNote.addedBy || lastNote.user || 'Agent'
          };
        }
      }
    } catch (e) {
      // If parsing fails, treat as old format string only if it's not the specific system note
      if (typeof order.notes === 'string' && order.notes.trim()) {
        const noteText = order.notes.trim();
        const isSystemNote = noteText.includes('Last confirmation: Confirmation échouée');
          
        if (!isSystemNote) {
          return {
            text: noteText,
            timestamp: order.createdAt,
            type: 'CUSTOM',
            addedBy: 'Agent'
          };
        }
      }
    }
    
    return null;
  };

  // Function to format note type for display
  const formatNoteType = (type: string) => {
    const option = noteOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  // Function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">{t('loading')}</div>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('myAssignedOrders')}</h1>
            <p className="text-gray-600">{t('manageAssignedOrders')}</p>
          </div>
          <div className="text-sm text-gray-500">
            {totalCount > 0 ? (
              <>
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} {t('orders')}
                <div className="text-xs text-blue-600 mt-1">
                  Page {currentPage} of {totalPages}
                </div>
              </>
            ) : (
              <>
                {filteredOrders.length} / {totalAssignedOrders > 0 ? totalAssignedOrders : orders.length} {t('orders')}
                {totalAssignedOrders > orders.length && (
                  <div className="text-xs text-blue-600 mt-1">
                    Showing {orders.length} orders (filtered by product assignments)
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by reference, customer name, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="relative status-dropdown">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-4 py-4 bg-gray-50/50 border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-gray-700 font-medium hover:bg-gray-100"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">
                  {t('selectStatuses')} {statusFilter.length > 0 && !statusFilter.includes('ALL') && `(${statusFilter.length})`}
                </span>
                {showStatusDropdown ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Status Dropdown */}
              {showStatusDropdown && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">{t('selectStatuses')}</span>
                      <button
                        onClick={() => setStatusFilter(['ALL'])}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('clearSelection')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {statusOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={statusFilter.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStatusFilter([...statusFilter.filter(s => s !== 'ALL'), option.value]);
                                } else {
                                  const newFilter = statusFilter.filter(s => s !== option.value);
                                  setStatusFilter(newFilter.length === 0 ? ['ALL'] : newFilter);
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              statusFilter.includes(option.value)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 hover:border-blue-400'
                            }`}>
                              {statusFilter.includes(option.value) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Status Filter */}
            <div className="relative shipping-status-dropdown">
              <button
                onClick={() => setShowShippingStatusDropdown(!showShippingStatusDropdown)}
                className="flex items-center gap-2 px-4 py-4 bg-gray-50/50 border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-gray-700 font-medium hover:bg-gray-100"
              >
                <Truck className="w-4 h-4" />
                <span className="text-sm">
                  {t('selectShippingStatus')} {selectedShippingStatuses.length > 0 && `(${selectedShippingStatuses.length})`}
                </span>
                {showShippingStatusDropdown ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Shipping Status Dropdown */}
              {showShippingStatusDropdown && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">{t('selectShippingStatus')}</span>
                      <button
                        onClick={() => setSelectedShippingStatuses([])}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('clearSelection')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {loadingShippingStatuses ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-sm text-gray-500">Loading shipping statuses...</span>
                        </div>
                      ) : shippingStatusOptions.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No shipping statuses found
                        </div>
                      ) : (
                        shippingStatusOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedShippingStatuses.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedShippingStatuses([...selectedShippingStatuses, option.value]);
                                } else {
                                  setSelectedShippingStatuses(selectedShippingStatuses.filter(s => s !== option.value));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedShippingStatuses.includes(option.value)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 hover:border-blue-400'
                            }`}>
                              {selectedShippingStatuses.includes(option.value) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
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

            {/* Hide Delivered Orders Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHideDeliveredOrders(!hideDeliveredOrders)}
                className={`flex items-center gap-2 px-4 py-4 rounded-2xl transition-all duration-200 ${
                  hideDeliveredOrders
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-50/50 text-gray-600 border border-gray-200/50 hover:bg-gray-100'
                }`}
              >
                {hideDeliveredOrders ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{t('hideDeliveredOrders')}</span>
              </button>
            </div>

            {/* Show Only Orders With Notes Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOnlyOrdersWithNotes(!showOnlyOrdersWithNotes)}
                className={`flex items-center gap-2 px-4 py-4 rounded-2xl transition-all duration-200 ${
                  showOnlyOrdersWithNotes
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                    : 'bg-gray-50/50 text-gray-600 border border-gray-200/50 hover:bg-gray-100'
                }`}
              >
                {showOnlyOrdersWithNotes ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <StickyNote className="w-4 h-4" />
                <span className="text-sm font-medium">{t('withNotesOnly')}</span>
              </button>
            </div>

            {/* Note Types Filter */}
            <div className="relative note-type-dropdown">
              <button
                onClick={() => setShowNoteTypeDropdown(!showNoteTypeDropdown)}
                className="flex items-center gap-2 px-4 py-4 bg-gray-50/50 border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-gray-700 font-medium hover:bg-gray-100"
              >
                <StickyNote className="w-4 h-4" />
                <span className="text-sm">
                  {t('noteTypes')} {selectedNoteTypes.length > 0 && `(${selectedNoteTypes.length})`}
                </span>
                {showNoteTypeDropdown ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Note Types Dropdown */}
              {showNoteTypeDropdown && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">{t('selectNoteTypes')}</span>
                      <button
                        onClick={() => setSelectedNoteTypes([])}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('clearSelection')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {noteOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedNoteTypes.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedNoteTypes([...selectedNoteTypes, option.value]);
                                } else {
                                  setSelectedNoteTypes(selectedNoteTypes.filter(type => type !== option.value));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              selectedNoteTypes.includes(option.value)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedNoteTypes.includes(option.value) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No orders found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || (statusFilter.length > 0 && !statusFilter.includes('ALL'))
                  ? 'Try adjusting your search or filters' 
                  : 'Orders will appear here when assigned to you'
                }
              </p>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="font-semibold text-xl">{order.reference}</h3>
                      <Badge className={`${getStatusColor(order.status)} flex items-center space-x-1`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>
                      </Badge>
                      {order.shippingStatus && (
                        <Badge className={`${getShippingStatusColor(order.shippingStatus)} flex items-center space-x-1`}>
                          <Truck className="h-3 w-3" />
                          <span className="text-xs">{order.shippingStatus}</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{order.customer.fullName}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{order.customer.telephone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{order.customer.wilaya}, {order.customer.commune}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(order.assignedAt)}</span>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Truck className="h-4 w-4" />
                          <span>{order.trackingNumber}</span>
                        </div>
                      )}
                      {order.ecoManagerId && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Package className="h-4 w-4" />
                          <span>ECO: {order.ecoManagerId}</span>
                        </div>
                      )}
                    </div>

                    {/* Alert indicators */}
                    {(order.alertReason || order.abortReason) && (
                      <div className="flex items-center space-x-2 mb-3">
                        {order.alertReason && (
                          <Badge className="bg-yellow-100 text-yellow-800 flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-xs">{order.alertReason}</span>
                          </Badge>
                        )}
                        {order.abortReason && (
                          <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
                            <XCircle className="h-3 w-3" />
                            <span className="text-xs">{order.abortReason}</span>
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Last Note Display */}
                    {(() => {
                      const lastNote = getLastNote(order);
                      return lastNote ? (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <StickyNote className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded-full">
                                  {formatNoteType(lastNote.type)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(lastNote.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                                {lastNote.text || 'No details provided'}
                              </p>
                              {lastNote.addedBy && (
                                <div className="flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{lastNote.addedBy}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="font-bold text-xl">{formatCurrency(order.total)}</div>
                    <div className="text-sm text-gray-500">
                      {order._count?.items || order.items?.length || 0} {t('items')}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{t('viewDetails')}</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingStatus(order.id);
                        setNewStatus(order.status);
                        setStatusNotes('');
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>{t('editStatus')}</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setTicketOrder(order);
                        setTicketTitle(`Problem with order ${order.reference}`);
                        setShowTicketModal(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{t('reportAProblem')}</span>
                    </Button>
                    {orderTicketCounts[order.id] > 0 && (
                      <Button
                        onClick={() => viewOrderTickets(order)}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{t('viewTickets')} ({orderTicketCounts[order.id]})</span>
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('orderDate')}: {formatDate(order.orderDate || order.createdAt)}
                  </div>
                </div>
              </Card>
            ))
          )}
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

        {/* Enhanced Status Edit Modal with Structured Notes */}
        {editingStatus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('updateOrderStatus')}</h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingStatus(null);
                    setNewStatus('');
                    setStatusNotes('');
                    setNoteType('');
                    setCustomNote('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('newStatus')}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
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
                    Type de Note
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => {
                      setNoteType(e.target.value);
                      if (e.target.value !== 'CUSTOM') {
                        setCustomNote('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Sélectionner un type de note...</option>
                    {noteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show custom note field if needed */}
                {(noteType && noteOptions.find(opt => opt.value === noteType)?.hasRemark) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {noteType === 'CUSTOM' ? 'Note personnalisée' : 'Remarque'}
                    </label>
                    <textarea
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder={noteType === 'CUSTOM' ? 'Entrez votre note personnalisée...' : 'Entrez votre remarque...'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes supplémentaires ({t('optional')})
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Notes internes supplémentaires..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setEditingStatus(null);
                      setNewStatus('');
                      setStatusNotes('');
                      setNoteType('');
                      setCustomNote('');
                    }}
                    variant="outline"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      updateOrderStatus(editingStatus, newStatus, statusNotes, noteType, customNote);
                      setEditingStatus(null);
                      setNewStatus('');
                      setStatusNotes('');
                      setNoteType('');
                      setCustomNote('');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {t('updateStatus')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Order Details Modal */}
        {selectedOrder && showOrderModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowOrderModal(false)} />
              
              <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {t('orderDetails')} - {selectedOrder.reference}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedOrder.ecoManagerId && `EcoManager ID: ${selectedOrder.ecoManagerId}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Information */}
                    <Card className="p-6">
                      <div className="flex items-center mb-4">
                        <Package className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-semibold">{t('orderInformation')}</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('status')}:</span>
                          <Badge className={getStatusColor(selectedOrder.status)}>
                            {selectedOrder.status}
                          </Badge>
                        </div>
                        
                        {selectedOrder.shippingStatus && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('shippingStatus')}:</span>
                            <Badge className={getShippingStatusColor(selectedOrder.shippingStatus)}>
                              {selectedOrder.shippingStatus}
                            </Badge>
                          </div>
                        )}
                        
                        {selectedOrder.trackingNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('trackingNumber')}:</span>
                            <span className="font-semibold">{selectedOrder.trackingNumber}</span>
                          </div>
                        )}
                        
                        {selectedOrder.maystroOrderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Maystro ID:</span>
                            <span className="font-mono text-sm">{selectedOrder.maystroOrderId}</span>
                          </div>
                        )}
                        
                        {selectedOrder.alertedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Alerted At:</span>
                            <span className="text-sm">{formatDate(selectedOrder.alertedAt)}</span>
                          </div>
                        )}
                        
                        {selectedOrder.alertReason && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Alert Reason:</span>
                            <Badge className="bg-orange-100 text-orange-800">
                              {selectedOrder.alertReason}
                            </Badge>
                          </div>
                        )}
                        
                        {selectedOrder.abortReason && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Abort Reason:</span>
                            <Badge className="bg-red-100 text-red-800">
                              {selectedOrder.abortReason}
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('total')}:</span>
                          <span className="font-semibold">{formatCurrency(selectedOrder.total)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('orderDate')}:</span>
                          <span>{formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('items')}:</span>
                          <span>{selectedOrder._count?.items || selectedOrder.items?.length || 0}</span>
                        </div>

                        {selectedOrder.notes && (
                          <div className="pt-2 border-t">
                            <span className="text-gray-600">Historique des Notes:</span>
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                              {(() => {
                                try {
                                  const notesHistory = JSON.parse(selectedOrder.notes);
                                  return notesHistory.map((note: any, index: number) => (
                                    <div key={note.id || index} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-medium text-blue-600">
                                          {note.agentName || 'Agent'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(note.timestamp).toLocaleString('fr-FR')}
                                        </span>
                                      </div>
                                      {note.type && note.type !== 'CUSTOM' && (
                                        <div className="text-sm font-medium text-gray-700 mb-1">
                                          {noteOptions.find(opt => opt.value === note.type)?.label || note.type}
                                        </div>
                                      )}
                                      {note.note && (
                                        <p className="text-sm text-gray-600">{note.note}</p>
                                      )}
                                      {note.statusChange && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Statut: {note.statusChange.from} → {note.statusChange.to}
                                        </div>
                                      )}
                                    </div>
                                  ));
                                } catch (e) {
                                  // Fallback for old format notes
                                  return (
                                    <p className="text-sm p-2 bg-gray-50 rounded">{selectedOrder.notes}</p>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Customer Information */}
                    <Card className="p-6">
                      <div className="flex items-center mb-4">
                        <User className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="text-lg font-semibold">{t('customerInformation')}</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-600">{t('name')}:</span>
                          <p className="font-semibold">{selectedOrder.customer.fullName}</p>
                        </div>
                        
                        <div>
                          <span className="text-gray-600">{t('phone')}:</span>
                          <p className="font-semibold">{selectedOrder.customer.telephone}</p>
                        </div>
                        
                        {selectedOrder.customer.email && (
                          <div>
                            <span className="text-gray-600">{t('email')}:</span>
                            <p className="font-semibold">{selectedOrder.customer.email}</p>
                          </div>
                        )}
                        
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-1" />
                          <div>
                            <p className="font-semibold">{selectedOrder.customer.wilaya}</p>
                            <p className="text-gray-600">{selectedOrder.customer.commune}</p>
                            {selectedOrder.customer.address && (
                              <p className="text-sm text-gray-500">{selectedOrder.customer.address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Maystro Metadata */}
                    {selectedOrder.additionalMetaData && (
                      <Card className="p-6 lg:col-span-2">
                        <div className="flex items-center mb-4">
                          <Package className="w-5 h-5 text-indigo-600 mr-2" />
                          <h3 className="text-lg font-semibold">Maystro Metadata</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedOrder.additionalMetaData.customer_name && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Customer Name:</span>
                              <p className="font-semibold">{selectedOrder.additionalMetaData.customer_name}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.customer_phone && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Customer Phone:</span>
                              <p className="font-semibold">{selectedOrder.additionalMetaData.customer_phone}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.destination_text && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Destination:</span>
                              <p className="font-semibold">{selectedOrder.additionalMetaData.destination_text}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.product_name && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Product Name:</span>
                              <p className="font-semibold">{selectedOrder.additionalMetaData.product_name}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.product_price && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Product Price:</span>
                              <p className="font-semibold">{formatCurrency(selectedOrder.additionalMetaData.product_price)}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.wilaya && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Wilaya:</span>
                              <p className="font-semibold">{selectedOrder.additionalMetaData.wilaya}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.commune_name && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Commune:</span>
                              <p className="font-semibold">{selectedOrder.additionalMetaData.commune_name}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.ordered_at && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Ordered At:</span>
                              <p className="font-semibold">{formatDate(selectedOrder.additionalMetaData.ordered_at)}</p>
                            </div>
                          )}
                          
                          {selectedOrder.additionalMetaData.delivered_at && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm text-gray-600">Delivered At:</span>
                              <p className="font-semibold">{formatDate(selectedOrder.additionalMetaData.delivered_at)}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Order Items */}
                    <Card className="p-6 lg:col-span-2">
                      <div className="flex items-center mb-4">
                        <Package className="w-5 h-5 text-orange-600 mr-2" />
                        <h3 className="text-lg font-semibold">{t('orderItems')}</h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2">{t('product')}</th>
                              <th className="text-center py-2">{t('quantity')}</th>
                              <th className="text-right py-2">{t('unitPrice')}</th>
                              <th className="text-right py-2">{t('total')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrder.items?.map((item: any, index: number) => (
                              <tr key={item.id || index} className="border-b border-gray-100">
                                <td className="py-3">
                                  <div>
                                    <p className="font-medium">{item.title}</p>
                                    {item.sku && (
                                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                                    )}
                                    {item.productId && (
                                      <p className="text-sm text-gray-400">ID: {item.productId}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-3">{item.quantity}</td>
                                <td className="text-right py-3">{formatCurrency(item.unitPrice)}</td>
                                <td className="text-right py-3 font-semibold">{formatCurrency(item.totalPrice || item.quantity * item.unitPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card className="p-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4">{t('actions')}</h3>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => {
                          setEditingStatus(selectedOrder.id);
                          setNewStatus(selectedOrder.status);
                          setStatusNotes('');
                          setShowOrderModal(false);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>{t('editStatus')}</span>
                      </Button>
                      
                      {selectedOrder.status === 'ASSIGNED' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, 'IN_PROGRESS');
                            setShowOrderModal(false);
                          }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {t('startProcessing')}
                        </Button>
                      )}
                      
                      {selectedOrder.status === 'IN_PROGRESS' && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, 'CONFIRMED');
                            setShowOrderModal(false);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {t('confirmOrder')}
                        </Button>
                      )}
                      
                      {(selectedOrder.status === 'ASSIGNED' || selectedOrder.status === 'IN_PROGRESS') && (
                        <Button
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, 'CANCELLED', 'Cancelled by agent');
                            setShowOrderModal(false);
                          }}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {t('cancelOrder')}
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Creation Modal */}
        {showTicketModal && ticketOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('reportAProblem')}</h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTicketModal(false);
                    setTicketOrder(null);
                    setTicketTitle('');
                    setTicketCategory('CUSTOMER_ISSUE');
                    setTicketPriority('MEDIUM');
                    setTicketDescription('');
                    setTicketAssigneeId('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Order Information */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-medium text-sm text-gray-700 mb-2">Order Information</h3>
                  <div className="text-sm">
                    <div><strong>Reference:</strong> {ticketOrder.reference}</div>
                    <div><strong>Customer:</strong> {ticketOrder.customer.fullName}</div>
                    <div><strong>Phone:</strong> {ticketOrder.customer.telephone}</div>
                  </div>
                </div>

                {/* Ticket Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ticketTitle')} *
                  </label>
                  <input
                    type="text"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Brief description of the problem"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ticketCategory')} *
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="CUSTOMER_ISSUE">{t('customerIssue')}</option>
                    <option value="PRODUCT_ISSUE">{t('productIssue')}</option>
                    <option value="DELIVERY_ISSUE">{t('deliveryIssue')}</option>
                    <option value="SYSTEM_ISSUE">{t('systemIssue')}</option>
                    <option value="PAYMENT_ISSUE">{t('paymentIssue')}</option>
                    <option value="OTHER">{t('otherIssue')}</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ticketPriority')} *
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="LOW">{t('lowPriority')}</option>
                    <option value="MEDIUM">{t('mediumPriority')}</option>
                    <option value="HIGH">{t('highPriority')}</option>
                    <option value="URGENT">{t('urgentPriority')}</option>
                  </select>
                </div>

                {/* Assign To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('assignTo')} (Optional)
                  </label>
                  <select
                    value={ticketAssigneeId}
                    onChange={(e) => setTicketAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">{t('autoAssign')}</option>
                    {availableAssignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name} ({assignee.role === 'COORDINATEUR' ? t('coordinator') : t('teamLeader')})
                        {assignee.agentCode && ` - ${assignee.agentCode}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('ticketDescription')} *
                  </label>
                  <textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Describe the problem in detail..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTicketModal(false);
                    setTicketOrder(null);
                    setTicketTitle('');
                    setTicketCategory('CUSTOMER_ISSUE');
                    setTicketPriority('MEDIUM');
                    setTicketDescription('');
                    setTicketAssigneeId('');
                  }}
                  disabled={creatingTicket}
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={createTicket}
                  disabled={creatingTicket || !ticketTitle.trim() || !ticketDescription.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {creatingTicket ? t('loading') : t('createTicket')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* View Order Tickets Modal */}
        {showViewTicketsModal && selectedOrderForTickets && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold">Tickets for Order {selectedOrderForTickets.reference}</h2>
                  <p className="text-sm text-gray-600">Customer: {selectedOrderForTickets.customer.fullName}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewTicketsModal(false);
                    setSelectedOrderForTickets(null);
                    setOrderTickets([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {loadingTickets ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-gray-500">{t('loading')}</div>
                  </div>
                ) : orderTickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No tickets found for this order</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderTickets.map((ticket) => (
                      <Card key={ticket.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{ticket.title}</h3>
                            <p className="text-sm text-gray-600">{ticket.description}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={`${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={`${ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <Button
                            onClick={() => viewTicketDetail(ticket)}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Details</span>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {showTicketDetailModal && selectedTicketForView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold">{selectedTicketForView.title}</h2>
                  <p className="text-sm text-gray-600">Order: {selectedTicketForView.order?.reference}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTicketDetailModal(false);
                    setSelectedTicketForView(null);
                    setNewTicketMessage('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex h-[70vh]">
                {/* Left side - Ticket info */}
                <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Status & Priority</h3>
                      <div className="space-y-2">
                        <Badge className={`${selectedTicketForView.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                          selectedTicketForView.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                          selectedTicketForView.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} w-full justify-center`}>
                          {selectedTicketForView.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={`${selectedTicketForView.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          selectedTicketForView.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} w-full justify-center`}>
                          {selectedTicketForView.priority} Priority
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Category:</strong> {selectedTicketForView.category?.replace('_', ' ')}</div>
                        <div><strong>Reporter:</strong> {selectedTicketForView.reporter?.name}</div>
                        <div><strong>Created:</strong> {new Date(selectedTicketForView.createdAt).toLocaleDateString()}</div>
                        {selectedTicketForView.assignee && (
                          <div><strong>Assigned to:</strong> {selectedTicketForView.assignee.name}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {selectedTicketForView.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side - Messages */}
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="font-medium">Messages ({selectedTicketForView.messages?.length || 0})</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedTicketForView.messages?.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No messages yet</p>
                      </div>
                    ) : (
                      selectedTicketForView.messages?.map((message: any) => (
                        <div key={message.id} className="flex space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {message.sender?.name?.charAt(0) || 'U'}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">{message.sender?.name || 'Unknown'}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleString()}
                              </span>
                              {message.isInternal && (
                                <Badge variant="secondary" className="text-xs">Internal</Badge>
                              )}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm">{message.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message input */}
                  <div className="border-t p-4">
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newTicketMessage}
                        onChange={(e) => setNewTicketMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !sendingTicketMessage && newTicketMessage.trim()) {
                            addTicketMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={addTicketMessage}
                        disabled={sendingTicketMessage || !newTicketMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {sendingTicketMessage ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}