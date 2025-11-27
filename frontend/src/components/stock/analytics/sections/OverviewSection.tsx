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
  ResponsiveContainer,
  Legend
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
          color="indigo"
          loading={loading}
          trend="up"
          trendValue="+12.5%"
        />
        <KPICard
          title={labels.totalProducts}
          value={data?.totalProducts?.toLocaleString() || 0}
          icon={Package}
          color="cyan"
          loading={loading}
          trend="neutral"
          trendValue="0%"
        />
        <KPICard
          title={labels.totalLots}
          value={data?.totalLots?.toLocaleString() || 0}
          icon={Layers}
          color="purple"
          loading={loading}
          trend="up"
          trendValue="+5.2%"
        />
        <KPICard
          title={labels.avgTurnover}
          value={data ? `${(data.avgTurnoverRate || 0).toFixed(2)}x` : '0x'}
          icon={RefreshCw}
          color="amber"
          loading={loading}
          trend="down"
          trendValue="-2.1%"
        />
      </div>

      {/* Stock Value Trend Chart */}
      <ChartCard title={labels.stockValueTrend} loading={loading}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.valueHistory || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(value) => formatCurrency(value)}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip valuePrefix="$" />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#colorValue)"
                name={labels.value}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Pie Chart */}
        <ChartCard title={labels.categoryDistribution} loading={loading}>
          <div className="h-80">
            {data?.categoryDistribution && data.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors.categories[index % chartColors.categories.length]}
                        className="stroke-white stroke-2"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip valuePrefix="$" />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    formatter={(value) => <span className="text-sm font-medium text-gray-600 ml-2">{value}</span>}
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
          <div className="h-80">
            {data?.topProducts && data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topProducts.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(value) => formatCurrency(value)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 18)}...` : value}
                  />
                  <Tooltip content={<CustomTooltip valuePrefix="$" />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                  <Bar
                    dataKey="value"
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                    name={labels.value}
                    barSize={24}
                  >
                    {data.topProducts.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#a78bfa'} />
                    ))}
                  </Bar>
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