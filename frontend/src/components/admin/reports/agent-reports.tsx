'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/language-context';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Target,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  BarChart3,
  Zap,
  Award,
  User
} from 'lucide-react';

interface AgentData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    averageUtilization: number;
    totalOrders: number;
    totalRevenue: number;
  };
  agentPerformance: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    currentOrders: number;
    maxOrders: number;
    utilization: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    successRate: number;
    cancellationRate: number;
    totalActivities: number;
    totalWorkingHours: number;
    ordersPerDay: number;
  }>;
  workloadDistribution: Array<{
    id: string;
    name: string;
    currentOrders: number;
    maxOrders: number;
    utilization: number;
    activeOrders: number;
  }>;
  activityBreakdown: Array<{
    agentId: string;
    activityType: string;
    count: number;
    totalDuration: number;
  }>;
}

interface AgentReportsProps {
  data: AgentData | null;
  loading: boolean;
  filters: any;
}

export default function AgentReports({ data, loading, filters }: AgentReportsProps) {
  const { language } = useLanguage();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Get availability color
  const getAvailabilityColor = (availability: string) => {
    const colors = {
      'ONLINE': 'bg-emerald-500',
      'BUSY': 'bg-amber-500',
      'BREAK': 'bg-blue-500',
      'OFFLINE': 'bg-gray-400',
    };
    return colors[availability as keyof typeof colors] || 'bg-gray-400';
  };

  // Get performance level
  const getPerformanceLevel = (successRate: number) => {
    if (successRate >= 90) return { level: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (successRate >= 80) return { level: 'Très Bon', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (successRate >= 70) return { level: 'Bon', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { level: 'À Améliorer', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!data) return null;

    // Top performers
    const topPerformers = [...data.agentPerformance]
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    // Utilization distribution
    const utilizationRanges = [
      { range: '0-25%', count: 0, color: '#EF4444' },
      { range: '26-50%', count: 0, color: '#F59E0B' },
      { range: '51-75%', count: 0, color: '#3B82F6' },
      { range: '76-100%', count: 0, color: '#10B981' }
    ];

    data.agentPerformance.forEach(agent => {
      if (agent.utilization <= 25) utilizationRanges[0].count++;
      else if (agent.utilization <= 50) utilizationRanges[1].count++;
      else if (agent.utilization <= 75) utilizationRanges[2].count++;
      else utilizationRanges[3].count++;
    });

    return { topPerformers, utilizationRanges };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 rounded-2xl h-96 animate-pulse"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">
          {language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Agents */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 opacity-80" />
                <p className="text-blue-100 font-medium">
                  {language === 'fr' ? 'Agents Totaux' : 'Total Agents'}
                </p>
              </div>
              <p className="text-3xl font-bold mb-2">
                {data.summary.totalAgents}
              </p>
              <p className="text-sm text-blue-100">
                {data.summary.activeAgents} {language === 'fr' ? 'actifs' : 'active'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>

        {/* Average Utilization */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 opacity-80" />
                <p className="text-emerald-100 font-medium">
                  {language === 'fr' ? 'Utilisation Moy.' : 'Avg Utilization'}
                </p>
              </div>
              <p className="text-3xl font-bold mb-2">
                {data.summary.averageUtilization.toFixed(1)}%
              </p>
              <p className="text-sm text-emerald-100">
                {language === 'fr' ? 'Capacité utilisée' : 'Capacity used'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Activity className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>

        {/* Total Orders Handled */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 opacity-80" />
                <p className="text-purple-100 font-medium">
                  {language === 'fr' ? 'Commandes Traitées' : 'Orders Handled'}
                </p>
              </div>
              <p className="text-3xl font-bold mb-2">
                {formatNumber(data.summary.totalOrders)}
              </p>
              <p className="text-sm text-purple-100">
                {language === 'fr' ? 'Période sélectionnée' : 'Selected period'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Target className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>

        {/* Total Revenue Generated */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 opacity-80" />
                <p className="text-orange-100 font-medium">
                  {language === 'fr' ? 'CA Généré' : 'Revenue Generated'}
                </p>
              </div>
              <p className="text-3xl font-bold mb-2">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
              <p className="text-sm text-orange-100">
                {language === 'fr' ? 'Par les agents' : 'By agents'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Top Performers' : 'Top Performers'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Meilleurs taux de succès' : 'Best success rates'}
              </p>
            </div>
            <Award className="w-8 h-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            {chartData && chartData.topPerformers.map((agent, index) => {
              const performance = getPerformanceLevel(agent.successRate);
              return (
                <div key={agent.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{agent.name?.[0] || 'A'}</span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getAvailabilityColor(agent.availability)} rounded-full border-2 border-white`}></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-bold text-gray-900 truncate">{agent.name}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${performance.bg} ${performance.color}`}>
                        {performance.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {agent.agentCode} • {agent.totalOrders} {language === 'fr' ? 'commandes' : 'orders'}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{agent.successRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">{formatCurrency(agent.totalRevenue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Utilization Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Distribution d\'Utilisation' : 'Utilization Distribution'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Répartition des charges' : 'Workload distribution'}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            {chartData && chartData.utilizationRanges.map((range, index) => {
              const maxCount = Math.max(...chartData.utilizationRanges.map(r => r.count));
              const percentage = maxCount > 0 ? (range.count / maxCount) * 100 : 0;
              
              return (
                <div key={range.range} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: range.color }}
                      ></div>
                      <span className="font-medium text-gray-900">{range.range}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{range.count}</span>
                      <span className="text-sm text-gray-600 ml-1">
                        {language === 'fr' ? 'agents' : 'agents'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: range.color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Agent Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Performance Détaillée' : 'Detailed Performance'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Métriques complètes par agent' : 'Complete metrics per agent'}
              </p>
            </div>
            <User className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="space-y-4">
          {data.agentPerformance.slice(0, 5).map((agent) => {
            const performance = getPerformanceLevel(agent.successRate);
            return (
              <div key={agent.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                  {/* Agent Info */}
                  <div className="lg:col-span-1">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{agent.name?.[0] || 'A'}</span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getAvailabilityColor(agent.availability)} rounded-full border-2 border-white`}></div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{agent.name}</p>
                        <p className="text-sm text-gray-600">{agent.agentCode}</p>
                      </div>
                    </div>
                  </div>

                  {/* Utilization */}
                  <div className="lg:col-span-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">
                          {language === 'fr' ? 'Utilisation' : 'Utilization'}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {agent.utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(agent.utilization, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {agent.currentOrders}/{agent.maxOrders}
                      </p>
                    </div>
                  </div>

                  {/* Orders */}
                  <div className="lg:col-span-1">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {language === 'fr' ? 'Commandes' : 'Orders'}
                      </p>
                      <p className="text-lg font-bold text-gray-900">{agent.totalOrders}</p>
                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-600 mt-1">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>{agent.completedOrders}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>{agent.cancelledOrders}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="lg:col-span-1">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {language === 'fr' ? 'Succès' : 'Success'}
                      </p>
                      <div className="text-lg font-bold text-emerald-600 mb-2">
                        {agent.successRate.toFixed(1)}%
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${performance.bg} ${performance.color}`}>
                        {performance.level}
                      </span>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="lg:col-span-1">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {language === 'fr' ? 'Revenus' : 'Revenue'}
                      </p>
                      <p className="font-bold text-gray-900 text-sm">{formatCurrency(agent.totalRevenue)}</p>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(agent.averageOrderValue)} {language === 'fr' ? 'moy.' : 'avg'}
                      </p>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="lg:col-span-1">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        {language === 'fr' ? 'Heures' : 'Hours'}
                      </p>
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-bold text-gray-900">
                          {agent.totalWorkingHours}h
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {agent.ordersPerDay.toFixed(1)} {language === 'fr' ? 'cmd/jour' : 'orders/day'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {language === 'fr' ? 'Répartition de la Charge' : 'Workload Distribution'}
            </h3>
            <p className="text-gray-600">
              {language === 'fr' ? 'Charge de travail actuelle' : 'Current workload'}
            </p>
          </div>
          <Zap className="w-8 h-8 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.workloadDistribution.slice(0, 6).map((agent) => (
            <div key={agent.id} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">{agent.name?.[0] || 'A'}</span>
                  </div>
                  <span className="font-medium text-gray-900 text-sm truncate">{agent.name}</span>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {agent.utilization.toFixed(0)}%
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      agent.utilization >= 80 ? 'bg-red-500' :
                      agent.utilization >= 60 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(agent.utilization, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{agent.currentOrders}/{agent.maxOrders} {language === 'fr' ? 'commandes' : 'orders'}</span>
                  <span>{agent.activeOrders} {language === 'fr' ? 'actives' : 'active'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}