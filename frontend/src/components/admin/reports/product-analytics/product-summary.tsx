'use client';

import { useLanguage } from '@/lib/language-context';
import { Package, ShoppingCart, DollarSign, TrendingUp, Award, AlertTriangle } from 'lucide-react';

interface ProductSummaryProps {
  data: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageProductValue: number;
    bestSeller: { name: string; sku: string; orders: number } | null;
    worstPerformer: { name: string; sku: string; deliveryRate: number } | null;
  } | null;
  loading: boolean;
}

export default function ProductSummary({ data, loading }: ProductSummaryProps) {
  const { language } = useLanguage();

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: language === 'fr' ? 'Total Produits' : 'Total Products',
      value: data.totalProducts,
      icon: Package,
      gradient: 'from-blue-50 to-indigo-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      title: language === 'fr' ? 'Commandes Totales' : 'Total Orders',
      value: data.totalOrders,
      icon: ShoppingCart,
      gradient: 'from-purple-50 to-pink-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      title: language === 'fr' ? 'Revenu Total' : 'Total Revenue',
      value: `${data.totalRevenue.toLocaleString()} DA`,
      icon: DollarSign,
      gradient: 'from-green-50 to-emerald-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      title: language === 'fr' ? 'Valeur Moyenne' : 'Average Value',
      value: `${Math.round(data.averageProductValue).toLocaleString()} DA`,
      icon: TrendingUp,
      gradient: 'from-orange-50 to-amber-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-100'
    },
    {
      title: language === 'fr' ? 'Meilleur Vendeur' : 'Best Seller',
      value: data.bestSeller?.name || 'N/A',
      subtitle: data.bestSeller ? `${data.bestSeller.orders} ${language === 'fr' ? 'commandes' : 'orders'}` : '',
      icon: Award,
      gradient: 'from-yellow-50 to-amber-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-100'
    },
    {
      title: language === 'fr' ? 'Moins Performant' : 'Worst Performer',
      value: data.worstPerformer?.name || 'N/A',
      subtitle: data.worstPerformer ? `${Math.round(data.worstPerformer.deliveryRate)}% ${language === 'fr' ? 'livraison' : 'delivery'}` : '',
      icon: AlertTriangle,
      gradient: 'from-red-50 to-rose-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${card.gradient} rounded-xl p-6 border ${card.borderColor} transition-all hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 text-sm">{card.title}</h4>
              <Icon className={`w-8 h-8 ${card.iconColor}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1 truncate" title={card.value.toString()}>
              {card.value}
            </div>
            {card.subtitle && (
              <div className="text-sm text-gray-600">{card.subtitle}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}