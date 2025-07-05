'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { createTranslator } from '@/lib/i18n';
import {
  Clock,
  Package,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MapPin,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface Order {
  id: string;
  reference: string;
  status: string;
  total: number;
  assignedAt: string;
  customer: {
    fullName: string;
    telephone: string;
    wilaya: string;
    commune: string;
  };
  items: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface AgentStats {
  assignedOrders: number;
  maxOrders: number;
  completedToday: number;
  pendingOrders: number;
  utilizationRate: number;
}

export default function AgentDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = createTranslator(language);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [availability, setAvailability] = useState<string>('OFFLINE');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgentData = async () => {
    if (!user?.id) {
      console.log('❌ No user ID available for agent dashboard');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      console.log('🔍 Fetching agent dashboard data for user:', user.id);
      console.log('📡 API URL:', `${apiBaseUrl}/api/v1/orders?assignedAgentId=${user.id}`);
      
      // Fetch user profile to get current availability status
      const profileResponse = await fetch(`${apiBaseUrl}/api/v1/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.data.availability) {
          setAvailability(profileData.data.availability);
          console.log('✅ Current availability status:', profileData.data.availability);
        }
      }
      
      // Fetch agent-specific stats that consider product assignments
      const statsResponse = await fetch(`${apiBaseUrl}/api/v1/assignments/agent/${user.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Agent Stats API Response Status:', statsResponse.status);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 Agent Stats Data:', statsData);
        
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
          console.log('✅ Agent stats loaded successfully:', statsData.data);
        }
      } else {
        console.error('❌ Failed to fetch agent stats:', statsResponse.status);
      }

      // Fetch assigned orders for display (first 5 only)
      const ordersResponse = await fetch(`${apiBaseUrl}/api/v1/orders?assignedAgentId=${user.id}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📦 Orders API Response Status:', ordersResponse.status);
      
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        console.log('📦 Orders Data:', ordersData);
        
        const displayOrders = ordersData.data?.orders || [];
        setOrders(displayOrders);
        
        console.log('✅ Agent dashboard orders loaded successfully');
        console.log('📊 Orders for display:', displayOrders.length);
      } else {
        const errorText = await ordersResponse.text();
        console.error('❌ Failed to fetch orders:', ordersResponse.status, errorText);
      }

      // Set default stats if no stats were loaded
      if (!stats) {
        setStats({
          assignedOrders: 0,
          maxOrders: (user as any).maxOrders || 50,
          completedToday: 0,
          pendingOrders: 0,
          utilizationRate: 0
        });
      }

    } catch (error) {
      console.error('💥 Error fetching agent data:', error);
      
      // Set default stats if error occurs
      setStats({
        assignedOrders: 0,
        maxOrders: (user as any).maxOrders || 50,
        completedToday: 0,
        pendingOrders: 0,
        utilizationRate: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateAvailability = async (newAvailability: string) => {
    if (!user?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/assignments/agent/${user.id}/availability`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ availability: newAvailability })
      });
      
      if (response.ok) {
        setAvailability(newAvailability);
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAgentData();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, notes })
      });
      
      if (response.ok) {
        fetchAgentData(); // Refresh data
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  useEffect(() => {
    fetchAgentData();
    
    // 🔧 FIX: Reduce polling frequency to prevent 429 errors
    // Refresh every 60 seconds instead of 30 seconds
    const interval = setInterval(fetchAgentData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: { en: string; fr: string } } = {
      'ASSIGNED': { en: 'Assigned', fr: 'Assigné' },
      'IN_PROGRESS': { en: 'In Progress', fr: 'En cours' },
      'CONFIRMED': { en: 'Confirmed', fr: 'Confirmé' },
      'CANCELLED': { en: 'Cancelled', fr: 'Annulé' },
      'SHIPPED': { en: 'Shipped', fr: 'Expédié' },
      'DELIVERED': { en: 'Delivered', fr: 'Livré' }
    };
    return statusMap[status]?.[language] || status;
  };

  const getAvailabilityText = (status: string) => {
    const availabilityMap: { [key: string]: { en: string; fr: string } } = {
      'ONLINE': { en: 'Online', fr: 'En ligne' },
      'BUSY': { en: 'Busy', fr: 'Occupé' },
      'BREAK': { en: 'On Break', fr: 'En pause' },
      'OFFLINE': { en: 'Offline', fr: 'Hors ligne' }
    };
    return availabilityMap[status]?.[language] || status;
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'BUSY': return 'bg-yellow-500';
      case 'BREAK': return 'bg-orange-500';
      case 'OFFLINE': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'fr' ? 'Tableau de Bord Agent' : 'Agent Dashboard'}
          </h1>
          <p className="text-gray-600">
            {language === 'fr' ? 'Gérez vos commandes assignées' : 'Manage your assigned orders'}
          </p>
        </div>
        
        {/* Availability Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(availability)}`}></div>
            <span className="text-sm font-medium">{getAvailabilityText(availability)}</span>
          </div>
          
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{language === 'fr' ? 'Actualiser' : 'Refresh'}</span>
          </Button>
          
          <select 
            value={availability} 
            onChange={(e) => updateAvailability(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="ONLINE">{language === 'fr' ? 'En ligne' : 'Online'}</option>
            <option value="BUSY">{language === 'fr' ? 'Occupé' : 'Busy'}</option>
            <option value="BREAK">{language === 'fr' ? 'En pause' : 'On Break'}</option>
            <option value="OFFLINE">{language === 'fr' ? 'Hors ligne' : 'Offline'}</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {language === 'fr' ? 'Commandes Assignées' : 'Assigned Orders'}
                </div>
                <div className="text-2xl font-bold">{stats.assignedOrders}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {language === 'fr' ? 'Commandes En Attente' : 'Pending Orders'}
                </div>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {language === 'fr' ? 'Terminées Aujourd\'hui' : 'Completed Today'}
                </div>
                <div className="text-2xl font-bold">{stats.completedToday}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {language === 'fr' ? 'Capacité' : 'Capacity'}
                </div>
                <div className="text-2xl font-bold">{stats.utilizationRate.toFixed(0)}%</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {language === 'fr' ? 'Mes Commandes Assignées' : 'My Assigned Orders'}
        </h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{language === 'fr' ? 'Aucune commande assignée pour le moment' : 'No orders assigned yet'}</p>
            <p className="text-sm">
              {language === 'fr' ? 'Les commandes apparaîtront ici quand elles vous seront assignées' : 'Orders will appear here when assigned to you'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">{order.reference}</h3>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{order.customer.fullName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{order.customer.telephone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{order.customer.wilaya}, {order.customer.commune}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">{order.total.toFixed(2)} DA</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.assignedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order Details</h2>
              <Button 
                variant="outline" 
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Reference</label>
                  <p className="font-semibold">{selectedOrder.reference}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>
              
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600">Name</label>
                    <p>{selectedOrder.customer.fullName}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Phone</label>
                    <p>{selectedOrder.customer.telephone}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Wilaya</label>
                    <p>{selectedOrder.customer.wilaya}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Commune</label>
                    <p>{selectedOrder.customer.commune}</p>
                  </div>
                </div>
              </div>
              
              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{(item.quantity * item.unitPrice).toFixed(2)} DA</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{selectedOrder.total.toFixed(2)} DA</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4">
                {selectedOrder.status === 'ASSIGNED' && (
                  <>
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'IN_PROGRESS')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {t('startProcessing')}
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'CANCELLED', 'Customer not reachable')}
                      variant="outline"
                    >
                      {t('cancelOrder')}
                    </Button>
                  </>
                )}
                
                {selectedOrder.status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {t('confirmOrder')}
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'CANCELLED', 'Customer cancelled')}
                      variant="outline"
                    >
                      {t('cancelOrder')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}