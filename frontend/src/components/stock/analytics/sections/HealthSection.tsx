'use client';

import { AlertTriangle, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
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
  Cell
} from 'recharts';
import { ChartCard } from '../shared';
import { HealthData } from '../types';
import { chartColors, translations } from '../constants';

interface HealthSectionProps {
  data: HealthData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const HealthSection = ({ data, loading, language }: HealthSectionProps) => {
  const labels = translations[language];

  const statusColors: Record<string, string> = {
    'Out of Stock': chartColors.danger,
    'Low Stock': chartColors.warning,
    'Normal': chartColors.success,
    'Overstock': chartColors.info
  };

  const statusIcons: Record<string, React.ReactNode> = {
    'Out of Stock': <XCircle className="w-5 h-5 text-red-500" />,
    'Low Stock': <AlertTriangle className="w-5 h-5 text-amber-500" />,
    'Normal': <CheckCircle className="w-5 h-5 text-emerald-500" />,
    'Overstock': <AlertCircle className="w-5 h-5 text-blue-500" />
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'Out of Stock': labels.outOfStock,
      'Low Stock': labels.lowStock,
      'Normal': labels.normal,
      'Overstock': labels.overstock
    };
    return statusLabels[status] || status;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Stock Level Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 border border-gray-100 animate-pulse">
              <div className="h-20 bg-gray-200 rounded" />
            </Card>
          ))
        ) : (
          data?.levelDistribution?.map((item, index) => (
            <Card 
              key={index} 
              className={`p-5 border-l-4 shadow-sm hover:shadow-md transition-shadow`}
              style={{ borderLeftColor: statusColors[item.status] || chartColors.primary }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {statusIcons[item.status]}
                    <span className="text-sm font-medium text-gray-600">
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{item.count}</p>
                  <p className="text-sm text-gray-500 mt-1">{item.percentage}% of total</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Analysis */}
        <ChartCard title={labels.expiryAnalysis} loading={loading}>
          <div className="h-72">
            {data?.expiryAnalysis && data.expiryAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.expiryAnalysis} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900 mb-2">{data.range}</p>
                            <p className="text-sm text-gray-600">
                              {labels.count}: {data.count}
                            </p>
                            <p className="text-sm text-gray-600">
                              {labels.value}: {formatCurrency(data.value)}
                            </p>
                            {data.products && data.products.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">{labels.products}:</p>
                                {data.products.slice(0, 3).map((p: any, i: number) => (
                                  <p key={i} className="text-xs text-gray-600">
                                    • {p.name} ({p.quantity})
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    name={labels.count}
                    radius={[4, 4, 0, 0]}
                  >
                    {data.expiryAnalysis.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.range === 'Expired' ? chartColors.danger :
                          entry.range.includes('7') ? chartColors.warning :
                          entry.range.includes('30') ? chartColors.orange :
                          chartColors.info
                        }
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

        {/* Stock Aging Analysis */}
        <ChartCard title={labels.agingAnalysis} loading={loading}>
          <div className="h-72">
            {data?.agingAnalysis && data.agingAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.agingAnalysis} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                            <p className="text-sm font-medium text-gray-900 mb-1">{data.range}</p>
                            <p className="text-sm text-gray-600">
                              {labels.count}: {data.count}
                            </p>
                            <p className="text-sm text-gray-600">
                              {labels.value}: {formatCurrency(data.value)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={chartColors.purple}
                    name={labels.count}
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
      </div>

      {/* Reorder Recommendations Table */}
      <ChartCard title={labels.reorderRecommendations} loading={loading}>
        <div className="overflow-x-auto">
          {data?.reorderList && data.reorderList.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.productName}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.sku}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.current}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.reorderPoint}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.toOrder}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.warehouseName}</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.reorderList.map((item, index) => {
                  const urgency = item.current / item.reorderPoint;
                  const urgencyColor = urgency < 0.25 ? 'bg-red-100 text-red-700' : 
                                       urgency < 0.5 ? 'bg-amber-100 text-amber-700' : 
                                       'bg-yellow-100 text-yellow-700';
                  const urgencyLabel = urgency < 0.25 ? 'Critical' : 
                                       urgency < 0.5 ? 'Urgent' : 
                                       'Low';
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.productName}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">{item.sku}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={`font-semibold ${item.current < item.reorderPoint ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.current?.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        {item.reorderPoint?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600">
                        {item.toOrder?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.warehouseName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${urgencyColor}`}>
                          {urgencyLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-500">All products are well stocked!</p>
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default HealthSection;