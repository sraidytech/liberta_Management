'use client';

import { Warehouse, Package, TrendingUp, AlertCircle } from 'lucide-react';
import {
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
import { WarehouseData } from '../types';
import { chartColors, translations } from '../constants';

interface WarehouseSectionProps {
  data: WarehouseData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const WarehouseSection = ({ data, loading, language }: WarehouseSectionProps) => {
  const labels = translations[language];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={labels.totalStockValue}
          value={data?.stats?.reduce((acc, curr) => acc + curr.totalValue, 0) ? `$${(data.stats.reduce((acc, curr) => acc + curr.totalValue, 0) / 1000).toFixed(1)}K` : '$0'}
          icon={Warehouse}
          color="blue"
          loading={loading}
        />
        <KPICard
          title={labels.totalProducts}
          value={data?.stats?.reduce((acc, curr) => acc + curr.productCount, 0)?.toLocaleString() || 0}
          icon={Package}
          color="indigo"
          loading={loading}
        />
        <KPICard
          title={labels.avgTurnover}
          value="3.8x"
          icon={TrendingUp}
          color="green"
          loading={loading}
        />
        <KPICard
          title={labels.utilization}
          value={`${Math.round((data?.stats?.reduce((acc, curr) => acc + curr.utilization, 0) || 0) / (data?.stats?.length || 1))}%`}
          icon={AlertCircle}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Warehouse Comparison Chart */}
      <ChartCard title={labels.warehouseComparison} loading={loading}>
        <div className="h-96">
          {data?.stats && data.stats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.stats}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="totalValue"
                  name={labels.value}
                  fill={chartColors.primary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="productCount"
                  name={labels.productCount}
                  fill={chartColors.purple}
                  radius={[4, 4, 0, 0]}
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

      {/* Warehouse Stats Table */}
      <ChartCard title={labels.warehouseStats} loading={loading}>
        <div className="overflow-x-auto">
          {data?.stats && data.stats.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.warehouseName}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.products}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.value}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.utilization}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.stockLevelDistribution}</th>
                </tr>
              </thead>
              <tbody>
                {data.stats.map((warehouse, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{warehouse.name}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">{warehouse.productCount?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 font-medium">
                      ${warehouse.totalValue?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-700">{warehouse.utilization}%</span>
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${warehouse.utilization > 90 ? 'bg-red-500' :
                                warehouse.utilization > 75 ? 'bg-amber-500' :
                                  'bg-emerald-500'
                              }`}
                            style={{ width: `${warehouse.utilization}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <div className="flex h-2 w-full min-w-[100px] rounded-full overflow-hidden">
                        <div className="bg-emerald-500" style={{ width: '60%' }} title="Normal" />
                        <div className="bg-amber-500" style={{ width: '20%' }} title="Low Stock" />
                        <div className="bg-red-500" style={{ width: '10%' }} title="Out of Stock" />
                        <div className="bg-blue-500" style={{ width: '10%' }} title="Overstock" />
                      </div>
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

export default WarehouseSection;