'use client';

import { useLanguage } from '@/lib/language-context';
import { MapPin, Store, Users } from 'lucide-react';

interface GeographicProductsProps {
  data: Array<{
    wilaya: string;
    products: Array<{
      name: string;
      orders: number;
      revenue: number;
      deliveryRate: number;
    }>;
  }>;
  storeData: Array<{
    store: string;
    products: Array<{
      name: string;
      orders: number;
      revenue: number;
    }>;
  }>;
  agentData: Array<{
    agentName: string;
    agentCode: string;
    products: Array<{
      name: string;
      orders: number;
      deliveryRate: number;
    }>;
  }>;
  loading: boolean;
}

export default function GeographicProducts({ data, storeData, agentData, loading }: GeographicProductsProps) {
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
      {/* Products by Wilaya */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            {language === 'fr' ? 'Produits par Wilaya' : 'Products by Wilaya'}
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {data.slice(0, 5).map((wilaya, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{wilaya.wilaya}</h4>
                <div className="space-y-2">
                  {wilaya.products.slice(0, 5).map((product, pIndex) => (
                    <div key={pIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{product.name}</span>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">{product.orders} {language === 'fr' ? 'cmd' : 'orders'}</span>
                        <span className="font-semibold text-blue-600">{product.revenue.toLocaleString()} DA</span>
                        <span className={`font-semibold ${product.deliveryRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {product.deliveryRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products by Store */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Store className="w-5 h-5 mr-2 text-green-600" />
            {language === 'fr' ? 'Produits par Boutique' : 'Products by Store'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {storeData.map((store, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{store.store}</h4>
                <div className="space-y-2">
                  {store.products.slice(0, 5).map((product, pIndex) => (
                    <div key={pIndex} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{product.name}</span>
                      <span className="font-semibold text-green-600">{product.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products by Agent */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            {language === 'fr' ? 'Produits par Agent' : 'Products by Agent'}
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agentData.slice(0, 6).map((agent, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{agent.agentName}</h4>
                  <span className="text-xs text-gray-500">{agent.agentCode}</span>
                </div>
                <div className="space-y-2">
                  {agent.products.slice(0, 3).map((product, pIndex) => (
                    <div key={pIndex} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate flex-1 mr-2">{product.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">{product.orders}</span>
                        <span className={`font-semibold ${product.deliveryRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {product.deliveryRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}