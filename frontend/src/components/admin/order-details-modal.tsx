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
                  
                  {order.maystroOrderId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maystro ID:</span>
                      <span className="font-mono text-sm">{order.maystroOrderId}</span>
                    </div>
                  )}
                  
                  {order.alertedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Alerted At:</span>
                      <span className="text-sm">{formatDate(order.alertedAt)}</span>
                    </div>
                  )}
                  
                  {order.alertReason && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Alert Reason:</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        {order.alertReason}
                      </span>
                    </div>
                  )}
                  
                  {order.abortReason && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abort Reason:</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {order.abortReason}
                      </span>
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

              {/* Maystro Metadata */}
              {order.additionalMetaData && (
                <Card className="p-6 lg:col-span-2">
                  <div className="flex items-center mb-4">
                    <Package className="w-5 h-5 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-semibold">Maystro Metadata</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.additionalMetaData.customer_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Customer Name:</span>
                        <p className="font-semibold">{order.additionalMetaData.customer_name}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.customer_phone && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Customer Phone:</span>
                        <p className="font-semibold">{order.additionalMetaData.customer_phone}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.destination_text && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Destination:</span>
                        <p className="font-semibold">{order.additionalMetaData.destination_text}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.product_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Product Name:</span>
                        <p className="font-semibold">{order.additionalMetaData.product_name}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.product_price && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Product Price:</span>
                        <p className="font-semibold">{formatCurrency(order.additionalMetaData.product_price)}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.wilaya && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Wilaya:</span>
                        <p className="font-semibold">{order.additionalMetaData.wilaya}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.commune_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Commune:</span>
                        <p className="font-semibold">{order.additionalMetaData.commune_name}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.ordered_at && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Ordered At:</span>
                        <p className="font-semibold">{formatDate(order.additionalMetaData.ordered_at)}</p>
                      </div>
                    )}
                    
                    {order.additionalMetaData.delivered_at && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">Delivered At:</span>
                        <p className="font-semibold">{formatDate(order.additionalMetaData.delivered_at)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Raw JSON for debugging */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      View Raw Metadata (Debug)
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-40">
                      {JSON.stringify(order.additionalMetaData, null, 2)}
                    </pre>
                  </details>
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

              {/* Agent Notes History Section - Only show agent-created notes */}
              {(() => {
                let agentNotes = [];
                try {
                  if (order.notes) {
                    const parsedNotes = JSON.parse(order.notes);
                    if (Array.isArray(parsedNotes)) {
                      agentNotes = parsedNotes;
                    }
                  }
                } catch (e) {
                  // Legacy notes are not shown in agent history
                  agentNotes = [];
                }
                
                return (
                  <Card className="p-6 lg:col-span-2">
                    <div className="flex items-center mb-4">
                      <User className="w-5 h-5 text-purple-600 mr-2" />
                      <h3 className="text-lg font-semibold">Historique des Notes</h3>
                      <span className="ml-2 text-sm text-gray-500">
                        ({agentNotes.length} {agentNotes.length === 1 ? 'note' : 'notes'})
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {agentNotes.length > 0 ? (
                        (() => {
                          const noteOptions = [
                            { value: 'CLIENT_NO_RESPONSE_1', label: 'Client (PAS DE REPONSE 1)' },
                            { value: 'CLIENT_NO_RESPONSE_2', label: 'Client (PAS DE REPONSE 2)' },
                            { value: 'CLIENT_NO_RESPONSE_3', label: 'Client (PAS DE REPONSE 3)' },
                            { value: 'CLIENT_NO_RESPONSE_4_SMS', label: 'Client (PAS DE REPONSE 4+SMS)' },
                            { value: 'CLIENT_POSTPONED', label: 'CLIENT (REPORTER)' },
                            { value: 'CLIENT_CANCELLED', label: 'CLIENT (ANNULE)' },
                            { value: 'RELAUNCHED', label: 'Relancé' },
                            { value: 'REFUND', label: 'Remboursement' },
                            { value: 'EXCHANGE', label: 'Echange' },
                            { value: 'POSTPONED_TO_DATE', label: 'Reporté à une date' },
                            { value: 'APPROVED_TO_DATE', label: 'Approuvé à une date' },
                            { value: 'PROBLEM_CLIENT_DELIVERY', label: 'Problem (client / livreur)' },
                            { value: 'PROBLEM_ORDER', label: 'Problem (commande)' },
                            { value: 'DELIVERED_PENDING', label: 'Livrée (en attente de finalisation)' },
                            { value: 'CUSTOM', label: 'Note personnalisée' }
                          ];
                          
                          return agentNotes
                            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((note: any, index: number) => (
                            <div key={note.id || index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-purple-500 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-purple-700">
                                      {note.agentName || 'Agent'}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      {new Date(note.timestamp).toLocaleString('fr-FR', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                </div>
                                {note.statusChange && (
                                  <div className="text-xs bg-white px-2 py-1 rounded-full border">
                                    <span className="text-red-600">{note.statusChange.from}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-green-600">{note.statusChange.to}</span>
                                  </div>
                                )}
                              </div>
                              
                              {note.type && note.type !== 'CUSTOM' && (
                                <div className="mb-2">
                                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                                    {noteOptions.find(opt => opt.value === note.type)?.label || note.type}
                                  </span>
                                </div>
                              )}
                              
                              {note.note && (
                                <div className="bg-white p-3 rounded-md border border-gray-200">
                                  <p className="text-sm text-gray-700 leading-relaxed">{note.note}</p>
                                </div>
                              )}
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="text-center py-8">
                          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">Aucune note d'agent disponible</p>
                          <p className="text-gray-400 text-xs mt-1">Les notes apparaîtront ici lorsque les agents ajouteront des commentaires</p>
                        </div>
                      )}
                    </div>
                  
                    {/* Summary Stats */}
                    {agentNotes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {agentNotes.length}
                            </div>
                            <div className="text-xs text-blue-600">Total Notes</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {new Set(agentNotes.map((n: any) => n.agentId)).size}
                            </div>
                            <div className="text-xs text-green-600">Agents</div>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {agentNotes.filter((n: any) => n.statusChange).length}
                            </div>
                            <div className="text-xs text-purple-600">Status Changes</div>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="text-lg font-bold text-orange-600">
                              {(() => {
                                const latest = agentNotes[agentNotes.length - 1];
                                if (latest) {
                                  const hoursAgo = Math.floor((Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60));
                                  return hoursAgo < 24 ? `${hoursAgo}h` : `${Math.floor(hoursAgo / 24)}d`;
                                }
                                return 'N/A';
                              })()}
                            </div>
                            <div className="text-xs text-orange-600">Last Activity</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })()}
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