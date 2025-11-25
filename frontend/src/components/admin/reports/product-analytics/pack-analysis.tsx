'use client';

import { useLanguage } from '@/lib/language-context';
import { Package, TrendingUp, Award, BarChart3 } from 'lucide-react';

interface PackAnalysisProps {
  data: {
    bySize: Array<{
      size: number;
      orders: number;
      revenue: number;
      deliveryRate: number;
      revenuePerOrder: number;
    }>;
    packVsSingle: {
      packOrders: number;
      singleOrders: number;
      packRevenue: number;
      singleRevenue: number;
    };
    optimalPackSize: {
      size: number;
      reason: string;
    } | null;
  } | null;
  products: any[];
  loading: boolean;
}

export default function PackAnalysis({ data, products, loading }: PackAnalysisProps) {
  const { language } = useLanguage();

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalOrders = data.packVsSingle.packOrders + data.packVsSingle.singleOrders;
  const totalRevenue = data.packVsSingle.packRevenue + data.packVsSingle.singleRevenue;
  const packPercentage = totalOrders > 0 ? (data.packVsSingle.packOrders / totalOrders) * 100 : 0;
  const packRevenuePercentage = totalRevenue > 0 ? (data.packVsSingle.packRevenue / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Pack vs Single Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'fr' ? 'Packs' : 'Packs'}
            </h3>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {data.packVsSingle.packOrders}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Commandes' : 'Orders'} ({Math.round(packPercentage)}%)
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.packVsSingle.packRevenue.toLocaleString()} DA
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Revenu' : 'Revenue'} ({Math.round(packRevenuePercentage)}%)
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'fr' ? 'Produits Simples' : 'Single Products'}
            </h3>
            <Package className="w-8 h-8 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {data.packVsSingle.singleOrders}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Commandes' : 'Orders'} ({Math.round(100 - packPercentage)}%)
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.packVsSingle.singleRevenue.toLocaleString()} DA
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Revenu' : 'Revenue'} ({Math.round(100 - packRevenuePercentage)}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimal Pack Size */}
      {data.optimalPackSize && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
          <div className="flex items-center space-x-3 mb-3">
            <Award className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'fr' ? 'Taille de Pack Optimale' : 'Optimal Pack Size'}
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-4xl font-bold text-yellow-600">
              {data.optimalPackSize.size}
            </div>
            <div className="flex-1">
              <p className="text-gray-700">{data.optimalPackSize.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pack Size Performance */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            {language === 'fr' ? 'Performance par Taille de Pack' : 'Performance by Pack Size'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {language === 'fr' ? 'Taille' : 'Size'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {language === 'fr' ? 'Commandes' : 'Orders'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {language === 'fr' ? 'Revenu' : 'Revenue'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {language === 'fr' ? 'Taux Livraison' : 'Delivery Rate'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {language === 'fr' ? 'Revenu/Commande' : 'Revenue/Order'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.bySize.map((pack, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Pack {pack.size}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{pack.orders}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {pack.revenue.toLocaleString()} DA
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${
                        pack.deliveryRate >= 70 ? 'text-green-600' :
                        pack.deliveryRate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(pack.deliveryRate)}%
                      </span>
                      {pack.deliveryRate >= 70 && (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {Math.round(pack.revenuePerOrder).toLocaleString()} DA
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.bySize.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {language === 'fr' ? 'Aucun pack trouvé' : 'No packs found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}