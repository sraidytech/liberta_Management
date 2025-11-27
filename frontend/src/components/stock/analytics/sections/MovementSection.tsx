'use client';

import { Card } from '@/components/ui/card';
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
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { ChartCard } from '../shared';
import { MovementData } from '../types';
import { chartColors, translations } from '../constants';

interface MovementSectionProps {
  data: MovementData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const MovementSection = ({ data, loading, language }: MovementSectionProps) => {
  const labels = translations[language];

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

  return (
    <div className="space-y-6">
      {/* Movement Trend Chart */}
      <ChartCard title={labels.movementTrend} loading={loading}>
        <div className="h-80">
          {data?.trend && data.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.trend}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.danger} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={formatDate}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                          <p className="text-sm font-medium text-gray-900 mb-2">{formatDate(String(label))}</p>
                          {payload.map((entry, index) => (
                            <p key={index} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {(entry.value as number)?.toLocaleString() || 0}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="in"
                  stroke={chartColors.success}
                  strokeWidth={2}
                  fill="url(#colorIn)"
                  name={labels.in}
                />
                <Area
                  type="monotone"
                  dataKey="out"
                  stroke={chartColors.danger}
                  strokeWidth={2}
                  fill="url(#colorOut)"
                  name={labels.out}
                />
                <Line
                  type="monotone"
                  dataKey="adjustment"
                  stroke={chartColors.info}
                  strokeWidth={2}
                  dot={false}
                  name={labels.adjustment}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              {labels.noData}
            </div>
          )}
        </div>
      </ChartCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Type Distribution */}
        <ChartCard title={labels.movementTypeDistribution} loading={loading}>
          <div className="h-72">
            {data?.typeDistribution && data.typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="quantity"
                    nameKey="type"
                    label={({ name, percent }) => `${getMovementTypeLabel(name as string)} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                  >
                    {data.typeDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={movementTypeColors[entry.type] || chartColors.categories[index % chartColors.categories.length]}
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
                            <p className="text-sm font-medium text-gray-900">{getMovementTypeLabel(data.type)}</p>
                            <p className="text-sm text-gray-600">
                              {labels.count}: {data.count?.toLocaleString()}
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
                </PieChart>
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
          <div className="h-72">
            {data?.topProducts && data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.topProducts.slice(0, 6)} 
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    width={90}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900 mb-1">{data.name}</p>
                            <p className="text-sm text-emerald-600">
                              {labels.inMovements}: {data.inQuantity?.toLocaleString()}
                            </p>
                            <p className="text-sm text-red-600">
                              {labels.outMovements}: {data.outQuantity?.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {labels.netChange}: {data.netChange?.toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                  <Bar 
                    dataKey="inQuantity" 
                    fill={chartColors.success}
                    radius={[0, 4, 4, 0]}
                    name={labels.inMovements}
                    stackId="stack"
                  />
                  <Bar 
                    dataKey="outQuantity" 
                    fill={chartColors.danger}
                    radius={[0, 4, 4, 0]}
                    name={labels.outMovements}
                    stackId="stack"
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

      {/* Movement Summary Table */}
      <ChartCard title={labels.movementSummary} loading={loading}>
        <div className="overflow-x-auto">
          {data?.summary && data.summary.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.period}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-600">{labels.inMovements}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-600">{labels.outMovements}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.net}</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900">{row.period}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600 font-medium">
                      +{row.in?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 font-medium">
                      -{row.out?.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      row.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {row.net >= 0 ? '+' : ''}{row.net?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-gray-400">
              {labels.noData}
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default MovementSection;