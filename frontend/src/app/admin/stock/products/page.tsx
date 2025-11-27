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
import { Package, Search, Plus, Edit, Trash2, AlertCircle, CheckCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const t = {
  en: {
    title: 'Product Management',
    search: 'Search products...',
    addProduct: 'Add Product',
    syncFromOrders: 'Sync from Orders',
    sku: 'SKU',
    name: 'Name',
    category: 'Category',
    stock: 'Stock',
    minLevel: 'Min Level',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    loading: 'Loading...',
    noProducts: 'No products found',
    units: 'units',
    all: 'All',
    filter: 'Filter',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    to: 'to',
    results: 'results',
    previous: 'Previous',
    next: 'Next',
    confirmDelete: 'Are you sure you want to delete this product?',
    deleteSuccess: 'Product deleted successfully',
    deleteError: 'Failed to delete product',
    deleting: 'Deleting...',
  },
  fr: {
    title: 'Gestion des Produits',
    search: 'Rechercher produits...',
    addProduct: 'Ajouter Produit',
    syncFromOrders: 'Sync depuis Commandes',
    sku: 'SKU',
    name: 'Nom',
    category: 'Catégorie',
    stock: 'Stock',
    minLevel: 'Niveau Min',
    status: 'Statut',
    actions: 'Actions',
    edit: 'Modifier',
    delete: 'Supprimer',
    inStock: 'En Stock',
    lowStock: 'Stock Faible',
    outOfStock: 'Rupture',
    loading: 'Chargement...',
    noProducts: 'Aucun produit trouvé',
    units: 'unités',
    all: 'Tous',
    filter: 'Filtrer',
    page: 'Page',
    of: 'sur',
    showing: 'Affichage de',
    to: 'à',
    results: 'résultats',
    previous: 'Précédent',
    next: 'Suivant',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce produit?',
    deleteSuccess: 'Produit supprimé avec succès',
    deleteError: 'Échec de la suppression du produit',
    deleting: 'Suppression...',
  },
};

interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  minThreshold: number;
  minStockLevel?: number; // For backward compatibility
  stockLevels: Array<{
    totalQuantity: number;
  }>;
}

export default function ProductsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 25;

  useEffect(() => {
    loadProducts();
  }, [currentPage]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await stockService.getProducts({ page: currentPage, limit: itemsPerPage });
      setProducts(response.products || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    const totalStock = product.stockLevels?.reduce((sum, level) => sum + level.totalQuantity, 0) || 0;
    const minLevel = product.minThreshold || product.minStockLevel || 0;
    if (totalStock === 0) return 'outOfStock';
    if (totalStock < minLevel) return 'lowStock';
    return 'inStock';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      inStock: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: t[language].inStock },
      lowStock: { color: 'bg-amber-100 text-amber-800', icon: AlertCircle, text: t[language].lowStock },
      outOfStock: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: t[language].outOfStock },
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStockStatus(product);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`${t[language].confirmDelete}\n\n${productName}`)) {
      return;
    }

    try {
      setDeleting(productId);
      await stockService.deleteProduct(productId);
      alert(t[language].deleteSuccess);
      loadProducts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(t[language].deleteError);
    } finally {
      setDeleting(null);
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/stock/sync')}
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t[language].syncFromOrders}
            </Button>
            <Button onClick={() => router.push('/admin/stock/products/new')} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t[language].addProduct}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t[language].search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                {t[language].all}
              </Button>
              <Button
                variant={statusFilter === 'inStock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inStock')}
                size="sm"
              >
                {t[language].inStock}
              </Button>
              <Button
                variant={statusFilter === 'lowStock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('lowStock')}
                size="sm"
              >
                {t[language].lowStock}
              </Button>
              <Button
                variant={statusFilter === 'outOfStock' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('outOfStock')}
                size="sm"
              >
                {t[language].outOfStock}
              </Button>
            </div>
          </div>
        </Card>

        {/* Products Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].sku}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].name}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].category}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].stock}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].minLevel}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].status}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t[language].actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      {t[language].noProducts}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const totalStock = product.stockLevels?.reduce((sum, level) => sum + level.totalQuantity, 0) || 0;
                    const status = getStockStatus(product);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {totalStock} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.minThreshold || product.minStockLevel || 0} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/stock/products/${product.id}`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(product.id, product.name)}
                              disabled={deleting === product.id}
                            >
                              {deleting === product.id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
      </div>
    </Layout>
  );
}