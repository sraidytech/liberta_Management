'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { TrendingUp, TrendingDown, RefreshCw, ArrowRightLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const t = {
  en: {
    title: 'Stock Movements',
    type: 'Type',
    product: 'Product',
    quantity: 'Quantity',
    date: 'Date',
    reference: 'Reference',
    reason: 'Reason',
    loading: 'Loading...',
    noMovements: 'No movements found',
    in: 'IN',
    out: 'OUT',
    adjustment: 'ADJUSTMENT',
    transfer: 'TRANSFER',
    all: 'All Types',
    export: 'Export CSV',
    units: 'units',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    to: 'to',
    results: 'results',
    previous: 'Previous',
    next: 'Next',
  },
  fr: {
    title: 'Mouvements de Stock',
    type: 'Type',
    product: 'Produit',
    quantity: 'Quantité',
    date: 'Date',
    reference: 'Référence',
    reason: 'Raison',
    loading: 'Chargement...',
    noMovements: 'Aucun mouvement trouvé',
    in: 'ENTRÉE',
    out: 'SORTIE',
    adjustment: 'AJUSTEMENT',
    transfer: 'TRANSFERT',
    all: 'Tous Types',
    export: 'Exporter CSV',
    units: 'unités',
    page: 'Page',
    of: 'sur',
    showing: 'Affichage de',
    to: 'à',
    results: 'résultats',
    previous: 'Précédent',
    next: 'Suivant',
  },
};

interface Movement {
  id: string;
  movementType?: string;
  type?: string;
  quantity: number;
  reason?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  // Flat fields from backend
  productName?: string;
  productSku?: string;
  productUnit?: string;
  warehouseName?: string;
  lotNumber?: string;
  userName?: string;
  // Nested fields (for backward compatibility)
  product?: {
    name: string;
    sku?: string;
    unit: string;
  };
  warehouse?: {
    name: string;
  };
  lot?: {
    lotNumber: string;
  };
  user?: {
    name: string;
  };
}

export default function MovementsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    loadMovements();
  }, [currentPage]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const response = await stockService.getMovements({ page: currentPage, limit: itemsPerPage });
      setMovements(response.movements || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error loading movements:', error);
      setMovements([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get movement type (backend uses movementType, frontend uses type)
  const getType = (movement: Movement) => movement.movementType || movement.type || 'ADJUSTMENT';

  const getMovementIcon = (type: string) => {
    const icons = {
      IN: <TrendingUp className="w-5 h-5 text-green-600" />,
      OUT: <TrendingDown className="w-5 h-5 text-red-600" />,
      ADJUSTMENT: <RefreshCw className="w-5 h-5 text-blue-600" />,
      TRANSFER: <ArrowRightLeft className="w-5 h-5 text-purple-600" />,
    };
    return icons[type as keyof typeof icons] || icons.ADJUSTMENT;
  };

  const getMovementBadge = (type: string) => {
    const badges = {
      IN: { color: 'bg-green-100 text-green-800', text: t[language].in },
      OUT: { color: 'bg-red-100 text-red-800', text: t[language].out },
      ADJUSTMENT: { color: 'bg-blue-100 text-blue-800', text: t[language].adjustment },
      TRANSFER: { color: 'bg-purple-100 text-purple-800', text: t[language].transfer },
    };
    const badge = badges[type as keyof typeof badges] || badges.ADJUSTMENT;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  // Helper to get product name (handles both flat and nested structure)
  const getProductName = (movement: Movement) => movement.productName || movement.product?.name || 'Unknown Product';
  const getProductUnit = (movement: Movement) => movement.productUnit || movement.product?.unit || 'units';
  const getWarehouseName = (movement: Movement) => movement.warehouseName || movement.warehouse?.name || 'Unknown';

  const filteredMovements = movements.filter(movement => {
    if (typeFilter === 'all') return true;
    const type = getType(movement);
    return type === typeFilter;
  });

  const handleExport = async () => {
    try {
      const blob = await stockService.exportReport('movements', {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movements-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting movements:', error);
    }
  };

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
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t[language].export}
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('all')}
              size="sm"
            >
              {t[language].all}
            </Button>
            <Button
              variant={typeFilter === 'IN' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('IN')}
              size="sm"
            >
              {t[language].in}
            </Button>
            <Button
              variant={typeFilter === 'OUT' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('OUT')}
              size="sm"
            >
              {t[language].out}
            </Button>
            <Button
              variant={typeFilter === 'ADJUSTMENT' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('ADJUSTMENT')}
              size="sm"
            >
              {t[language].adjustment}
            </Button>
            <Button
              variant={typeFilter === 'TRANSFER' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('TRANSFER')}
              size="sm"
            >
              {t[language].transfer}
            </Button>
          </div>
        </Card>

        {/* Movements Timeline */}
        {filteredMovements.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {t[language].noMovements}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="divide-y">
              {filteredMovements.map((movement) => {
                const type = getType(movement);
                return (
                  <div key={movement.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getMovementIcon(type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getMovementBadge(type)}
                              <span className="text-sm text-gray-500">
                                {new Date(movement.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900">{getProductName(movement)}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {type === 'IN' ? '+' : type === 'OUT' ? '-' : ''}
                              {movement.quantity} {getProductUnit(movement)}
                            </p>
                            {(movement.reason || movement.notes) && (
                              <p className="text-sm text-gray-500 mt-1">{movement.reason || movement.notes}</p>
                            )}
                            {movement.reference && (
                              <p className="text-xs text-gray-400 mt-1">
                                {t[language].reference}: {movement.reference}
                              </p>
                            )}
                            {(movement.lotNumber || movement.lot?.lotNumber) && (
                              <p className="text-xs text-gray-400 mt-1">
                                Lot: {movement.lotNumber || movement.lot?.lotNumber}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{getWarehouseName(movement)}</p>
                            {(movement.userName || movement.user?.name) && (
                              <p className="text-xs text-gray-400 mt-1">
                                By: {movement.userName || movement.user?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t[language].showing} {((currentPage - 1) * itemsPerPage) + 1} {t[language].to} {Math.min(currentPage * itemsPerPage, totalItems)} {t[language].of} {totalItems} {t[language].results}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t[language].previous}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {t[language].page} {currentPage} {t[language].of} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t[language].next}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}