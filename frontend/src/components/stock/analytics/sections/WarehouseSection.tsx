'use client';

import { Warehouse, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Cell
} from 'recharts';
import { ChartCard } from '../shared';
import { WarehouseData } from '../types';
import { chartColors, translations } from '../constants';

interface WarehouseSectionProps {
  data: WarehouseData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const WarehouseSection = ({ data, loading, language }: WarehouseSectionProps) => {
  const labels = translations[language];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Prepare utilization data for radial chart
  const utilizationData = data?.stats?.map((warehouse, index) => ({
    name: warehouse.name,
    utilization: warehouse.utilization,
    fill: chartColors.categories[index % chartColors.categories.length]
  })) || [];

  return (
    <div className="space-y-6">
      {/* Warehouse Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 border border-gray-100 animate-pulse">
              <div className="h-32 bg-gray-200 rounded" />
            </Card>
          ))
        ) : (
          data?.stats?.map((warehouse, index) => (
            <Card 
              key={warehouse.id} 
              className="p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: `${chartColors.categories[index % chartColors.categories.length]}20` }}
                  >
                    <Warehouse 
                      className="w-5 h-5" 
                      style={{ color: chartColors.categories[index % chartColors.categories.length] }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{warehouse.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{warehouse.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {warehouse.utilization}%
                  </div>
                  <p className="text-xs text-gray-500">{labels.utilization}</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${warehouse.utilization}%`,
                    backgroundColor: chartColors.categories[index % chartColors.categories.length]
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(warehouse.totalValue)}
                  </p>
                  <p className="text-xs text-gray-500">{labels.value}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    {warehouse.totalQuantity?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{labels.quantity}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">
                    {warehouse.productCount}
                  </p>
                  <p className="text-xs text-gray-500">{labels.products}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warehouse Value Comparison */}
        <ChartCard title={labels.warehouseStats} loading={loading}>
          <div className="h-72">
            {data?.stats && data.stats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.stats} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(value) => formatCurrency(value)}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
                            <p className="text-sm text-blue-600">
                              {labels.value}: {formatCurrency(data.totalValue)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {labels.totalQuantity}: {data.totalQuantity?.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {labels.productCount}: {data.productCount}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="totalValue" 
                    name={labels.value}
                    radius={[4, 4, 0, 0]}
                  >
                    {data.stats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={chartColors.categories[index % chartColors.categories.length]}
                      />
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

        {/* Warehouse Utilization Radial Chart */}
        <ChartCard title={labels.warehouseUtilization} loading={loading}>
          <div className="h-72">
            {utilizationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="90%"
                  data={utilizationData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    label={{
                      position: 'insideStart',
                      fill: '#fff',
                      fontSize: 11
                    }}
                    background={{ fill: '#f3f4f6' }}
                    dataKey="utilization"
                    cornerRadius={4}
                  />
                  <Legend 
                    iconSize={10}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{data.name}</p>
                            <p className="text-sm text-gray-600">
                              {labels.utilization}: {data.utilization}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                {labels.noData}
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Warehouse Comparison Table */}
      <ChartCard title={labels.warehouseComparison} loading={loading}>
        <div className="overflow-x-auto">
          {data?.comparison && data.comparison.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.warehouseName}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-emerald-600">{labels.inMovements}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-red-600">{labels.outMovements}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.netChange}</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.comparison.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: chartColors.categories[index % chartColors.categories.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900">{item.warehouseName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600 font-medium">
                      +{item.inMovements?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 font-medium">
                      -{item.outMovements?.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      item.netChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {item.netChange >= 0 ? '+' : ''}{item.netChange?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.netChange >= 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                          <TrendingUp className="w-3 h-3" />
                          Growing
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          <TrendingDown className="w-3 h-3" />
                          Declining
                        </div>
                      )}
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