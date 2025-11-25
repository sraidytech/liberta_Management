'use client';

import { useState, lazy, Suspense } from 'react';
import { useLanguage } from '@/lib/language-context';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Truck,
  Users,
  BarChart3,
  ShoppingBag,
  DollarSign,
  Activity
} from 'lucide-react';
import ProductSummary from './product-analytics/product-summary';

// Lazy load heavy components
const ProductTable = lazy(() => import('./product-analytics/product-table'));
const PackAnalysis = lazy(() => import('./product-analytics/pack-analysis'));
const ProductCombinations = lazy(() => import('./product-analytics/product-combinations'));
const GeographicProducts = lazy(() => import('./product-analytics/geographic-products'));
const ShippingAnalysis = lazy(() => import('./product-analytics/shipping-analysis'));
const ProductAlerts = lazy(() => import('./product-analytics/product-alerts'));
const SeasonalTrends = lazy(() => import('./product-analytics/seasonal-trends'));
const RevenueContribution = lazy(() => import('./product-analytics/revenue-contribution'));

// Loading component
const TabLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

interface ProductAnalyticsProps {
  data: any;
  loading: boolean;
  filters: any;
}

export default function ProductAnalytics({ data, loading, filters }: ProductAnalyticsProps) {
  const { language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'packs' | 'combinations' | 'geography' | 'shipping' | 'insights' | 'alerts'>('overview');

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">
            {language === 'fr' ? 'Chargement des analyses produits...' : 'Loading product analytics...'}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          {language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: language === 'fr' ? 'Vue d\'ensemble' : 'Overview', icon: BarChart3 },
    { id: 'packs', label: language === 'fr' ? 'Analyse Packs' : 'Pack Analysis', icon: Package },
    { id: 'combinations', label: language === 'fr' ? 'Combinaisons' : 'Combinations', icon: ShoppingBag },
    { id: 'geography', label: language === 'fr' ? 'Géographie' : 'Geography', icon: MapPin },
    { id: 'shipping', label: language === 'fr' ? 'Livraison' : 'Shipping', icon: Truck },
    { id: 'insights', label: language === 'fr' ? 'Insights' : 'Insights', icon: TrendingUp },
    { id: 'alerts', label: language === 'fr' ? 'Alertes' : 'Alerts', icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <ProductSummary data={data.summary} loading={loading} />

      {/* Sub-Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeSubTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content with Lazy Loading */}
        <div className="p-6">
          <Suspense fallback={<TabLoading />}>
            {activeSubTab === 'overview' && (
              <div className="space-y-6">
                <ProductTable products={data.products} loading={loading} />
                <RevenueContribution data={data.revenueContribution} loading={loading} />
              </div>
            )}
            
            {activeSubTab === 'packs' && (
              <PackAnalysis data={data.packAnalysis} products={data.products} loading={loading} />
            )}
            
            {activeSubTab === 'combinations' && (
              <ProductCombinations
                data={data.frequentlyBoughtTogether}
                firstPurchase={data.firstPurchaseProducts}
                repeatPurchase={data.repeatPurchaseProducts}
                loading={loading}
              />
            )}
            
            {activeSubTab === 'geography' && (
              <GeographicProducts
                data={data.productsByWilaya}
                storeData={data.productsByStore}
                agentData={data.productsByAgent}
                loading={loading}
              />
            )}
            
            {activeSubTab === 'shipping' && (
              <ShippingAnalysis data={data.productsByShipping} loading={loading} />
            )}
            
            {activeSubTab === 'insights' && (
              <SeasonalTrends data={data.seasonalTrends} loading={loading} />
            )}
            
            {activeSubTab === 'alerts' && (
              <ProductAlerts data={data.alerts} loading={loading} />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}