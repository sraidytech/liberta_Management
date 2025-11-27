'use client';

import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { KPICard, ChartCard, CustomTooltip } from '../shared';
import { MovementData } from '../types';
import { chartColors, translations } from '../constants';

interface MovementSectionProps {
  data: MovementData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const MovementSection = ({ data, loading, language }: MovementSectionProps) => {
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

  const movementTypeColors: Record<string, string> = {
    IN: chartColors.success,
    OUT: chartColors.danger,
    ADJUSTMENT: chartColors.info,
    TRANSFER: chartColors.purple,
    RETURN: chartColors.warning
  };

  const getMovementTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      IN: labels.in,
      OUT: labels.out,
      ADJUSTMENT: labels.adjustment,
      TRANSFER: labels.transfer,
      RETURN: labels.return
    };
    return typeLabels[type] || type;
  };

  // Calculate totals from summary or trend
  const totalIn = data?.summary?.reduce((acc, curr) => acc + curr.in, 0) || 0;
  const totalOut = data?.summary?.reduce((acc, curr) => acc + curr.out, 0) || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={labels.inMovements}
          value={totalIn.toLocaleString()}
          icon={ArrowDownRight}
          color="green"
          loading={loading}
          trend="up"
          trendValue="+8.4%"
        />
        <KPICard
          title={labels.outMovements}
          value={totalOut.toLocaleString()}
          icon={ArrowUpRight}
          color="red"
          loading={loading}
          trend="down"
          trendValue="-3.2%"
        />
        <KPICard
          title={labels.netChange}
          value={(totalIn - totalOut).toLocaleString()}
          icon={ArrowRightLeft}
          color="blue"
          loading={loading}
          trend="neutral"
          trendValue="Stable"
        />
        <KPICard
          title={labels.avgTurnover}
          value="4.2x"
          icon={RefreshCw}
          color="amber"
          loading={loading}
          trend="up"
          trendValue="+1.1%"
        />
      </div>

      {/* Movement Trends Chart */}
      <ChartCard title={labels.movementTrend} loading={loading}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area
                type="monotone"
                dataKey="in"
                name={labels.in}
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#colorIn)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
              />
              <Area
                type="monotone"
                dataKey="out"
                name={labels.out}
                stroke="#ef4444"
                strokeWidth={3}
                fill="url(#colorOut)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Type Distribution */}
        <ChartCard title={labels.movementTypeDistribution} loading={loading}>
          <div className="h-80">
            {data?.typeDistribution && data.typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.typeDistribution}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => getMovementTypeLabel(value)}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                    name={labels.count}
                    barSize={24}
                  >
                    {data.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={movementTypeColors[entry.type] || chartColors.categories[index % chartColors.categories.length]} />
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

        {/* Top Products by Movement */}
        <ChartCard title={labels.topProductsByMovement} loading={loading}>
          <div className="h-80">
            {data?.topProducts && data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topProducts.slice(0, 6)}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 18)}...` : value}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                  <Bar
                    dataKey="inQuantity"
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                    name={labels.count}
                    barSize={24}
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

export default MovementSection;