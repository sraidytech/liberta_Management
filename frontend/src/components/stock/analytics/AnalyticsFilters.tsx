'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Calendar } from 'lucide-react';
import { AnalyticsFilters as FiltersType, Warehouse } from './types';
import { datePresets, translations } from './constants';

interface AnalyticsFiltersProps {
  filters: FiltersType;
  setFilters: (filters: FiltersType) => void;
  warehouses: Warehouse[];
  categories: string[];
  language: 'en' | 'fr';
  onReset: () => void;
}

export const AnalyticsFilters = ({
  filters,
  setFilters,
  warehouses,
  categories,
  language,
  onReset
}: AnalyticsFiltersProps) => {
  const labels = translations[language];
  const [selectedPreset, setSelectedPreset] = useState('last30Days');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const handlePresetSelect = (preset: string) => {
    if (preset === 'custom') {
      setShowCustomRange(true);
      setSelectedPreset('custom');
      return;
    }

    setShowCustomRange(false);
    setSelectedPreset(preset);
    const endDate = new Date();
    let startDate = new Date();

    switch (preset) {
      case 'today':
        startDate = new Date();
        break;
      case 'last7Days':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30Days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90Days':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    setFilters({
      ...filters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters({ ...filters, [field]: value });
    setSelectedPreset('custom');
    setShowCustomRange(true);
  };

  return (
    <Card className="p-5 border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
      <div className="space-y-4">
        {/* Date Range Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            {labels.dateRange}
          </label>
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {datePresets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetSelect(preset.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedPreset === preset.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {labels[preset.key as keyof typeof labels]}
              </button>
            ))}
            <button
              onClick={() => handlePresetSelect('custom')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                selectedPreset === 'custom'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {labels.custom}
            </button>
          </div>

          {/* Custom Date Range Inputs */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300 ${
            showCustomRange || selectedPreset === 'custom' ? 'opacity-100' : 'opacity-50'
          }`}>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {labels.from}
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {labels.to}
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Additional Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Warehouse Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {labels.warehouse}
            </label>
            <select
              value={filters.warehouseId}
              onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-all"
            >
              <option value="">{labels.allWarehouses}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {labels.category}
            </label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-all"
            >
              <option value="">{labels.allCategories}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
              {labels.reset}
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(filters.warehouseId || filters.categoryId) && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {filters.warehouseId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {warehouses.find(w => w.id === filters.warehouseId)?.name || filters.warehouseId}
                <button
                  onClick={() => setFilters({ ...filters, warehouseId: '' })}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.categoryId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                {filters.categoryId}
                <button
                  onClick={() => setFilters({ ...filters, categoryId: '' })}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AnalyticsFilters;