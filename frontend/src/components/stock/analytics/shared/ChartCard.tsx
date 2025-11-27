'use client';

import { Card } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  loading = false,
  className = '',
  action
}: ChartCardProps) => (
  <Card className={`relative overflow-hidden p-6 border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl ${className}`}>
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center">
          {action}
        </div>
      )}
    </div>
    {loading ? (
      <div className="h-64 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <div className="absolute inset-0 rounded-full border-2 border-indigo-100 opacity-20" />
        </div>
      </div>
    ) : (
      <div className="relative z-10">
        {children}
      </div>
    )}
  </Card>
);

export default ChartCard;