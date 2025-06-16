'use client';

import AgentLayout from '@/components/agent/agent-layout';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
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
  X
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
  };
}

export default function AgentOrdersPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteType, setNoteType] = useState('');
  const [customNote, setCustomNote] = useState('');

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

  const fetchOrders = async () => {
    if (!user?.id) {
      console.log('❌ No user ID available, user object:', user);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching orders for agent ID:', user.id);
      console.log('👤 User details:', { id: user.id, name: user.name, role: user.role, agentCode: (user as any).agentCode });
      
      // Use the correct API URL from environment variable
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiBaseUrl}/api/v1/orders?assignedAgentId=${user.id}`;
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
        
        const orders = data.data?.orders || [];
        setOrders(orders);
        console.log('✅ Orders set in state, count:', orders.length);
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

  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string, noteType?: string, customNote?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
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
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.telephone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            {filteredOrders.length} / {orders.length} {t('orders')}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="ALL">{t('allStatuses')}</option>
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
          </div>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No orders found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || statusFilter !== 'ALL' 
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
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('orderDate')}: {formatDate(order.orderDate || order.createdAt)}
                  </div>
                </div>
              </Card>
            ))
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
      </div>
    </AgentLayout>
  );
}