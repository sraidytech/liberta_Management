'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import {
  BarChart2,
  TrendingUp,
  Activity,
  Warehouse,
  Filter
} from 'lucide-react';
import { AnalyticsFilters } from '@/components/stock/analytics/AnalyticsFilters';
import OverviewSection from '@/components/stock/analytics/sections/OverviewSection';
import MovementSection from '@/components/stock/analytics/sections/MovementSection';
import HealthSection from '@/components/stock/analytics/sections/HealthSection';
import WarehouseSection from '@/components/stock/analytics/sections/WarehouseSection';
import { stockService } from '@/services/stock.service';
import {
  AnalyticsFilters as FilterType,
  OverviewData,
  MovementData,
  HealthData,
  WarehouseData,
  TabType,
  Warehouse as WarehouseType
} from '@/components/stock/analytics/types';
import { translations } from '@/components/stock/analytics/constants';
import { useLanguage } from '@/lib/language-context';

export default function AnalyticsPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [movementData, setMovementData] = useState<MovementData | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [warehouseData, setWarehouseData] = useState<WarehouseData | null>(null);

  // Metadata states
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);

  // Filters state
  const [filters, setFilters] = useState<FilterType>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    warehouseId: '',
  });

  const labels = translations[language];

  const tabs = [
    { key: 'overview', label: labels.overview, icon: BarChart2 },
    { key: 'movements', label: labels.movements, icon: TrendingUp },
    { key: 'health', label: labels.health, icon: Activity },
    { key: 'warehouses', label: labels.warehouses, icon: Warehouse },
  ];

  // Fetch metadata (warehouses)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const warehousesRes = await stockService.getWarehouses();

        // Handle warehouses response
        if (Array.isArray(warehousesRes)) {
          setWarehouses(warehousesRes);
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, filters]);

  // Clean filters - remove empty values and convert to proper format
  const getCleanFilters = () => {
    return {
      startDate: filters.startDate ? filters.startDate.split('T')[0] : undefined,
      endDate: filters.endDate ? filters.endDate.split('T')[0] : undefined,
      warehouseId: filters.warehouseId || undefined,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const cleanFilters = getCleanFilters();
      console.log('Fetching analytics data with filters:', cleanFilters);
      
      switch (activeTab) {
        case 'overview':
          const overview = await stockService.getOverviewAnalytics(cleanFilters);
          console.log('Overview data received:', overview);
          setOverviewData(overview);
          break;
        case 'movements':
          const movements = await stockService.getMovementAnalytics(cleanFilters);
          console.log('Movement data received:', movements);
          setMovementData(movements);
          break;
        case 'health':
          const health = await stockService.getHealthAnalytics({ warehouseId: cleanFilters.warehouseId });
          console.log('Health data received:', health);
          setHealthData(health);
          break;
        case 'warehouses':
          const warehousesData = await stockService.getWarehouseAnalytics(cleanFilters);
          console.log('Warehouse data received:', warehousesData);
          setWarehouseData(warehousesData);
          break;
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      warehouseId: '',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border ${showFilters
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <AnalyticsFilters
            filters={filters}
            setFilters={setFilters}
            warehouses={warehouses}
            language={language}
            onReset={handleResetFilters}
          />
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
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
              language={language}
            />
          )}
          {activeTab === 'movements' && (
            <MovementSection
              data={movementData}
              loading={loading}
              language={language}
            />
          )}
          {activeTab === 'health' && (
            <HealthSection
              data={healthData}
              loading={loading}
              language={language}
            />
          )}
          {activeTab === 'warehouses' && (
            <WarehouseSection
              data={warehouseData}
              loading={loading}
              language={language}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
