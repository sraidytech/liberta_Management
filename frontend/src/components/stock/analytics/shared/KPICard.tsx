'use client';

import { Card } from '@/components/ui/card';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  loading?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

const iconBgClasses = {
  blue: 'bg-blue-100',
  green: 'bg-emerald-100',
  amber: 'bg-amber-100',
  red: 'bg-red-100',
  purple: 'bg-purple-100',
};

export const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false
}: KPICardProps) => {
  if (loading) {
    return (
      <Card className="p-6 border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <LoadingSkeleton className="h-4 w-24" />
            <LoadingSkeleton className="h-8 w-32" />
            <LoadingSkeleton className="h-3 w-20" />
          </div>
          <LoadingSkeleton className="h-12 w-12 rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 border ${colorClasses[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              ) : null}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses[color]}`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[1]}`} />
        </div>
      </div>
    </Card>
  );
};

export default KPICard;