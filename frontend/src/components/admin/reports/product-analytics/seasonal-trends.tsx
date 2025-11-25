'use client';

import { useLanguage } from '@/lib/language-context';
import { Calendar, TrendingUp } from 'lucide-react';

interface SeasonalTrendsProps {
  data: Array<{
    month: string;
    products: Array<{
      name: string;
      orders: number;
      revenue: number;
    }>;
  }>;
  loading: boolean;
}

export default function SeasonalTrends({ data, loading }: SeasonalTrendsProps) {
  const { language } = useLanguage();

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>
      ))}
    </div>;
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            {language === 'fr' ? 'Tendances Saisonnières' : 'Seasonal Trends'}
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {data.map((month, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">{formatMonth(month.month)}</h4>
                  <span className="text-sm text-gray-600">
                    {month.products.reduce((sum, p) => sum + p.orders, 0)} {language === 'fr' ? 'commandes' : 'orders'}
                  </span>
                </div>
                <div className="space-y-2">
                  {month.products.map((product, pIndex) => (
                    <div key={pIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{product.orders}</div>
                          <div className="text-xs text-gray-500">{language === 'fr' ? 'commandes' : 'orders'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">{product.revenue.toLocaleString()} DA</div>
                          <div className="text-xs text-gray-500">{language === 'fr' ? 'revenu' : 'revenue'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {language === 'fr' ? 'Aucune donnée saisonnière disponible' : 'No seasonal data available'}
          </p>
        </div>
      )}
    </div>
  );
}