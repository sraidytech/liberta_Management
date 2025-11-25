'use client';

import { useLanguage } from '@/lib/language-context';
import { DollarSign, PieChart } from 'lucide-react';

interface RevenueContributionProps {
  data: Array<{
    name: string;
    revenue: number;
    percentage: number;
  }>;
  loading: boolean;
}

export default function RevenueContribution({ data, loading }: RevenueContributionProps) {
  const { language } = useLanguage();

  if (loading) {
    return <div className="animate-pulse">
      <div className="h-64 bg-gray-100 rounded-xl"></div>
    </div>;
  }

  const getColorClass = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-blue-600" />
          {language === 'fr' ? 'Contribution au Revenu' : 'Revenue Contribution'}
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {data.slice(0, 10).map((product, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 truncate flex-1 mr-4">
                  {product.name}
                </span>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-gray-900">
                    {product.revenue.toLocaleString()} DA
                  </span>
                  <span className="font-semibold text-blue-600 min-w-[60px] text-right">
                    {product.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${getColorClass(index)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(product.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {language === 'fr' ? 'Aucune donnée de revenu disponible' : 'No revenue data available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}