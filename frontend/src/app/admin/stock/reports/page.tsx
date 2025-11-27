'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Button } from '@/components/ui/button';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3,
  Download,
  Filter,
  Activity,
  AlertTriangle,
  Warehouse,
  ChevronDown
} from 'lucide-react';
import {
  AnalyticsFilters,
  OverviewSection,
  MovementSection,
  HealthSection,
  WarehouseSection,
  translations
} from '@/components/stock/analytics';
import type {
  AnalyticsFilters as FiltersType,
  OverviewData,
  MovementData,
  HealthData,
  WarehouseData,
  Warehouse as WarehouseType,
  TabType
} from '@/components/stock/analytics/types';

export default function AnalyticsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const labels = translations[language as 'en' | 'fr'];

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersType>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    categoryId: '',
    productId: '',
  });

  // Data state
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [movementData, setMovementData] = useState<MovementData | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [warehouseData, setWarehouseData] = useState<WarehouseData | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch warehouses and categories on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [warehousesRes, productsRes] = await Promise.all([
          stockService.getWarehouses(),
          stockService.getProducts({ limit: 1000 })
        ]);
        setWarehouses(warehousesRes || []);
        
        // Extract unique categories
        const cats = new Set<string>();
        (productsRes?.products || []).forEach((p: any) => {
          if (p.category) cats.add(p.category);
        });
        setCategories(Array.from(cats));
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const filterParams = {
          startDate: filters.startDate,
          endDate: filters.endDate,
          warehouseId: filters.warehouseId || undefined,
        };

        switch (activeTab) {
          case 'overview':
            const overview = await stockService.getOverviewAnalytics(filterParams);
            setOverviewData(overview);
            break;
          case 'movements':
            const movements = await stockService.getMovementAnalytics(filterParams);
            setMovementData(movements);
            break;
          case 'health':
            const health = await stockService.getHealthAnalytics({
              warehouseId: filters.warehouseId || undefined
            });
            setHealthData(health);
            break;
          case 'warehouses':
            const warehouse = await stockService.getWarehouseAnalytics(filterParams);
            setWarehouseData(warehouse);
            break;
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [activeTab, filters, user]);

  // Handle export
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const blob = await stockService.exportAnalytics(activeTab, {
        ...filters,
        format
      });
      
      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-analytics-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      warehouseId: '',
      categoryId: '',
      productId: '',
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">{labels.loading}</p>
        </div>
      </div>
    );
  }

  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  // Tab configuration
  const tabs = [
    { key: 'overview' as TabType, label: labels.overview, icon: BarChart3 },
    { key: 'movements' as TabType, label: labels.movements, icon: Activity },
    { key: 'health' as TabType, label: labels.health, icon: AlertTriangle },
    { key: 'warehouses' as TabType, label: labels.warehouses, icon: Warehouse },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filters.startDate} → {filters.endDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 border-gray-200 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              {labels.filters}
              {(filters.warehouseId || filters.categoryId) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {[filters.warehouseId, filters.categoryId].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Download className="w-4 h-4" />
              {labels.exportCSV}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <AnalyticsFilters
            filters={filters}
            setFilters={setFilters}
            warehouses={warehouses}
            categories={categories}
            language={language as 'en' | 'fr'}
            onReset={resetFilters}
          />
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'overview' && (
            <OverviewSection
              data={overviewData}
              loading={loading}
              language={language as 'en' | 'fr'}
            />
          )}
          {activeTab === 'movements' && (
            <MovementSection
              data={movementData}
              loading={loading}
              language={language as 'en' | 'fr'}
            />
          )}
          {activeTab === 'health' && (
            <HealthSection
              data={healthData}
              loading={loading}
              language={language as 'en' | 'fr'}
            />
          )}
          {activeTab === 'warehouses' && (
            <WarehouseSection
              data={warehouseData}
              loading={loading}
              language={language as 'en' | 'fr'}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
