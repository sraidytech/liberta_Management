'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/lib/language-context';
import { X, User, Package, MapPin, Calendar, DollarSign } from 'lucide-react';

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: string, notes?: string) => void;
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

export function OrderDetailsModal({ order, isOpen, onClose, onStatusUpdate }: OrderDetailsModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [newStatus, setNewStatus] = useState(order?.status || '');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const handleStatusUpdate = async () => {
    if (newStatus === order.status) {
      showToast({
        type: 'warning',
        title: t('warning'),
        message: 'Status is the same'
      });
      return;
    }

    setUpdating(true);
    try {
      await onStatusUpdate(order.id, newStatus, notes);
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('orderDetails')} - {order.reference}
              </h2>
              <p className="text-gray-600 mt-1">
                {order.ecoManagerId && `EcoManager ID: ${order.ecoManagerId}`}
              </p>
            </div>
            <button
              onClick={onClose}
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
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status as keyof typeof statusColors]}`}>
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
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('total')}:</span>
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('orderDate')}:</span>
                    <span>{formatDate(order.orderDate || order.createdAt)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('items')}:</span>
                    <span>{order._count?.items || order.items?.length || 0}</span>
                  </div>
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
                    <p className="font-semibold">{order.customer.fullName}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">{t('phone')}:</span>
                    <p className="font-semibold">{order.customer.telephone}</p>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-1" />
                    <div>
                      <p className="font-semibold">{order.customer.wilaya}</p>
                      <p className="text-gray-600">{order.customer.commune}</p>
                      {order.customer.address && (
                        <p className="text-sm text-gray-500">{order.customer.address}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Agent Information */}
              {order.assignedAgent && (
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <User className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-semibold">{t('assignedAgent')}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600">{t('name')}:</span>
                      <p className="font-semibold">{order.assignedAgent.name}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">{t('agentCode')}:</span>
                      <p className="font-semibold">{order.assignedAgent.agentCode}</p>
                    </div>
                    
                    {order.assignedAt && (
                      <div>
                        <span className="text-gray-600">{t('assignedAt')}:</span>
                        <p>{formatDate(order.assignedAt)}</p>
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
                      {order.items?.map((item: any, index: number) => (
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
                          <td className="text-right py-3 font-semibold">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Status Update Section */}
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">{t('updateOrderStatus')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('newStatus')}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    {t('notes')} ({t('optional')})
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('addNotesAboutStatusChange')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-4 space-x-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === order.status}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updating ? t('updating') : t('updateStatus')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}