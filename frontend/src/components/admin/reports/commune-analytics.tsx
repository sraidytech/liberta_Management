'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import {
  MapPin,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface CommuneData {
  wilaya: string;
  summary: {
    totalCommunes: number;
    topCommune: string | null;
    totalOrders: number;
    totalRevenue: number;
    totalDeliveredOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
  };
  ordersByCommune: Array<{
    commune: string;
    wilaya: string;
    orders: number;
    revenue: number;
  }>;
  revenueByCommune: Array<{
    commune: string;
    wilaya: string;
    revenue: number;
  }>;
  customersByCommune: Array<{
    commune: string;
    wilaya: string;
    customers: number;
  }>;
}

interface CommuneAnalyticsProps {
  data: CommuneData | null;
  loading: boolean;
  onBack: () => void;
}

export default function CommuneAnalytics({ data, loading, onBack }: CommuneAnalyticsProps) {
  const { language } = useLanguage();
  const [sortBy, setSortBy] = useState<'orders' | 'revenue' | 'customers'>('orders');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'fr' ? 'Retour aux Wilayas' : 'Back to Wilayas'}</span>
          </button>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">
              {language === 'fr' ? 'Chargement des données des communes...' : 'Loading commune data...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'fr' ? 'Retour aux Wilayas' : 'Back to Wilayas'}</span>
          </button>
        </div>
        
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {language === 'fr' ? 'Aucune donnée disponible' : 'No Data Available'}
          </h3>
          <p className="text-gray-600">
            {language === 'fr' ? 'Aucune donnée de commune trouvée pour cette wilaya.' : 'No commune data found for this wilaya.'}
          </p>
        </div>
      </div>
    );
  }

  // Sort commune data based on selected criteria
  const sortedCommunes = [...data.ordersByCommune].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.revenue - a.revenue;
      case 'customers':
        const aCustomers = data.customersByCommune.find(c => c.commune === a.commune)?.customers || 0;
        const bCustomers = data.customersByCommune.find(c => c.commune === b.commune)?.customers || 0;
        return bCustomers - aCustomers;
      default:
        return b.orders - a.orders;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'fr' ? 'Retour aux Wilayas' : 'Back to Wilayas'}</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'fr' ? `Communes de ${data.wilaya}` : `Communes in ${data.wilaya}`}
          </h2>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              {language === 'fr' ? 'Chiffre d\'Affaires' : 'Total Revenue'}
            </h4>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {data.summary.totalRevenue.toLocaleString()} DA
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {language === 'fr' ? 'Commandes livrées' : 'Delivered orders'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              {language === 'fr' ? 'Commandes Totales' : 'Total Orders'}
            </h4>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {data.summary.totalOrders}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {language === 'fr' ? 'Toutes les commandes' : 'All orders'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              {language === 'fr' ? 'Valeur Moyenne' : 'Average Order Value'}
            </h4>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {data.summary.averageOrderValue.toLocaleString()} DA
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {language === 'fr' ? 'Par commande' : 'Per order'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              {language === 'fr' ? 'Communes Actives' : 'Active Communes'}
            </h4>
            <MapPin className="w-8 h-8 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {data.summary.totalCommunes}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {language === 'fr' ? 'Avec commandes' : 'With orders'}
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">
          {language === 'fr' ? 'Trier par:' : 'Sort by:'}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => setSortBy('orders')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'orders'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {language === 'fr' ? 'Commandes' : 'Orders'}
          </button>
          <button
            onClick={() => setSortBy('revenue')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'revenue'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {language === 'fr' ? 'Chiffre d\'Affaires' : 'Revenue'}
          </button>
          <button
            onClick={() => setSortBy('customers')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'customers'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {language === 'fr' ? 'Clients' : 'Customers'}
          </button>
        </div>
      </div>

      {/* Commune Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedCommunes.map((commune, index) => {
          const customers = data.customersByCommune.find(c => c.commune === commune.commune)?.customers || 0;
          const averageOrderValue = commune.orders > 0 ? commune.revenue / commune.orders : 0;
          
          return (
            <div
              key={commune.commune}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 truncate">
                    {commune.commune}
                  </h3>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  #{index + 1}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'fr' ? 'Commandes' : 'Orders'}
                  </span>
                  <span className="font-semibold text-blue-600">
                    {commune.orders}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'fr' ? 'Chiffre d\'Affaires' : 'Revenue'}
                  </span>
                  <span className="font-semibold text-green-600">
                    {commune.revenue.toLocaleString()} DA
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'fr' ? 'Clients' : 'Customers'}
                  </span>
                  <span className="font-semibold text-purple-600">
                    {customers}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'fr' ? 'Valeur Moy.' : 'Avg. Value'}
                  </span>
                  <span className="font-semibold text-orange-600">
                    {averageOrderValue.toLocaleString()} DA
                  </span>
                </div>
              </div>

              {/* Progress bar for relative performance */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {language === 'fr' ? 'Performance' : 'Performance'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {((commune.orders / Math.max(...sortedCommunes.map(c => c.orders))) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(commune.orders / Math.max(...sortedCommunes.map(c => c.orders))) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Performers Summary */}
      {sortedCommunes.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            {language === 'fr' ? 'Top Performers' : 'Top Performers'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {sortedCommunes[0]?.commune}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Plus de commandes' : 'Most Orders'}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {sortedCommunes[0]?.orders} {language === 'fr' ? 'commandes' : 'orders'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {[...sortedCommunes].sort((a, b) => b.revenue - a.revenue)[0]?.commune}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Plus de revenus' : 'Highest Revenue'}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {[...sortedCommunes].sort((a, b) => b.revenue - a.revenue)[0]?.revenue.toLocaleString()} DA
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {[...sortedCommunes].sort((a, b) => {
                  const aCustomers = data.customersByCommune.find(c => c.commune === a.commune)?.customers || 0;
                  const bCustomers = data.customersByCommune.find(c => c.commune === b.commune)?.customers || 0;
                  return bCustomers - aCustomers;
                })[0]?.commune}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'fr' ? 'Plus de clients' : 'Most Customers'}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {Math.max(...data.customersByCommune.map(c => c.customers))} {language === 'fr' ? 'clients' : 'customers'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}