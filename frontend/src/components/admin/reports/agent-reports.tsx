'use client';

import { useMemo, useState } from 'react';
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
  User,
  Info,
  ShoppingCart,
  Truck
} from 'lucide-react';

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white border-2 border-gray-200 text-gray-800 text-sm leading-relaxed rounded-lg px-4 py-3 max-w-[400px] shadow-2xl">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="break-words">
                  {content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AgentData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    averageQualityScore: number;
    averageGoalAchievement: number;
    totalOrders: number;
    totalRevenue: number;
    averageSuccessRate: number;
    averageNoteCompletionRate: number;
    // Key Statistics
    deliveredOrders?: number;
    cancelledOrders?: number;
    deliveryRate?: number;
  };
  agentPerformance: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    currentOrders: number;
    maxOrders: number;
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
    // New Quality-based KPIs
    qualityScore: number;
    goalAchievementRate: number;
    activityConsistency: number;
    noteCompletionRate: number;
    orderSuccessWithNotesRate: number;
    avgResponseTime: number;
    performanceScore: number;
  }>;
  workloadDistribution: Array<{
    id: string;
    name: string;
    currentOrders: number;
    maxOrders: number;
    activeOrders: number;
    workloadPercentage: number;
  }>;
  activityBreakdown: Array<{
    agentId: string;
    activityType: string;
    count: number;
    totalDuration: number;
  }>;
}

interface AgentNotesData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalNotes: number;
    averageNotesPerAgent: number;
    averageQualityScore: number;
    globalPeakHour: number;
    periodDays: number;
  };
  agentAnalytics: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    totalNotes: number;
    notesPerDay: number;
    notesPerOrder: number;
    averageNoteLength: number;
    averageTimeBetweenNotes: number;
    averageTimeToFirstNote: number;
    peakActivityHour: number | null;
    activityConsistency: number;
    noteQualityScore: number;
    productivityRank: number;
    activeDaysWithNotes: number;
    hourlyDistribution: number[];
    dailyTrend: Array<{
      date: string;
      notes: number;
    }>;
    responseTimeMetrics: {
      fastest: number;
      slowest: number;
      average: number;
    };
  }>;
  globalHourlyDistribution: number[];
  topPerformers: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    totalNotes: number;
    noteQualityScore: number;
    productivityRank: number;
  }>;
}

interface AgentReportsProps {
  data: AgentData | null;
  agentNotesData: AgentNotesData | null;
  loading: boolean;
  filters: any;
}

export default function AgentReports({ data, agentNotesData, loading, filters }: AgentReportsProps) {
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

    // Top performers by quality score
    const topPerformers = [...data.agentPerformance]
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 5);

    // Quality score distribution
    const qualityRanges = [
      { range: '0-25%', count: 0, color: '#EF4444' },
      { range: '26-50%', count: 0, color: '#F59E0B' },
      { range: '51-75%', count: 0, color: '#3B82F6' },
      { range: '76-100%', count: 0, color: '#10B981' }
    ];

    data.agentPerformance.forEach(agent => {
      if (agent.qualityScore <= 25) qualityRanges[0].count++;
      else if (agent.qualityScore <= 50) qualityRanges[1].count++;
      else if (agent.qualityScore <= 75) qualityRanges[2].count++;
      else qualityRanges[3].count++;
    });

    return { topPerformers, qualityRanges };
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
                <Tooltip content={language === 'fr' ?
                  'Nombre total d\'agents enregistrés dans le système, incluant tous les statuts' :
                  'Total number of agents registered in the system, including all statuses'}>
                  <Info className="w-4 h-4 text-blue-200 hover:text-white cursor-help" />
                </Tooltip>
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

        {/* Average Quality Score */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="w-5 h-5 opacity-80" />
                <p className="text-emerald-100 font-medium">
                  {language === 'fr' ? 'Score Qualité Moy.' : 'Avg Quality Score'}
                </p>
                <Tooltip content={language === 'fr' ?
                  'Score de qualité = (Commandes livrées avec notes / Commandes avec notes) × 100. Basé uniquement sur les commandes ayant au moins une note de l\'agent ET statut LIVRÉ' :
                  'Quality Score = (Delivered Orders with Notes / Orders with Notes) × 100. Based only on orders with at least one agent note AND LIVRÉ status'}>
                  <Info className="w-4 h-4 text-emerald-200 hover:text-white cursor-help" />
                </Tooltip>
              </div>
              <p className="text-3xl font-bold mb-2">
                {data.summary.averageQualityScore.toFixed(1)}%
              </p>
              <p className="text-sm text-emerald-100">
                {language === 'fr' ? 'Performance globale' : 'Overall performance'}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Award className="w-8 h-8" />
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
                <Tooltip content={language === 'fr' ?
                  'Nombre total de commandes assignées et traitées par tous les agents dans la période' :
                  'Total number of orders assigned and handled by all agents in the period'}>
                  <Info className="w-4 h-4 text-purple-200 hover:text-white cursor-help" />
                </Tooltip>
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
                <Tooltip content={language === 'fr' ?
                  'Chiffre d\'affaires total généré par les commandes traitées par les agents' :
                  'Total revenue generated from orders handled by agents'}>
                  <Info className="w-4 h-4 text-orange-200 hover:text-white cursor-help" />
                </Tooltip>
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

      {/* Key Statistics Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {language === 'fr' ? 'Statistiques Clés des Agents' : 'Agent Key Statistics'}
            </h3>
            <p className="text-gray-600">
              {language === 'fr' ? 'Indicateurs essentiels de performance des agents' : 'Essential agent performance indicators'}
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Orders */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-700 font-medium text-sm">
                    {language === 'fr' ? 'Total Commandes' : 'Total Orders'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Nombre total de commandes assignées aux agents dans la période sélectionnée' :
                    'Total number of orders assigned to agents in the selected period'}>
                    <Info className="w-4 h-4 text-blue-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {formatNumber(data.summary.totalOrders)}
                </p>
                <p className="text-sm text-blue-600">
                  {language === 'fr' ? 'assignées aux agents' : 'assigned to agents'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Delivered Orders */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-medium text-sm">
                    {language === 'fr' ? 'Commandes Livrées' : 'Orders Delivered'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Nombre de commandes traitées par les agents et livrées avec succès' :
                    'Number of orders handled by agents and successfully delivered'}>
                    <Info className="w-4 h-4 text-green-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {formatNumber(data.summary.deliveredOrders || Math.round(data.summary.totalOrders * (data.summary.averageSuccessRate / 100)))}
                </p>
                <p className="text-sm text-green-600">
                  {language === 'fr' ? 'livrées avec succès' : 'successfully delivered'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Delivery Rate */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <p className="text-purple-700 font-medium text-sm">
                    {language === 'fr' ? 'Taux de Livraison' : 'Delivery Rate'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Pourcentage moyen de commandes livrées par les agents: Taux de succès moyen' :
                    'Average percentage of orders delivered by agents: Average success rate'}>
                    <Info className="w-4 h-4 text-purple-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-purple-600 mb-1">
                  {data.summary.averageSuccessRate.toFixed(1)}%
                </p>
                <p className="text-sm text-purple-600">
                  {language === 'fr' ? 'taux de succès moyen' : 'average success rate'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Cancelled Orders */}
          <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 font-medium text-sm">
                    {language === 'fr' ? 'Commandes Annulées' : 'Orders Cancelled'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Estimation des commandes annulées basée sur le taux d\'échec moyen des agents' :
                    'Estimated cancelled orders based on average agent failure rate'}>
                    <Info className="w-4 h-4 text-red-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-red-600 mb-1">
                  {formatNumber(data.summary.cancelledOrders || Math.round(data.summary.totalOrders * ((100 - data.summary.averageSuccessRate) / 100)))}
                </p>
                <p className="text-sm text-red-600">
                  {language === 'fr' ? 'annulations estimées' : 'estimated cancellations'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
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

        {/* Quality Score Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Distribution des Scores Qualité' : 'Quality Score Distribution'}
              </h3>
              <p className="text-gray-600">
                {language === 'fr' ? 'Répartition des performances' : 'Performance distribution'}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            {chartData && chartData.qualityRanges.map((range, index) => {
              const maxCount = Math.max(...chartData.qualityRanges.map(r => r.count));
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

                  {/* Quality Score */}
                  <div className="lg:col-span-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">
                          {language === 'fr' ? 'Score Qualité' : 'Quality Score'}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {agent.qualityScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(agent.qualityScore, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {language === 'fr' ? 'Performance' : 'Performance'}
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

      {/* Quality Performance Metrics */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {language === 'fr' ? 'Métriques de Qualité' : 'Quality Metrics'}
            </h3>
            <p className="text-gray-600">
              {language === 'fr' ? 'Indicateurs de performance basés sur la qualité' : 'Quality-based performance indicators'}
            </p>
          </div>
          <Award className="w-8 h-8 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Average Quality Score */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <p className="text-purple-700 font-medium text-sm">
                    {language === 'fr' ? 'Score Qualité Moy.' : 'Avg Quality Score'}
                  </p>
                </div>
                <p className="text-2xl font-bold text-purple-600 mb-1">
                  {data.summary.averageQualityScore.toFixed(1)}%
                </p>
                <p className="text-sm text-purple-600">
                  {language === 'fr' ? 'performance globale' : 'overall performance'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Average Goal Achievement */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 font-medium text-sm">
                    {language === 'fr' ? 'Atteinte Objectifs' : 'Goal Achievement'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Pourcentage moyen d\'atteinte des objectifs fixés par les agents (basé sur les quotas et performances)' :
                    'Average percentage of goal achievement by agents (based on quotas and performance)'}>
                    <Info className="w-4 h-4 text-green-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {data.summary.averageGoalAchievement.toFixed(1)}%
                </p>
                <p className="text-sm text-green-600">
                  {language === 'fr' ? 'objectifs atteints' : 'goals achieved'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Average Note Completion */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-700 font-medium text-sm">
                    {language === 'fr' ? 'Complétion Notes' : 'Note Completion'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Pourcentage de commandes avec notes ajoutées par rapport au total des commandes traitées' :
                    'Percentage of orders with notes added compared to total orders handled'}>
                    <Info className="w-4 h-4 text-blue-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {data.summary.averageNoteCompletionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-blue-600">
                  {language === 'fr' ? 'notes ajoutées' : 'notes added'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Average Success Rate */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <p className="text-orange-700 font-medium text-sm">
                    {language === 'fr' ? 'Taux Succès Moy.' : 'Avg Success Rate'}
                  </p>
                  <Tooltip content={language === 'fr' ?
                    'Pourcentage moyen de commandes livrées avec succès par rapport aux commandes assignées' :
                    'Average percentage of successfully delivered orders compared to assigned orders'}>
                    <Info className="w-4 h-4 text-orange-500 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-orange-600 mb-1">
                  {data.summary.averageSuccessRate.toFixed(1)}%
                </p>
                <p className="text-sm text-orange-600">
                  {language === 'fr' ? 'commandes livrées' : 'orders delivered'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Quality Performers */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">
                {language === 'fr' ? 'Meilleurs Performers Qualité' : 'Top Quality Performers'}
              </h4>
              <p className="text-gray-600">
                {language === 'fr' ? 'Classés par score de qualité' : 'Ranked by quality score'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-gray-400" />
          </div>

          <div className="space-y-4">
            {chartData && chartData.topPerformers.slice(0, 5).map((agent, index) => (
              <div key={agent.id} className="flex items-center space-x-4 p-4 bg-white rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{agent.name?.[0] || 'A'}</span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getAvailabilityColor(agent.availability)} rounded-full border-2 border-white`}></div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-bold text-gray-900 truncate">{agent.name}</p>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                      {language === 'fr' ? 'Qualité' : 'Quality'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {agent.agentCode} • {agent.totalOrders} {language === 'fr' ? 'commandes' : 'orders'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600">{agent.qualityScore.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">{language === 'fr' ? 'score qualité' : 'quality score'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Notes Activity Analysis Section */}
      {agentNotesData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {language === 'fr' ? 'Analyse d\'Activité des Notes' : 'Notes Activity Analysis'}
                  </h3>
                  <Tooltip content={language === 'fr' ?
                    'Analyse complète de l\'activité des agents basée sur leurs notes: fréquence, qualité, temps de réponse et distribution horaire' :
                    'Complete analysis of agent activity based on their notes: frequency, quality, response time and hourly distribution'}>
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-gray-600">
                  {language === 'fr' ? 'Performance détaillée basée sur l\'activité des notes' : 'Detailed performance based on notes activity'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* Notes Summary Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Notes */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 opacity-80" />
                      <p className="text-indigo-100 font-medium">
                        {language === 'fr' ? 'Total des Notes' : 'Total Notes'}
                      </p>
                      <Tooltip content={language === 'fr' ?
                        'Nombre total de notes ajoutées par tous les agents dans la période sélectionnée' :
                        'Total number of notes added by all agents in the selected period'}>
                        <Info className="w-4 h-4 text-indigo-200 hover:text-white cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold mb-2">
                      {formatNumber(agentNotesData.summary.totalNotes)}
                    </p>
                    <p className="text-sm text-indigo-100">
                      {agentNotesData.summary.periodDays} {language === 'fr' ? 'jours' : 'days'}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              </div>

              {/* Active Agents with Notes */}
              <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-5 h-5 opacity-80" />
                      <p className="text-green-100 font-medium">
                        {language === 'fr' ? 'Agents Actifs' : 'Active Agents'}
                      </p>
                      <Tooltip content={language === 'fr' ?
                        'Nombre d\'agents ayant ajouté au moins une note dans la période sélectionnée' :
                        'Number of agents who added at least one note in the selected period'}>
                        <Info className="w-4 h-4 text-green-200 hover:text-white cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold mb-2">
                      {agentNotesData.summary.activeAgents}
                    </p>
                    <p className="text-sm text-green-100">
                      {language === 'fr' ? 'avec notes' : 'with notes'}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              </div>

              {/* Average Notes per Agent */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="w-5 h-5 opacity-80" />
                      <p className="text-amber-100 font-medium">
                        {language === 'fr' ? 'Moy. par Agent' : 'Avg per Agent'}
                      </p>
                      <Tooltip content={language === 'fr' ?
                        'Nombre moyen de notes ajoutées par agent actif dans la période' :
                        'Average number of notes added per active agent in the period'}>
                        <Info className="w-4 h-4 text-amber-200 hover:text-white cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold mb-2">
                      {agentNotesData.summary.averageNotesPerAgent.toFixed(1)}
                    </p>
                    <p className="text-sm text-amber-100">
                      {language === 'fr' ? 'notes/agent' : 'notes/agent'}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              </div>

              {/* Average Quality Score */}
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Award className="w-5 h-5 opacity-80" />
                      <p className="text-purple-100 font-medium">
                        {language === 'fr' ? 'Score Qualité' : 'Quality Score'}
                      </p>
                      <Tooltip content={language === 'fr' ?
                        'Score de qualité moyen des notes basé sur la longueur, fréquence et consistance des notes' :
                        'Average quality score of notes based on length, frequency and consistency of notes'}>
                        <Info className="w-4 h-4 text-purple-200 hover:text-white cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold mb-2">
                      {agentNotesData.summary.averageQualityScore.toFixed(1)}%
                    </p>
                    <p className="text-sm text-purple-100">
                      {language === 'fr' ? 'moyenne' : 'average'}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Award className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              </div>
            </div>

            {/* Top Notes Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">
                        {language === 'fr' ? 'Meilleurs Performeurs de Notes' : 'Top Notes Performers'}
                      </h4>
                      <Tooltip content={language === 'fr' ?
                        'Top 5 des agents avec les meilleurs scores de qualité de notes basés sur productivité et consistance' :
                        'Top 5 agents with best note quality scores based on productivity and consistency'}>
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-gray-600">
                      {language === 'fr' ? 'Classés par score de qualité' : 'Ranked by quality score'}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-gray-400" />
                </div>

                <div className="space-y-4">
                  {agentNotesData.topPerformers.slice(0, 5).map((agent, index) => (
                    <div key={agent.id} className="flex items-center space-x-4 p-4 bg-white rounded-xl hover:shadow-md transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">{agent.name?.[0] || 'A'}</span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getAvailabilityColor(agent.availability)} rounded-full border-2 border-white`}></div>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-bold text-gray-900 truncate">{agent.name}</p>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                            #{agent.productivityRank}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {agent.agentCode} • {agent.totalNotes} {language === 'fr' ? 'notes' : 'notes'}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-600">{agent.noteQualityScore.toFixed(1)}%</p>
                        <p className="text-xs text-gray-600">{language === 'fr' ? 'qualité' : 'quality'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Peak Hours */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">
                        {language === 'fr' ? 'Heures de Pointe Globales' : 'Global Peak Hours'}
                      </h4>
                      <Tooltip content={language === 'fr' ?
                        'Distribution des notes par heure de la journée montrant les heures de plus forte activité des agents' :
                        'Distribution of notes by hour of day showing peak activity hours for agents'}>
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </Tooltip>
                    </div>
                    <p className="text-gray-600">
                      {language === 'fr' ? 'Distribution horaire des notes' : 'Hourly distribution of notes'}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>

                <div className="space-y-3">
                  {agentNotesData.globalHourlyDistribution.map((count, hour) => {
                    const maxCount = Math.max(...agentNotesData.globalHourlyDistribution);
                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const isPeak = hour === agentNotesData.summary.globalPeakHour;
                    
                    return (
                      <div key={hour} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`font-medium ${isPeak ? 'text-orange-600' : 'text-gray-900'}`}>
                              {hour.toString().padStart(2, '0')}:00
                            </span>
                            {isPeak && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                                {language === 'fr' ? 'Pointe' : 'Peak'}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${isPeak ? 'text-orange-600' : 'text-gray-900'}`}>
                              {count}
                            </span>
                            <span className="text-sm text-gray-600 ml-1">
                              {language === 'fr' ? 'notes' : 'notes'}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isPeak ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detailed Agent Notes Performance Table */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-900">
                      {language === 'fr' ? 'Performance Détaillée des Notes' : 'Detailed Notes Performance'}
                    </h4>
                    <Tooltip content={language === 'fr' ?
                      'Tableau détaillé des métriques de notes pour chaque agent: total, qualité, temps de réponse, longueur moyenne' :
                      'Detailed table of note metrics for each agent: total, quality, response time, average length'}>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-gray-600">
                    {language === 'fr' ? 'Métriques complètes par agent' : 'Complete metrics per agent'}
                  </p>
                </div>
                <User className="w-8 h-8 text-gray-400" />
              </div>

              <div className="space-y-4">
                {agentNotesData.agentAnalytics.slice(0, 10).map((agent) => (
                  <div key={agent.id} className="p-4 bg-white rounded-xl hover:shadow-md transition-all">
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

                      {/* Notes Stats */}
                      <div className="lg:col-span-1">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {language === 'fr' ? 'Notes Totales' : 'Total Notes'}
                          </p>
                          <p className="text-lg font-bold text-gray-900">{agent.totalNotes}</p>
                          <p className="text-xs text-gray-600">
                            {agent.notesPerDay.toFixed(1)} {language === 'fr' ? '/jour' : '/day'}
                          </p>
                        </div>
                      </div>

                      {/* Quality Score */}
                      <div className="lg:col-span-1">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {language === 'fr' ? 'Score Qualité' : 'Quality Score'}
                          </p>
                          <div className="text-lg font-bold text-purple-600 mb-2">
                            {agent.noteQualityScore.toFixed(1)}%
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                            #{agent.productivityRank}
                          </span>
                        </div>
                      </div>

                      {/* Response Time */}
                      <div className="lg:col-span-1">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {language === 'fr' ? 'Temps Réponse' : 'Response Time'}
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            {agent.averageTimeToFirstNote.toFixed(1)}h
                          </p>
                          <p className="text-xs text-gray-600">
                            {language === 'fr' ? 'première note' : 'first note'}
                          </p>
                        </div>
                      </div>

                      {/* Note Length */}
                      <div className="lg:col-span-1">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {language === 'fr' ? 'Long. Moyenne' : 'Avg Length'}
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            {agent.averageNoteLength.toFixed(0)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {language === 'fr' ? 'caractères' : 'characters'}
                          </p>
                        </div>
                      </div>

                      {/* Activity Days */}
                      <div className="lg:col-span-1">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {language === 'fr' ? 'Jours Actifs' : 'Active Days'}
                          </p>
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Activity className="w-3 h-3 text-gray-400" />
                            <span className="text-sm font-bold text-gray-900">
                              {agent.activeDaysWithNotes}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {language === 'fr' ? 'avec notes' : 'with notes'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}