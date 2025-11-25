'use client';

import { useLanguage } from '@/lib/language-context';
import { AlertTriangle, XCircle, TrendingDown, RotateCcw } from 'lucide-react';

interface ProductAlertsProps {
  data: {
    underperforming: Array<{
      name: string;
      deliveryRate: number;
      reason: string;
    }>;
    highCancellation: Array<{
      name: string;
      cancellationRate: number;
    }>;
    lowVolume: Array<{
      name: string;
      orders: number;
    }>;
    returnProne: Array<{
      name: string;
      returnRate: number;
    }>;
  } | null;
  loading: boolean;
}

export default function ProductAlerts({ data, loading }: ProductAlertsProps) {
  const { language } = useLanguage();

  if (loading || !data) {
    return <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
      ))}
    </div>;
  }

  const alertSections = [
    {
      title: language === 'fr' ? 'Produits Sous-Performants' : 'Underperforming Products',
      icon: TrendingDown,
      color: 'red',
      data: data.underperforming,
      renderItem: (item: any) => (
        <>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-600">{item.reason}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-red-600">{item.deliveryRate}%</div>
            <div className="text-xs text-gray-500">{language === 'fr' ? 'livraison' : 'delivery'}</div>
          </div>
        </>
      )
    },
    {
      title: language === 'fr' ? 'Taux d\'Annulation Élevé' : 'High Cancellation Rate',
      icon: XCircle,
      color: 'orange',
      data: data.highCancellation,
      renderItem: (item: any) => (
        <>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{item.name}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-orange-600">{item.cancellationRate}%</div>
            <div className="text-xs text-gray-500">{language === 'fr' ? 'annulé' : 'cancelled'}</div>
          </div>
        </>
      )
    },
    {
      title: language === 'fr' ? 'Faible Volume' : 'Low Volume',
      icon: AlertTriangle,
      color: 'yellow',
      data: data.lowVolume,
      renderItem: (item: any) => (
        <>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{item.name}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-yellow-600">{item.orders}</div>
            <div className="text-xs text-gray-500">{language === 'fr' ? 'commandes' : 'orders'}</div>
          </div>
        </>
      )
    },
    {
      title: language === 'fr' ? 'Taux de Retour Élevé' : 'High Return Rate',
      icon: RotateCcw,
      color: 'purple',
      data: data.returnProne,
      renderItem: (item: any) => (
        <>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{item.name}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-purple-600">{item.returnRate}%</div>
            <div className="text-xs text-gray-500">{language === 'fr' ? 'retours' : 'returns'}</div>
          </div>
        </>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {alertSections.map((section, index) => {
        const Icon = section.icon;
        const hasData = section.data && section.data.length > 0;

        return (
          <div key={index} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className={`p-6 border-b border-gray-100 bg-gradient-to-r from-${section.color}-50 to-${section.color}-100`}>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Icon className={`w-5 h-5 mr-2 text-${section.color}-600`} />
                {section.title}
              </h3>
            </div>
            <div className="p-6">
              {hasData ? (
                <div className="space-y-3">
                  {section.data.map((item: any, itemIndex: number) => (
                    <div
                      key={itemIndex}
                      className={`flex items-center justify-between p-4 bg-${section.color}-50 rounded-lg border border-${section.color}-100`}
                    >
                      {section.renderItem(item)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Icon className={`w-12 h-12 text-${section.color}-300 mx-auto mb-3`} />
                  <p className="text-gray-600">
                    {language === 'fr' ? 'Aucune alerte' : 'No alerts'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}