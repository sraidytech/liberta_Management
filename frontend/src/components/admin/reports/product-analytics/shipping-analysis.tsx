'use client';

import { useLanguage } from '@/lib/language-context';
import { Truck, Clock, TrendingUp } from 'lucide-react';

interface ShippingAnalysisProps {
  data: Array<{
    shippingCompany: string;
    products: Array<{
      name: string;
      orders: number;
      deliveryRate: number;
      avgDeliveryTime: number | null;
    }>;
  }>;
  loading: boolean;
}

export default function ShippingAnalysis({ data, loading }: ShippingAnalysisProps) {
  const { language } = useLanguage();

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {data.map((shipping, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-blue-600" />
              {shipping.shippingCompany}
            </h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      {language === 'fr' ? 'Produit' : 'Product'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      {language === 'fr' ? 'Commandes' : 'Orders'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      {language === 'fr' ? 'Taux Livraison' : 'Delivery Rate'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      {language === 'fr' ? 'Délai Moyen' : 'Avg. Time'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipping.products.map((product, pIndex) => (
                    <tr key={pIndex} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{product.orders}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold ${
                            product.deliveryRate >= 70 ? 'text-green-600' :
                            product.deliveryRate >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {product.deliveryRate}%
                          </span>
                          {product.deliveryRate >= 70 && (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.avgDeliveryTime ? (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">
                              {product.avgDeliveryTime} {language === 'fr' ? 'jours' : 'days'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {data.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {language === 'fr' ? 'Aucune donnée de livraison disponible' : 'No shipping data available'}
          </p>
        </div>
      )}
    </div>
  );
}