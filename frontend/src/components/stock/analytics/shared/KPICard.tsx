'use client';

import { Card } from '@/components/ui/card';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo' | 'cyan';
  loading?: boolean;
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50/50',
    text: 'text-blue-600',
    border: 'border-blue-100/50',
    iconBg: 'bg-blue-100/50',
    gradient: 'from-blue-500/10 to-blue-500/5',
  },
  green: {
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-600',
    border: 'border-emerald-100/50',
    iconBg: 'bg-emerald-100/50',
    gradient: 'from-emerald-500/10 to-emerald-500/5',
  },
  amber: {
    bg: 'bg-amber-50/50',
    text: 'text-amber-600',
    border: 'border-amber-100/50',
    iconBg: 'bg-amber-100/50',
    gradient: 'from-amber-500/10 to-amber-500/5',
  },
  red: {
    bg: 'bg-red-50/50',
    text: 'text-red-600',
    border: 'border-red-100/50',
    iconBg: 'bg-red-100/50',
    gradient: 'from-red-500/10 to-red-500/5',
  },
  purple: {
    bg: 'bg-purple-50/50',
    text: 'text-purple-600',
    border: 'border-purple-100/50',
    iconBg: 'bg-purple-100/50',
    gradient: 'from-purple-500/10 to-purple-500/5',
  },
  indigo: {
    bg: 'bg-indigo-50/50',
    text: 'text-indigo-600',
    border: 'border-indigo-100/50',
    iconBg: 'bg-indigo-100/50',
    gradient: 'from-indigo-500/10 to-indigo-500/5',
  },
  cyan: {
    bg: 'bg-cyan-50/50',
    text: 'text-cyan-600',
    border: 'border-cyan-100/50',
    iconBg: 'bg-cyan-100/50',
    gradient: 'from-cyan-500/10 to-cyan-500/5',
  },
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
  const styles = colorStyles[color];

  if (loading) {
    return (
      <Card className="relative overflow-hidden p-6 border border-white/20 bg-white/40 backdrop-blur-md shadow-sm rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="space-y-4 flex-1">
            <LoadingSkeleton className="h-4 w-24 bg-gray-200/50" />
            <LoadingSkeleton className="h-8 w-32 bg-gray-200/50" />
            <LoadingSkeleton className="h-3 w-20 bg-gray-200/50" />
          </div>
          <LoadingSkeleton className="h-12 w-12 rounded-2xl bg-gray-200/50" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden p-6 border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 rounded-2xl group`}>
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative flex items-start justify-between z-10">
        <div>
          <p className="text-sm font-medium text-gray-500 tracking-wide">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
          </div>
          
          {trend && trendValue && (
            <div className={`flex items-center mt-3 text-sm font-medium ${
              trend === 'up' ? 'text-emerald-600' : 
              trend === 'down' ? 'text-rose-600' : 
              'text-gray-500'
            }`}>
              <span className={`flex items-center justify-center w-5 h-5 rounded-full mr-1.5 ${
                trend === 'up' ? 'bg-emerald-100 text-emerald-600' : 
                trend === 'down' ? 'bg-rose-100 text-rose-600' : 
                'bg-gray-100 text-gray-500'
              }`}>
                {trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
              </span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        <div className={`p-3.5 rounded-2xl ${styles.iconBg} ${styles.text} shadow-sm ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
};

export default KPICard;