'use client';

import { useLanguage } from '@/lib/language-context';
import { ShoppingBag, Users, RefreshCw } from 'lucide-react';

interface ProductCombinationsProps {
  data: Array<{
    product1: string;
    product2: string;
    frequency: number;
    combinedRevenue: number;
  }>;
  firstPurchase: Array<{ name: string; count: number }>;
  repeatPurchase: Array<{ name: string; repeatRate: number }>;
  loading: boolean;
}

export default function ProductCombinations({ data, firstPurchase, repeatPurchase, loading }: ProductCombinationsProps) {
  const { language } = useLanguage();

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Frequently Bought Together */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
            {language === 'fr' ? 'Fréquemment Achetés Ensemble' : 'Frequently Bought Together'}
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {data.slice(0, 10).map((combo, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{combo.product1}</div>
                  <div className="text-sm text-gray-600">+ {combo.product2}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600">{combo.frequency}x</div>
                  <div className="text-sm text-gray-600">{combo.combinedRevenue.toLocaleString()} DA</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* First Purchase Products */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-600" />
            {language === 'fr' ? 'Produits de Premier Achat' : 'First Purchase Products'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {firstPurchase.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">{product.name}</span>
                <span className="font-semibold text-green-600">{product.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Repeat Purchase Products */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 text-purple-600" />
            {language === 'fr' ? 'Produits à Achats Répétés' : 'Repeat Purchase Products'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repeatPurchase.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <span className="font-medium text-gray-900">{product.name}</span>
                <span className="font-semibold text-purple-600">{product.repeatRate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}