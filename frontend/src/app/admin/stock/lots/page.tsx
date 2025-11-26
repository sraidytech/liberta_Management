'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { Package, Plus, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

const t = {
  en: {
    title: 'Lot Management',
    receiveLot: 'Receive New Lot',
    lotNumber: 'Lot Number',
    product: 'Product',
    quantity: 'Quantity',
    expiry: 'Expiry Date',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    expired: 'Expired',
    expiringSoon: 'Expiring Soon',
    loading: 'Loading...',
    noLots: 'No lots found',
    units: 'units',
    daysLeft: 'days left',
    expiredText: 'Expired',
    view: 'View',
    all: 'All',
  },
  fr: {
    title: 'Gestion des Lots',
    receiveLot: 'Recevoir Nouveau Lot',
    lotNumber: 'Numéro de Lot',
    product: 'Produit',
    quantity: 'Quantité',
    expiry: 'Date d\'Expiration',
    status: 'Statut',
    actions: 'Actions',
    active: 'Actif',
    expired: 'Expiré',
    expiringSoon: 'Expire Bientôt',
    loading: 'Chargement...',
    noLots: 'Aucun lot trouvé',
    units: 'unités',
    daysLeft: 'jours restants',
    expiredText: 'Expiré',
    view: 'Voir',
    all: 'Tous',
  },
};

interface Lot {
  id: string;
  lotNumber: string;
  quantity: number;
  remainingQuantity: number;
  expiryDate?: string;
  status: string;
  product: {
    name: string;
    unit: string;
  };
  warehouse: {
    name: string;
  };
}

export default function LotsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLots();
  }, []);

  const loadLots = async () => {
    try {
      const data = await stockService.getLots();
      setLots(data);
    } catch (error) {
      console.error('Error loading lots:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (lot: Lot) => {
    if (!lot.expiryDate) return 'active';
    const daysLeft = getDaysUntilExpiry(lot.expiryDate);
    if (daysLeft === null) return 'active';
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'expiringSoon';
    return 'active';
  };

  const getStatusBadge = (lot: Lot) => {
    const status = getExpiryStatus(lot);
    const daysLeft = getDaysUntilExpiry(lot.expiryDate);
    
    const badges = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: t[language].active },
      expiringSoon: { color: 'bg-amber-100 text-amber-800', icon: AlertTriangle, text: `${daysLeft} ${t[language].daysLeft}` },
      expired: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: t[language].expiredText },
    };
    
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const filteredLots = lots.filter(lot => {
    if (statusFilter === 'all') return true;
    return getExpiryStatus(lot) === statusFilter;
  });

  // Sort by expiry date (FEFO - First Expired, First Out)
  const sortedLots = [...filteredLots].sort((a, b) => {
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Choose layout based on user role
  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t[language].loading}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          <Button onClick={() => router.push('/admin/stock/lots/new')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            {t[language].receiveLot}
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              {t[language].all}
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
              size="sm"
            >
              {t[language].active}
            </Button>
            <Button
              variant={statusFilter === 'expiringSoon' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('expiringSoon')}
              size="sm"
            >
              {t[language].expiringSoon}
            </Button>
            <Button
              variant={statusFilter === 'expired' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('expired')}
              size="sm"
            >
              {t[language].expired}
            </Button>
          </div>
        </Card>

        {/* Lots Grid */}
        {sortedLots.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {t[language].noLots}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLots.map((lot) => (
              <Card key={lot.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Lot Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{lot.lotNumber}</h3>
                      <p className="text-sm text-gray-600">{lot.product.name}</p>
                    </div>
                    {getStatusBadge(lot)}
                  </div>

                  {/* Lot Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t[language].quantity}:</span>
                      <span className="font-medium">
                        {lot.remainingQuantity} / {lot.quantity} {lot.product.unit}
                      </span>
                    </div>
                    
                    {lot.expiryDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t[language].expiry}:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lot.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Warehouse:</span>
                      <span className="font-medium">{lot.warehouse.name}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(lot.remainingQuantity / lot.quantity) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {Math.round((lot.remainingQuantity / lot.quantity) * 100)}% remaining
                    </p>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/admin/stock/lots/${lot.id}`)}
                  >
                    {t[language].view}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}