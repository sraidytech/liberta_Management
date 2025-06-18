'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { BarChart3, TrendingUp, Calendar, Activity } from 'lucide-react';

interface ChartData {
  date: string;
  orders: number;
  revenue: number;
}

interface DashboardChartProps {
  data: ChartData[];
  onPeriodChange?: (period: string) => void;
  selectedPeriod?: string;
}

export default function DashboardChart({ data, onPeriodChange, selectedPeriod = '7d' }: DashboardChartProps) {
  const { language } = useLanguage();
  const [activeMetric, setActiveMetric] = useState<'orders' | 'revenue'>('orders');

  const periods = [
    { value: '7d', label: language === 'fr' ? '7 jours' : '7 days' },
    { value: '30d', label: language === 'fr' ? '30 jours' : '30 days' },
    { value: '90d', label: language === 'fr' ? '90 jours' : '90 days' },
  ];

  // Debug data
  useEffect(() => {
    if (data && data.length > 0) {
      console.log('Chart data received:', data);
      console.log('Total orders in data:', data.reduce((sum, item) => sum + item.orders, 0));
      console.log('Total revenue in data:', data.reduce((sum, item) => sum + item.revenue, 0));
    }
  }, [data]);

  // Process and limit data to prevent overflow
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Strict limits to prevent overflow
    let maxBars = 7;
    if (selectedPeriod === '30d') maxBars = 12; // Show every 2.5 days
    if (selectedPeriod === '90d') maxBars = 15; // Show every 6 days
    
    if (sortedData.length <= maxBars) {
      return sortedData;
    }
    
    // Smart sampling to fit within screen
    const step = sortedData.length / maxBars;
    const sampledData = [];
    
    for (let i = 0; i < maxBars; i++) {
      const index = Math.floor(i * step);
      if (index < sortedData.length) {
        sampledData.push(sortedData[index]);
      }
    }
    
    // Always include the last data point if not already included
    const lastItem = sortedData[sortedData.length - 1];
    if (sampledData.length > 0 && sampledData[sampledData.length - 1].date !== lastItem.date) {
      sampledData[sampledData.length - 1] = lastItem;
    }
    
    return sampledData;
  }, [data, selectedPeriod]);

  // Calculate max value for scaling using all data (not just processed)
  const maxOrders = data.length > 0 ? Math.max(...data.map(d => d.orders)) : 0;
  const maxRevenue = data.length > 0 ? Math.max(...data.map(d => d.revenue)) : 0;
  const maxValue = activeMetric === 'orders' ? maxOrders : maxRevenue;

  // Generate Y-axis labels
  const generateYAxisLabels = () => {
    if (maxValue === 0) return [0];
    
    const steps = 5;
    const stepValue = Math.ceil(maxValue / steps);
    const labels = [];
    
    for (let i = 0; i <= steps; i++) {
      labels.push(i * stepValue);
    }
    
    return labels.reverse(); // Highest to lowest
  };

  const yAxisLabels = generateYAxisLabels();

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M DA`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K DA`;
    }
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format Y-axis labels
  const formatYAxisLabel = (value: number) => {
    if (activeMetric === 'orders') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
      }
      return value.toString();
    } else {
      return formatCurrency(value);
    }
  };

  // Format date based on period
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (selectedPeriod === '7d') {
      return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    } else if (selectedPeriod === '30d') {
      return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    } else {
      return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Calculate percentage for bar height
  const getBarHeight = (value: number) => {
    if (maxValue === 0) return 0;
    return Math.max((value / maxValue) * 100, 2);
  };

  // Get gradient colors based on metric
  const getGradientColors = () => {
    if (activeMetric === 'orders') {
      return 'from-blue-500 to-blue-600';
    }
    return 'from-emerald-500 to-emerald-600';
  };

  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { value: 0, isPositive: true };
    
    const recent = data.slice(-Math.min(7, Math.floor(data.length / 2)));
    const previous = data.slice(0, Math.min(7, Math.floor(data.length / 2)));
    
    if (previous.length === 0) return { value: 0, isPositive: true };
    
    const recentAvg = recent.reduce((sum, item) => 
      sum + (activeMetric === 'orders' ? item.orders : item.revenue), 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => 
      sum + (activeMetric === 'orders' ? item.orders : item.revenue), 0) / previous.length;
    
    const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
  };

  const trend = calculateTrend();

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              {language === 'fr' ? 'Tendances' : 'Trends'}
            </h2>
            <p className="text-sm lg:text-base text-gray-600">
              {language === 'fr' ? 'Performance au fil du temps' : 'Performance over time'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Metric Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner w-full sm:w-auto">
            <button
              onClick={() => setActiveMetric('orders')}
              className={`flex-1 sm:flex-none px-3 lg:px-4 py-2 lg:py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeMetric === 'orders'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>{language === 'fr' ? 'Commandes' : 'Orders'}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveMetric('revenue')}
              className={`flex-1 sm:flex-none px-3 lg:px-4 py-2 lg:py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeMetric === 'revenue'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>{language === 'fr' ? 'Revenus' : 'Revenue'}</span>
              </div>
            </button>
          </div>

          {/* Period Selector */}
          <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner w-full sm:w-auto">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => onPeriodChange?.(period.value)}
                className={`flex-1 sm:flex-none px-3 lg:px-4 py-2 lg:py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  selectedPeriod === period.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative w-full overflow-hidden">
        {processedData.length === 0 ? (
          <div className="flex items-center justify-center h-64 lg:h-80 bg-gray-50 rounded-2xl">
            <div className="text-center">
              <Calendar className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg lg:text-xl font-medium text-gray-500 mb-2">
                {language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}
              </p>
              <p className="text-sm lg:text-base text-gray-400">
                {language === 'fr' ? 'Les données apparaîtront ici une fois disponibles' : 'Data will appear here once available'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chart Area with Y-Axis */}
            <div className="relative bg-white rounded-2xl p-4 lg:p-6 mb-6 lg:mb-8 border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex w-full">
                {/* Y-Axis */}
                <div className="flex flex-col justify-between h-64 lg:h-80 pr-3 lg:pr-4 py-2 flex-shrink-0">
                  {yAxisLabels.map((label, index) => (
                    <div key={index} className="flex items-center">
                      <span className="text-xs lg:text-sm text-gray-500 font-medium min-w-12 lg:min-w-16 text-right">
                        {formatYAxisLabel(label)}
                      </span>
                      <div className="w-2 h-px bg-gray-300 ml-2"></div>
                    </div>
                  ))}
                </div>

                {/* Chart Bars Container */}
                <div className="flex-1 relative min-w-0">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between py-2">
                    {yAxisLabels.map((_, index) => (
                      <div key={index} className="w-full h-px bg-gray-100"></div>
                    ))}
                  </div>

                  {/* Bars Container - Fixed width to prevent overflow */}
                  <div className="relative flex items-end justify-center h-64 lg:h-80 px-2 lg:px-4 overflow-hidden">
                    <div className="flex items-end justify-center space-x-1 lg:space-x-2 w-full">
                      {processedData.map((item, index) => {
                        const value = activeMetric === 'orders' ? item.orders : item.revenue;
                        const heightPercentage = getBarHeight(value);
                        const heightPx = (heightPercentage / 100) * (window.innerWidth >= 1024 ? 320 : 256);
                        
                        return (
                          <div key={index} className="flex flex-col items-center group flex-1 max-w-16 lg:max-w-20">
                            {/* Bar */}
                            <div className="relative w-full">
                              <div
                                className={`w-full bg-gradient-to-t ${getGradientColors()} rounded-t-lg transition-all duration-500 hover:opacity-90 cursor-pointer shadow-lg group-hover:shadow-xl relative`}
                                style={{ 
                                  height: `${Math.max(heightPx, 8)}px`,
                                  minHeight: '8px'
                                }}
                              >
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                                  <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-xl">
                                    <div className="font-bold text-center mb-1">
                                      {formatDate(item.date)}
                                    </div>
                                    <div className="text-gray-300 text-center">
                                      {activeMetric === 'orders' 
                                        ? `${item.orders.toLocaleString()} ${language === 'fr' ? 'commandes' : 'orders'}`
                                        : formatCurrency(item.revenue)
                                      }
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Date Label */}
                            <div className="text-xs text-gray-600 mt-2 text-center font-medium w-full truncate">
                              {formatDate(item.date)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* X-Axis Label */}
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500 font-medium">
                  {language === 'fr' ? 'Période' : 'Time Period'}
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {language === 'fr' ? 'Total' : 'Total'}
                  </p>
                </div>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {activeMetric === 'orders' 
                    ? data.reduce((sum, item) => sum + item.orders, 0).toLocaleString()
                    : formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))
                  }
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {language === 'fr' ? 'Moyenne' : 'Average'}
                  </p>
                </div>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {activeMetric === 'orders' 
                    ? Math.round(data.reduce((sum, item) => sum + item.orders, 0) / data.length).toLocaleString()
                    : formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0) / data.length)
                  }
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {language === 'fr' ? 'Maximum' : 'Peak'}
                  </p>
                </div>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {activeMetric === 'orders' 
                    ? maxOrders.toLocaleString()
                    : formatCurrency(maxRevenue)
                  }
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-8 h-8 lg:w-10 lg:h-10 ${trend.isPositive ? 'bg-emerald-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                    <TrendingUp className={`w-4 h-4 lg:w-5 lg:h-5 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'} ${!trend.isPositive ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {language === 'fr' ? 'Tendance' : 'Trend'}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className={`text-lg lg:text-2xl font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trend.isPositive ? '+' : '-'}{trend.value.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}