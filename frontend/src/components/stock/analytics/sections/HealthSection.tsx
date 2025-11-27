'use client';

import { AlertTriangle, CheckCircle, Clock, AlertOctagon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { KPICard, ChartCard, CustomTooltip } from '../shared';
import { HealthData } from '../types';
import { chartColors, translations } from '../constants';

interface HealthSectionProps {
  data: HealthData | null;
  loading: boolean;
  language: 'en' | 'fr';
}

export const HealthSection = ({ data, loading, language }: HealthSectionProps) => {
  const labels = translations[language];

  const stockLevelColors = {
    LOW_STOCK: chartColors.warning,
    NORMAL: chartColors.success,
    OVERSTOCK: chartColors.info,
    OUT_OF_STOCK: chartColors.danger
  };

  const getStockLevelLabel = (level: string) => {
    const levelLabels: Record<string, string> = {
      LOW_STOCK: labels.lowStock,
      NORMAL: labels.normal,
      OVERSTOCK: labels.overstock,
      OUT_OF_STOCK: labels.outOfStock
    };
    return levelLabels[level] || level;
  };

  // Calculate expiring soon count
  const expiringSoonCount = data?.expiryAnalysis?.find(item => item.range === 'Expiring Soon')?.count || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={labels.normal}
          value={data?.levelDistribution?.find(l => l.status === 'NORMAL')?.count?.toLocaleString() || 0}
          icon={CheckCircle}
          color="green"
          loading={loading}
        />
        <KPICard
          title={labels.lowStock}
          value={data?.levelDistribution?.find(l => l.status === 'LOW_STOCK')?.count?.toLocaleString() || 0}
          icon={AlertTriangle}
          color="amber"
          loading={loading}
        />
        <KPICard
          title={labels.outOfStock}
          value={data?.levelDistribution?.find(l => l.status === 'OUT_OF_STOCK')?.count?.toLocaleString() || 0}
          icon={AlertOctagon}
          color="red"
          loading={loading}
        />
        <KPICard
          title={labels.expiringSoon}
          value={expiringSoonCount.toLocaleString()}
          icon={Clock}
          color="purple"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Level Distribution */}
        <ChartCard title={labels.stockLevelDistribution} loading={loading}>
          <div className="h-80">
            {data?.levelDistribution && data.levelDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.levelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                    stroke="none"
                  >
                    {data.levelDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={stockLevelColors[entry.status as keyof typeof stockLevelColors] || chartColors.categories[index]}
                        className="stroke-white stroke-2"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    formatter={(value) => <span className="text-sm font-medium text-gray-600 ml-2">{getStockLevelLabel(value)}</span>}
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

        {/* Expiry Analysis */}
        <ChartCard title={labels.expiryAnalysis} loading={loading}>
          <div className="h-80">
            {data?.expiryAnalysis && data.expiryAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.expiryAnalysis}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="range"
                    tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                    width={100}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                  <Bar
                    dataKey="count"
                    radius={[0, 6, 6, 0]}
                    name={labels.count}
                    barSize={32}
                  >
                    {data.expiryAnalysis.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.range === 'Expired' ? chartColors.danger :
                            entry.range === 'Expiring Soon' ? chartColors.warning :
                              chartColors.success
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
      </div>

      {/* Reorder Recommendations */}
      <ChartCard title={labels.reorderRecommendations} loading={loading}>
        <div className="overflow-x-auto">
          {data?.reorderList && data.reorderList.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.productName}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{labels.sku}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.current}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">{labels.reorderPoint}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-blue-600">{labels.toOrder}</th>
                </tr>
              </thead>
              <tbody>
                {data.reorderList.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{item.productName}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{item.sku}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 font-medium">
                      {item.current}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">
                      {item.reorderPoint}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-blue-600 font-bold">
                      {item.toOrder}
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

export default HealthSection;