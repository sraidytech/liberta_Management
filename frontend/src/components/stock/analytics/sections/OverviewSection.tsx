'use client';

import { DollarSign, Package, Layers, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { KPICard, ChartCard, CustomTooltip } from '../shared';
import { OverviewData } from '../types';
import { chartColors, translations } from '../constants';

interface OverviewSectionProps {
  data: OverviewData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const OverviewSection = ({ data, loading, language }: OverviewSectionProps) => {
  const labels = translations[language];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={labels.totalStockValue}
          value={data ? formatCurrency(data.totalValue || 0) : '$0'}
          icon={DollarSign}
          color="blue"
          loading={loading}
        />
        <KPICard
          title={labels.totalProducts}
          value={data?.totalProducts?.toLocaleString() || 0}
          icon={Package}
          color="green"
          loading={loading}
        />
        <KPICard
          title={labels.totalLots}
          value={data?.totalLots?.toLocaleString() || 0}
          icon={Layers}
          color="purple"
          loading={loading}
        />
        <KPICard
          title={labels.avgTurnover}
          value={data ? `${(data.avgTurnoverRate || 0).toFixed(2)}x` : '0x'}
          icon={RefreshCw}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Stock Value Trend Chart */}
      <ChartCard title={labels.stockValueTrend} loading={loading}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.valueHistory || []}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={formatDate}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => formatCurrency(value)}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length && label) {
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-900 mb-1">{formatDate(String(label))}</p>
                        <p className="text-sm text-blue-600">
                          {labels.value}: {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors.primary}
                strokeWidth={2}
                fill="url(#colorValue)"
                name={labels.value}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Pie Chart */}
        <ChartCard title={labels.categoryDistribution} loading={loading}>
          <div className="h-72">
            {data?.categoryDistribution && data.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={chartColors.categories[index % chartColors.categories.length]}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{data.name}</p>
                            <p className="text-sm text-gray-600">
                              {labels.value}: {formatCurrency(data.value)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                {labels.noData}
              </div>
            )}
          </div>
        </ChartCard>

        {/* Top Products by Value Bar Chart */}
        <ChartCard title={labels.topProductsByValue} loading={loading}>
          <div className="h-72">
            {data?.topProducts && data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.topProducts.slice(0, 8)} 
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(value) => formatCurrency(value)}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    width={100}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900 mb-1">{data.name}</p>
                            <p className="text-sm text-blue-600">
                              {labels.value}: {formatCurrency(data.value)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {labels.quantity}: {data.quantity?.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={chartColors.primary}
                    radius={[0, 4, 4, 0]}
                    name={labels.value}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                {labels.noData}
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default OverviewSection;