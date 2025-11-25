'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Search, ArrowUpDown, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface Product {
  name: string;
  sku: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  deliveryRate: number;
  totalRevenue: number;
  averageOrderValue: number;
  quantitySold: number;
  packSize: number | null;
  baseProductName: string;
}

interface ProductTableProps {
  products: Product[];
  loading: boolean;
}

export default function ProductTable({ products, loading }: ProductTableProps) {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Product>('totalOrders');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

    return filtered;
  }, [products, searchTerm, sortField, sortDirection]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            {language === 'fr' ? 'Tous les Produits' : 'All Products'}
          </h3>
          <span className="text-sm text-gray-600">
            {filteredAndSortedProducts.length} {language === 'fr' ? 'produits' : 'products'}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={language === 'fr' ? 'Rechercher un produit...' : 'Search products...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                >
                  <span>{language === 'fr' ? 'Produit' : 'Product'}</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('totalOrders')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                >
                  <span>{language === 'fr' ? 'Commandes' : 'Orders'}</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('deliveryRate')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                >
                  <span>{language === 'fr' ? 'Taux Livraison' : 'Delivery Rate'}</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('totalRevenue')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                >
                  <span>{language === 'fr' ? 'Revenu' : 'Revenue'}</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('averageOrderValue')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                >
                  <span>{language === 'fr' ? 'Valeur Moy.' : 'Avg. Value'}</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('quantitySold')}
                  className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                >
                  <span>{language === 'fr' ? 'Quantité' : 'Quantity'}</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSortedProducts.map((product, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{product.name}</span>
                    {product.sku && (
                      <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                    )}
                    {product.packSize && product.packSize > 1 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1 w-fit">
                        Pack {product.packSize}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{product.totalOrders}</span>
                    <span className="text-xs text-gray-500">
                      {product.deliveredOrders} {language === 'fr' ? 'livrées' : 'delivered'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${
                      product.deliveryRate >= 70 ? 'text-green-600' :
                      product.deliveryRate >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {product.deliveryRate}%
                    </span>
                    {product.deliveryRate >= 70 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-gray-900">
                    {product.totalRevenue.toLocaleString()} DA
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-900">
                    {product.averageOrderValue.toLocaleString()} DA
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{product.quantitySold}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
          </p>
        </div>
      )}
    </div>
  );
}