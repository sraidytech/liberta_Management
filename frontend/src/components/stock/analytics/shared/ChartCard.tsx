'use client';

import { Card } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export const ChartCard = ({
  title,
  children,
  loading = false,
  className = '',
  action
}: ChartCardProps) => (
  <Card className={`p-6 border border-gray-100 shadow-sm ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    {loading ? (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    ) : (
      children
    )}
  </Card>
);

export default ChartCard;