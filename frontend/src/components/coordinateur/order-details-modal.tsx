'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/ui/toast';
import { X, User, Package, MapPin, Calendar, DollarSign, Star } from 'lucide-react';
import { SatisfactionSurveyForm } from '@/components/satisfaction/satisfaction-survey-form';

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
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

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [existingSurvey, setExistingSurvey] = useState<any>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  // Check if order is delivered
  const isDelivered = order?.status === 'DELIVERED' || order?.shippingStatus === 'LIVRÉ';

  // Fetch existing survey when modal opens
  useEffect(() => {
    if (isOpen && order && isDelivered) {
      fetchExistingSurvey();
    }
  }, [isOpen, order?.id, isDelivered]);

  const fetchExistingSurvey = async () => {
    if (!order?.id) return;
    
    setLoadingSurvey(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/satisfaction-surveys/order/${order.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (response.ok || response.status === 304) {
        try {
          const data = await response.json();
          // Backend returns { success: true, data: survey } - survey is directly in data
          setExistingSurvey(data.data || null);
        } catch (e) {
          // Retry without cache on 304
          const retryResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/satisfaction-surveys/order/${order.id}?t=${Date.now()}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            setExistingSurvey(retryData.data || null);
          }
        }
      } else if (response.status !== 404) {
        console.error('Failed to fetch survey');
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
    } finally {
      setLoadingSurvey(false);
    }
  };

  const handleSurveySuccess = () => {
    setShowSurveyForm(false);
    fetchExistingSurvey();
  };

  if (!isOpen || !order) return null;

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
                  
                  {order.shippingStatus && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('shippingStatus')}:</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {order.shippingStatus}
                      </span>
                    </div>
                  )}
                  
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('trackingNumber')}:</span>
                      <span className="font-semibold">{order.trackingNumber}</span>
                    </div>
                  )}
                  
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

            {/* Satisfaction Survey Section - Only show for delivered orders */}
            {isDelivered && (
              <Card className="p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-500 mr-2" />
                    <h3 className="text-lg font-semibold">{t('customerSatisfactionSurvey')}</h3>
                  </div>
                  {existingSurvey && !showSurveyForm && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600 font-medium">
                        ★ {existingSurvey.overallRating || 'N/A'}/5
                      </span>
                      <Button
                        onClick={() => setShowSurveyForm(true)}
                        variant="outline"
                        size="sm"
                      >
                        {t('updateSurvey')}
                      </Button>
                    </div>
                  )}
                  {!existingSurvey && !showSurveyForm && (
                    <Button
                      onClick={() => setShowSurveyForm(true)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                      size="sm"
                    >
                      {t('collectSurvey')}
                    </Button>
                  )}
                </div>

                {loadingSurvey ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('loading')}...
                  </div>
                ) : showSurveyForm ? (
                  <SatisfactionSurveyForm
                    orderId={order.id}
                    orderReference={order.reference}
                    existingSurvey={existingSurvey}
                    onSuccess={handleSurveySuccess}
                    onCancel={() => setShowSurveyForm(false)}
                  />
                ) : existingSurvey ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">{t('overallSatisfaction')}</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {existingSurvey.overallRating || '-'}/5
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">{t('deliverySpeed')}</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {existingSurvey.deliverySpeedRating || '-'}/5
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">{t('productQuality')}</div>
                        <div className="text-2xl font-bold text-green-600">
                          {existingSurvey.productQualityRating || '-'}/5
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">{t('agentService')}</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {existingSurvey.agentServiceRating || '-'}/5
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">{t('packaging')}</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {existingSurvey.packagingRating || '-'}/5
                        </div>
                      </div>
                    </div>

                    {existingSurvey.customerComments && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {t('customerComments')}:
                        </div>
                        <p className="text-gray-800">{existingSurvey.customerComments}</p>
                      </div>
                    )}

                    {existingSurvey.internalNotes && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {t('internalNotes')} ({t('privateNotes')}):
                        </div>
                        <p className="text-gray-800">{existingSurvey.internalNotes}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 flex items-center justify-between pt-2 border-t">
                      <span>
                        {t('collectedBy')}: {existingSurvey.collectedBy?.name || 'Unknown'}
                      </span>
                      <span>
                        {t('version')} {existingSurvey.surveyVersion} • {new Date(existingSurvey.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">{t('surveyNotCollected')}</p>
                    <p className="text-sm text-gray-400">
                      {t('collectSurveyForDeliveredOrders')}
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="flex justify-end p-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              {t('close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}