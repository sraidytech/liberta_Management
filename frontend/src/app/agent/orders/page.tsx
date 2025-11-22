'use client';

import AgentLayout from '@/components/agent/agent-layout';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { useToast } from '@/components/ui/toast';
import { SatisfactionSurveyForm } from '@/components/satisfaction/satisfaction-survey-form';
import {
  calculateOrderDelay,
  getDelayCardClasses,
  getDelayBadgeProps,
  type OrderDelayInfo,
  type WilayaDeliverySettings
} from '@/lib/delivery-delay-utils';
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
  X as XIcon,
  Star
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
  delayInfo?: OrderDelayInfo;
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

function AgentOrdersPageContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderTicketCounts, setOrderTicketCounts] = useState<Record<string, number>>({});
  const [totalAssignedOrders, setTotalAssignedOrders] = useState<number>(0);
  const [loading, setLoading] = useState(true);
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
  
  // Date filtering state (matching admin implementation)
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteType, setNoteType] = useState('');
  const [customNote, setCustomNote] = useState('');
  
  // Add Note Only modal state
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [addingNoteToOrder, setAddingNoteToOrder] = useState<string | null>(null);
  const [noteOnlyType, setNoteOnlyType] = useState('');
  const [noteOnlyCustom, setNoteOnlyCustom] = useState('');
  const [noteOnlyText, setNoteOnlyText] = useState('');
  
  // Wilaya delivery settings for delay calculation
  const [wilayaSettings, setWilayaSettings] = useState<WilayaDeliverySettings[]>([]);
  
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

  // Satisfaction survey state
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  // Dynamic note options loaded from API
  const [noteOptions, setNoteOptions] = useState<Array<{ value: string; label: string; hasRemark?: boolean }>>([]);
  const [loadingNoteTypes, setLoadingNoteTypes] = useState(false);

  // Fetch note types from API
  const fetchNoteTypes = async () => {
    try {
      setLoadingNoteTypes(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/note-types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const noteTypes = data.data?.noteTypes || [];
        
        // Transform API response to match the expected format
        const transformedNoteTypes = noteTypes.map((noteType: any) => ({
          value: noteType.name,
          label: noteType.name,
          // For backward compatibility, we'll keep the hasRemark logic for specific note types
          hasRemark: noteType.name.includes('REPORTER') ||
                    noteType.name.includes('ANNULE') ||
                    noteType.name.includes('Problem') ||
                    noteType.name.includes('personnalisé')
        }));
        
        setNoteOptions(transformedNoteTypes);
        console.log('✅ Note types loaded:', transformedNoteTypes);
      } else {
        console.error('❌ Failed to fetch note types:', response.status);
        // Fallback to empty array if API fails
        setNoteOptions([]);
      }
    } catch (error) {
      console.error('💥 Error fetching note types:', error);
      // Fallback to empty array if API fails
      setNoteOptions([]);
    } finally {
      setLoadingNoteTypes(false);
    }
  };

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
      
      // 🚀 FIXED: Connect date range filter to backend API (filters by orderDate)
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
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
        showToast({ title: 'Success', message: 'Order status updated successfully', type: 'success' });
      } else {
        const errorText = await response.text();
        console.error('❌ Status update failed:', response.status, errorText);
        showToast({ title: 'Error', message: 'Failed to update order status', type: 'error' });
      }
    } catch (error) {
      console.error('💥 Error updating order status:', error);
      showToast({ title: 'Error', message: 'Error updating order status', type: 'error' });
    }
  };

  const addNoteOnly = async (orderId: string, notes?: string, noteType?: string, customNote?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      console.log('📝 Adding note only:', { orderId, notes, noteType, customNote });
      
      const response = await fetch(`${apiBaseUrl}/api/v1/orders/${orderId}/notes`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes,
          noteType,
          customNote
        })
      });
      
      console.log('📊 Add note response:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Note added successfully:', result);
        fetchOrders();
        setSelectedOrder(null);
        showToast({ title: 'Success', message: 'Note added successfully', type: 'success' });
      } else {
        const errorText = await response.text();
        console.error('❌ Add note failed:', response.status, errorText);
        showToast({ title: 'Error', message: 'Failed to add note', type: 'error' });
      }
    } catch (error) {
      console.error('💥 Error adding note:', error);
      showToast({ title: 'Error', message: 'Error adding note', type: 'error' });
    }
  };
  // Fetch existing satisfaction survey for an order
  const fetchExistingSurvey = async (orderId: string) => {
    if (!orderId) return;
    
    try {
      setLoadingSurvey(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/satisfaction-surveys/order/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok || response.status === 304) {
        // Handle both 200 and 304 responses
        try {
          const result = await response.json();
          console.log('Survey fetch result:', result);
          // Backend returns { success: true, data: survey } - survey is directly in data
          setExistingSurvey(result.data || null);
        } catch (e) {
          // If JSON parsing fails on 304, try fetching again without cache
          console.log('Retrying survey fetch without cache...');
          const retryResponse = await fetch(`${apiBaseUrl}/api/v1/satisfaction-surveys/order/${orderId}?t=${Date.now()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            console.log('Retry survey fetch result:', retryResult);
            setExistingSurvey(retryResult.data || null);
          } else {
            setExistingSurvey(null);
          }
        }
      } else if (response.status === 404) {
        // No survey exists yet - this is normal
        setExistingSurvey(null);
      } else {
        console.error('Failed to fetch survey:', response.status);
        setExistingSurvey(null);
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
      setExistingSurvey(null);
    } finally {
      setLoadingSurvey(false);
    }
  };

  // Handle survey submission success
  const handleSurveySuccess = () => {
    setShowSurveyForm(false);
    if (selectedOrder) {
      fetchExistingSurvey(selectedOrder.id);
    }
    showToast({
      type: 'success',
      title: 'Survey Submitted',
      message: 'Customer satisfaction survey has been recorded successfully'
    });
  };




  useEffect(() => {
    if (showTicketModal) {
      fetchAvailableAssignees();
    }
  }, [showTicketModal]);
  // Fetch survey when order modal opens for delivered orders
  useEffect(() => {
    if (showOrderModal && selectedOrder) {
      const isDelivered = selectedOrder.status === 'DELIVERED' || selectedOrder.shippingStatus === 'LIVRÉ';
      if (isDelivered) {
        fetchExistingSurvey(selectedOrder.id);
      } else {
        setExistingSurvey(null);
        setShowSurveyForm(false);
      }
    } else {
      setExistingSurvey(null);
      setShowSurveyForm(false);
    }
  }, [showOrderModal, selectedOrder?.id]);


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

  // Fetch note types on component mount
  useEffect(() => {
    fetchNoteTypes();
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

  // Handle URL search parameters
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

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
  }, [user?.id, currentPage, limit, search, statusFilter, selectedShippingStatuses, sortBy, sortOrder, hideDeliveredOrders, selectedNoteTypes, showOnlyOrdersWithNotes, dateRange]);

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
    fetchWilayaSettings();
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
      <div className="bg-gray-50 min-h-screen">
        <div className="p-6 space-y-6">
          {/* Clean Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('myAssignedOrders')}</h1>
                <p className="text-gray-600 mt-1">{t('manageAssignedOrders')}</p>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 rounded-lg px-4 py-2">
                {totalCount > 0 ? (
                  <div>
                    <div className="font-medium">
                      {t('showingOrdersFiltered').replace('{count}', `${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, totalCount)} of ${totalCount}`)} {t('orders')}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {t('pageOf').replace('{current}', currentPage.toString()).replace('{total}', totalPages.toString())}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">
                      {filteredOrders.length} / {totalAssignedOrders > 0 ? totalAssignedOrders : orders.length} {t('orders')}
                    </div>
                    {totalAssignedOrders > orders.length && (
                      <div className="text-xs text-blue-600 mt-1">
                        {t('showingOrdersFiltered').replace('{count}', orders.length.toString())}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clean Filter Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Primary Filter Row */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchByReference')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                {/* Status Filter */}
                <div className="relative status-dropdown">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Status {statusFilter.length > 0 && !statusFilter.includes('ALL') && (
                        <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          {statusFilter.length}
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Status Dropdown */}
                  {showStatusDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-800">{t('selectStatuses')}</span>
                          <button
                            onClick={() => setStatusFilter(['ALL'])}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {statusOptions.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
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
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{option.label}</span>
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
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <Truck className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Shipping {selectedShippingStatuses.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          {selectedShippingStatuses.length}
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showShippingStatusDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Shipping Status Dropdown */}
                  {showShippingStatusDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-800">{t('selectShippingStatus')}</span>
                          <button
                            onClick={() => setSelectedShippingStatuses([])}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {loadingShippingStatuses ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                              <span className="ml-2 text-sm text-gray-500">{t('loading')}</span>
                            </div>
                          ) : shippingStatusOptions.length === 0 ? (
                            <div className="text-center py-4 text-sm text-gray-500">
                              {t('noShippingStatusesFound')}
                            </div>
                          ) : (
                            shippingStatusOptions.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
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
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Controls Row */}
            <div className="flex flex-wrap gap-3">
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Start Date"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="End Date"
                />
                {(dateRange.start || dateRange.end) && (
                  <button
                    onClick={() => setDateRange({ start: '', end: '' })}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear date filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Items Per Page */}
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              >
                <option value={10}>10 items</option>
                <option value={25}>25 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
              </select>

              {/* Page Jump */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Page:</span>
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
                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm"
                />
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </div>

              {/* Toggle Buttons */}
              <button
                onClick={() => setHideDeliveredOrders(!hideDeliveredOrders)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hideDeliveredOrders
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {hideDeliveredOrders ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {t('hideDelivered')}
              </button>

              <button
                onClick={() => setShowOnlyOrdersWithNotes(!showOnlyOrdersWithNotes)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showOnlyOrdersWithNotes
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showOnlyOrdersWithNotes ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <StickyNote className="w-4 h-4" />
                With Notes
              </button>

              {/* Note Types Filter */}
              <div className="relative note-type-dropdown">
                <button
                  onClick={() => setShowNoteTypeDropdown(!showNoteTypeDropdown)}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <StickyNote className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Note Types {selectedNoteTypes.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                        {selectedNoteTypes.length}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNoteTypeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Note Types Dropdown */}
                {showNoteTypeDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-800">{t('selectNoteTypes')}</span>
                        <button
                          onClick={() => setSelectedNoteTypes([])}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {noteOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
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
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clean Card-Based Orders List */}
          <div className="space-y-3">
            {/* Deadline Notification Banner */}
            {(() => {
              // 🚀 ENHANCED: Filter urgent orders with exclusions for "Annulation final" and "CANCELLED"
              const urgentOrders = filteredOrders.filter(order => {
                // Exclude CANCELLED orders
                if (order.status === 'CANCELLED') return false;
                
                // Exclude orders with "Annulation final" in notes
                if (order.notes?.includes('Annulation final') ||
                    order.internalNotes?.includes('Annulation final')) return false;
                
                const delayInfo = order.delayInfo || calculateOrderDelay(
                  order.id,
                  order.customer.wilaya,
                  order.orderDate,
                  order.shippingStatus,
                  wilayaSettings
                );
                return delayInfo.isDelayed && !delayInfo.isDelivered;
              });
              
              const criticalOrders = urgentOrders.filter(order => {
                const delayInfo = order.delayInfo || calculateOrderDelay(
                  order.id,
                  order.customer.wilaya,
                  order.orderDate,
                  order.shippingStatus,
                  wilayaSettings
                );
                return delayInfo.delayLevel === 'critical';
              });
              
              const warningOrders = urgentOrders.filter(order => {
                const delayInfo = order.delayInfo || calculateOrderDelay(
                  order.id,
                  order.customer.wilaya,
                  order.orderDate,
                  order.shippingStatus,
                  wilayaSettings
                );
                return delayInfo.delayLevel === 'warning';
              });
              
              if (urgentOrders.length === 0) return null;
              
              return (
                <div className="mb-6 p-4 rounded-lg border-l-4 border-red-500 bg-red-50 animate-pulse">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 animate-bounce" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">
                        🚨 URGENT: {urgentOrders.length} orders need attention
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        {criticalOrders.length > 0 && warningOrders.length > 0 && (
                          `${criticalOrders.length} CRITICAL orders overdue, ${warningOrders.length} WARNING orders approaching deadline.`
                        )}
                        {criticalOrders.length > 0 && warningOrders.length === 0 && (
                          `${criticalOrders.length} orders are overdue and need immediate attention.`
                        )}
                        {criticalOrders.length === 0 && warningOrders.length > 0 && (
                          `${warningOrders.length} orders are approaching their delivery deadline.`
                        )}
                        <br />
                        <span className="font-medium">Click on any order to view details: </span>
                        {urgentOrders.map((order, index) => (
                          <span key={order.id}>
                            <button
                              onClick={() => {
                                const orderElement = document.querySelector(`[data-order-id="${order.id}"]`);
                                if (orderElement) {
                                  orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  // Add highlight effect
                                  orderElement.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');
                                  setTimeout(() => {
                                    orderElement.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
                                  }, 3000);
                                }
                              }}
                              className="text-red-800 hover:text-red-900 hover:underline font-semibold cursor-pointer transition-colors"
                            >
                              #{order.reference}
                            </button>
                            {index < urgentOrders.length - 1 && ', '}
                          </span>
                        ))}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Show first urgent order
                        if (urgentOrders.length > 0) {
                          const firstOrder = urgentOrders[0];
                          const orderElement = document.querySelector(`[data-order-id="${firstOrder.id}"]`);
                          if (orderElement) {
                            orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            orderElement.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');
                            setTimeout(() => {
                              orderElement.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
                            }, 3000);
                          }
                        }
                      }}
                      className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                    >
                      View First
                    </button>
                  </div>
                </div>
              );
            })()}

            {(() => {
              // 🚀 NEW: ALERTÉ Orders Alert Component
              const alerteOrders = filteredOrders.filter(order => {
                // Only include orders with ALERTÉ shipping status
                if (order.shippingStatus !== 'ALERTÉ') return false;
                
                // Exclude CANCELLED orders
                if (order.status === 'CANCELLED') return false;
                
                // Exclude orders with "Annulation final" in notes
                if (order.notes?.includes('Annulation final') ||
                    order.internalNotes?.includes('Annulation final')) return false;
                
                return true;
              });
              
              if (alerteOrders.length === 0) return null;
              
              return (
                <div className="mb-6 p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800">
                        ⚠️ ALERTÉ: {alerteOrders.length} orders need attention
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        <span className="font-medium">Orders with ALERTÉ shipping status - Click to view: </span>
                        {alerteOrders.map((order, index) => (
                          <span key={order.id}>
                            <button
                              onClick={() => {
                                const orderElement = document.querySelector(`[data-order-id="${order.id}"]`);
                                if (orderElement) {
                                  orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  // Add highlight effect
                                  orderElement.classList.add('ring-2', 'ring-yellow-500', 'ring-opacity-75');
                                  setTimeout(() => {
                                    orderElement.classList.remove('ring-2', 'ring-yellow-500', 'ring-opacity-75');
                                  }, 3000);
                                }
                              }}
                              className="text-yellow-800 hover:text-yellow-900 hover:underline font-semibold cursor-pointer transition-colors"
                            >
                              #{order.reference}
                            </button>
                            {index < alerteOrders.length - 1 && ', '}
                          </span>
                        ))}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Show first ALERTÉ order
                        if (alerteOrders.length > 0) {
                          const firstOrder = alerteOrders[0];
                          const orderElement = document.querySelector(`[data-order-id="${firstOrder.id}"]`);
                          if (orderElement) {
                            orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            orderElement.classList.add('ring-2', 'ring-yellow-500', 'ring-opacity-75');
                            setTimeout(() => {
                              orderElement.classList.remove('ring-2', 'ring-yellow-500', 'ring-opacity-75');
                            }, 3000);
                          }
                        }
                      }}
                      className="ml-4 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                    >
                      View First
                    </button>
                  </div>
                </div>
              );
            })()}

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No orders found</h3>
                <p className="text-gray-600">
                  {search || (statusFilter.length > 0 && !statusFilter.includes('ALL'))
                    ? t('tryAdjustingSearchOrFilters')
                    : t('ordersWillAppearWhenAssigned')
                  }
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                // Calculate delay info if not provided by backend
                const delayInfo = order.delayInfo || calculateOrderDelay(
                  order.id,
                  order.customer.wilaya,
                  order.orderDate,
                  order.shippingStatus,
                  wilayaSettings
                );
                
                // Get delay-based card classes
                const delayClasses = getDelayCardClasses(delayInfo);
                
                // Combine all classes
                const cardClasses = [
                  'bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow',
                  delayClasses || 'border-gray-200'
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={order.id}
                    data-order-id={order.id}
                    className={cardClasses}
                  >
                  {/* Header Row */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{order.reference}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {order.shippingStatus && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getShippingStatusColor(order.shippingStatus)}`}>
                            {order.shippingStatus}
                          </span>
                        )}
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
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(order.total)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order._count?.items || order.items?.length || 0} items
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Row - Single Row with Icons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="text-xs text-gray-500">Customer</div>
                        <div className="font-medium text-gray-900">{order.customer.fullName}</div>
                        <div className="text-sm text-gray-600">{order.customer.telephone}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-xs text-gray-500">Location</div>
                        <div className="font-medium text-gray-900">{order.customer.wilaya}</div>
                        <div className="text-sm text-gray-600">{order.customer.commune}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="text-xs text-gray-500">Assigned</div>
                        <div className="text-sm text-gray-900">{formatDate(order.assignedAt)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="text-xs text-gray-500">Order Date</div>
                        <div className="text-sm text-gray-900">{formatDate(order.orderDate || order.createdAt)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Alerts & Notes */}
                  {((order.alertReason || order.abortReason) || getLastNote(order)) && (
                    <div className="mb-3">
                      {/* Alerts */}
                      {(order.alertReason || order.abortReason) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {order.alertReason && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              ⚠️ {order.alertReason}
                            </span>
                          )}
                          {order.abortReason && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              ❌ {order.abortReason}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Last Note */}
                      {(() => {
                        const lastNote = getLastNote(order);
                        return lastNote ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded-full">
                                {formatNoteType(lastNote.type)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(lastNote.timestamp)}
                              </span>
                              {lastNote.addedBy && (
                                <span className="text-xs text-gray-500">by {lastNote.addedBy}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {lastNote.text || t('noDetailsProvided')}
                            </p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      {t('viewDetails')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingStatus(order.id);
                        setNewStatus(order.status);
                        setStatusNotes('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      <Edit className="h-4 w-4" />
                      {t('editStatus')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setAddingNoteToOrder(order.id);
                        setShowAddNoteModal(true);
                        setNoteOnlyType('');
                        setNoteOnlyCustom('');
                        setNoteOnlyText('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                    >
                      <StickyNote className="h-4 w-4" />
                      {t('addNote')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setTicketOrder(order);
                        setTicketTitle(`Problem with order ${order.reference}`);
                        setShowTicketModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t('reportProblem')}
                    </button>
                    
                    {orderTicketCounts[order.id] > 0 && (
                      <button
                        onClick={() => viewOrderTickets(order)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        {t('viewTickets')} ({orderTicketCounts[order.id]})
                      </button>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>

          {/* Space-Optimized Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-3 mt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalCount}
                itemsPerPage={limit}
              />
            </div>
          )}
        </div>

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
        {/* Add Note Only Modal */}
        {showAddNoteModal && addingNoteToOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 sm:items-center">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('addNote')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('addNoteWithoutStatusChange')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddNoteModal(false);
                    setAddingNoteToOrder(null);
                    setNoteOnlyType('');
                    setNoteOnlyCustom('');
                    setNoteOnlyText('');
                  }}
                  className="rounded-full p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {t('noteTypes')}
                  </label>
                  <div className="relative">
                    <select
                      value={noteOnlyType}
                      onChange={(e) => {
                        setNoteOnlyType(e.target.value);
                        if (e.target.value !== 'CUSTOM') {
                          setNoteOnlyCustom('');
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">{t('selectNoteType')}</option>
                      {noteOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Show custom note field if needed */}
                {(noteOnlyType && noteOptions.find(opt => opt.value === noteOnlyType)?.hasRemark) && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      {noteOnlyType === 'CUSTOM' ? t('customNote') : 'Remarque'}
                    </label>
                    <textarea
                      value={noteOnlyCustom}
                      onChange={(e) => setNoteOnlyCustom(e.target.value)}
                      placeholder={noteOnlyType === 'CUSTOM' ? 'Entrez votre note personnalisée...' : 'Entrez votre remarque...'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors resize-none"
                      rows={3}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {t('additionalNotes')} ({t('optional')})
                  </label>
                  <textarea
                    value={noteOnlyText}
                    onChange={(e) => setNoteOnlyText(e.target.value)}
                    placeholder={t('additionalNotes')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors resize-none"
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Button
                    onClick={() => {
                      setShowAddNoteModal(false);
                      setAddingNoteToOrder(null);
                      setNoteOnlyType('');
                      setNoteOnlyCustom('');
                      setNoteOnlyText('');
                    }}
                    variant="outline"
                    className="px-6 py-2 rounded-xl"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (addingNoteToOrder && (noteOnlyText || noteOnlyType || noteOnlyCustom)) {
                        addNoteOnly(addingNoteToOrder, noteOnlyText, noteOnlyType, noteOnlyCustom);
                        setShowAddNoteModal(false);
                        setAddingNoteToOrder(null);
                        setNoteOnlyType('');
                        setNoteOnlyCustom('');
                        setNoteOnlyText('');
                      }
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={!noteOnlyText && !noteOnlyType && !noteOnlyCustom}
                  >
                    <StickyNote className="h-4 w-4 mr-2" />
                    {t('addNote')}
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

                  {/* Customer Satisfaction Survey Section */}
                  {(selectedOrder.status === 'DELIVERED' || selectedOrder.shippingStatus === 'LIVRÉ') && (
                    <Card className="p-6 mt-6 border-2 border-yellow-200 bg-yellow-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Star className="w-5 h-5 text-yellow-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t('customerSatisfactionSurvey')}
                          </h3>
                        </div>
                        {!showSurveyForm && !existingSurvey && (
                          <Button
                            onClick={() => setShowSurveyForm(true)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            {t('collectSurvey')}
                          </Button>
                        )}
                        {existingSurvey && !showSurveyForm && (
                          <Button
                            onClick={() => setShowSurveyForm(true)}
                            variant="outline"
                            className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('updateSurvey')}
                          </Button>
                        )}
                      </div>

                      {loadingSurvey ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                          <p className="text-sm text-gray-600 mt-2">{t('loading')}...</p>
                        </div>
                      ) : showSurveyForm ? (
                        <SatisfactionSurveyForm
                          orderId={selectedOrder.id}
                          orderReference={selectedOrder.reference}
                          existingSurvey={existingSurvey}
                          onSuccess={handleSurveySuccess}
                          onCancel={() => setShowSurveyForm(false)}
                        />
                      ) : existingSurvey ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {existingSurvey.overallRating && (
                              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                                <p className="text-xs text-gray-600 mb-1">{t('overallSatisfaction')}</p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < existingSurvey.overallRating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-semibold">{existingSurvey.overallRating}/5</span>
                                </div>
                              </div>
                            )}
                            {existingSurvey.deliverySpeedRating && (
                              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                                <p className="text-xs text-gray-600 mb-1">{t('deliverySpeed')}</p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < existingSurvey.deliverySpeedRating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-semibold">{existingSurvey.deliverySpeedRating}/5</span>
                                </div>
                              </div>
                            )}
                            {existingSurvey.productQualityRating && (
                              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                                <p className="text-xs text-gray-600 mb-1">{t('productQuality')}</p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < existingSurvey.productQualityRating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-semibold">{existingSurvey.productQualityRating}/5</span>
                                </div>
                              </div>
                            )}
                            {existingSurvey.agentServiceRating && (
                              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                                <p className="text-xs text-gray-600 mb-1">{t('agentService')}</p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < existingSurvey.agentServiceRating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-semibold">{existingSurvey.agentServiceRating}/5</span>
                                </div>
                              </div>
                            )}
                            {existingSurvey.packagingRating && (
                              <div className="bg-white p-3 rounded-lg border border-yellow-200">
                                <p className="text-xs text-gray-600 mb-1">{t('packaging')}</p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < existingSurvey.packagingRating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-semibold">{existingSurvey.packagingRating}/5</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {existingSurvey.comments && (
                            <div className="bg-white p-3 rounded-lg border border-yellow-200">
                              <p className="text-xs text-gray-600 mb-1">{t('customerComments')}</p>
                              <p className="text-sm text-gray-800">{existingSurvey.comments}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-yellow-200">
                            <span>
                              {t('collectedBy')}: {existingSurvey.collectedBy?.name || 'Unknown'}
                            </span>
                            <span>
                              {new Date(existingSurvey.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Star className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-4">No satisfaction survey collected yet</p>
                          <Button
                            onClick={() => setShowSurveyForm(true)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            {t('collectSurvey')}
                          </Button>
                        </div>
                      )}
                    </Card>
                  )}

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
                    placeholder={t('briefDescription')}
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
                    <option value="EXCHANGE">🔄 Exchange</option>
                    <option value="REFUND">💰 Refund</option>
                    <option value="QUALITY_CONTROL">⚠️ Quality Control</option>
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
                    placeholder={t('describeTheProblem')}
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

export default function AgentOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>}>
      <AgentOrdersPageContent />
    </Suspense>
  );
}
