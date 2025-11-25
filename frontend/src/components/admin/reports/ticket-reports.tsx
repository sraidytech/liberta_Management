'use client';

import { useLanguage } from '@/lib/language-context';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  MessageSquare,
  Activity,
  Package
} from 'lucide-react';

interface TicketReportsProps {
  data: any;
  loading: boolean;
  filters: any;
}

export default function TicketReports({ data, loading, filters }: TicketReportsProps) {
  const { language } = useLanguage();

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        ticketOverview: 'Ticket System Overview',
        totalTickets: 'Total Tickets',
        activeTickets: 'Active Tickets',
        resolvedTickets: 'Resolved Tickets',
        avgResolutionTime: 'Avg Resolution Time',
        hours: 'hours',
        statusDistribution: 'Status Distribution',
        priorityDistribution: 'Priority Distribution',
        categoryDistribution: 'Category Distribution',
        agentTicketAnalysis: 'Agent Ticket Analysis',
        ticketAging: 'Ticket Aging Analysis',
        criticalTickets: 'Critical Tickets Summary',
        agent: 'Agent',
        total: 'Total',
        byCategory: 'By Category',
        critical: 'Critical',
        resolved: 'Resolved',
        resolutionRate: 'Resolution Rate',
        open: 'Open',
        inProgress: 'In Progress',
        closed: 'Closed',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
        customerIssue: 'Customer Issue',
        productIssue: 'Product Issue',
        deliveryIssue: 'Delivery Issue',
        systemIssue: 'System Issue',
        paymentIssue: 'Payment Issue',
        exchange: 'Exchange',
        refund: 'Refund',
        qualityControl: 'Quality Control',
        other: 'Other',
        lessThan24h: '< 24 hours',
        oneToThreeDays: '1-3 days',
        threeToSevenDays: '3-7 days',
        moreThanSevenDays: '> 7 days',
        noData: 'No data available for the selected period',
        tickets: 'Tickets',
        rank: 'Rank'
      },
      fr: {
        ticketOverview: 'Aperçu du Système de Tickets',
        totalTickets: 'Total des Tickets',
        activeTickets: 'Tickets Actifs',
        resolvedTickets: 'Tickets Résolus',
        avgResolutionTime: 'Temps Moy. Résolution',
        hours: 'heures',
        statusDistribution: 'Distribution par Statut',
        priorityDistribution: 'Distribution par Priorité',
        categoryDistribution: 'Distribution par Catégorie',
        agentTicketAnalysis: 'Analyse des Tickets par Agent',
        ticketAging: 'Analyse de Vieillissement',
        criticalTickets: 'Résumé des Tickets Critiques',
        agent: 'Agent',
        total: 'Total',
        byCategory: 'Par Catégorie',
        critical: 'Critique',
        resolved: 'Résolu',
        resolutionRate: 'Taux de Résolution',
        open: 'Ouvert',
        inProgress: 'En Cours',
        closed: 'Fermé',
        low: 'Bas',
        medium: 'Moyen',
        high: 'Élevé',
        urgent: 'Urgent',
        customerIssue: 'Problème Client',
        productIssue: 'Problème Produit',
        deliveryIssue: 'Problème Livraison',
        systemIssue: 'Problème Système',
        paymentIssue: 'Problème Paiement',
        exchange: 'Échange',
        refund: 'Remboursement',
        qualityControl: 'Contrôle Qualité',
        other: 'Autre',
        lessThan24h: '< 24 heures',
        oneToThreeDays: '1-3 jours',
        threeToSevenDays: '3-7 jours',
        moreThanSevenDays: '> 7 jours',
        noData: 'Aucune donnée disponible pour la période sélectionnée',
        tickets: 'Tickets',
        rank: 'Rang'
      }
    };
    return translations[language][key] || key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || !data.overview) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{t('noData')}</p>
      </div>
    );
  }

  const { overview, categoryDistribution, priorityDistribution, agentAnalysis, ticketAging, criticalSummary } = data;

  // Prepare category distribution data
  const categoryData = categoryDistribution?.map((item: any) => ({
    name: t(item.category.toLowerCase().replace(/_/g, '')),
    count: item.count,
    percentage: overview.totalTickets > 0 ? ((item.count / overview.totalTickets) * 100).toFixed(1) : 0
  })) || [];

  // Prepare priority distribution data
  const priorityData = priorityDistribution?.map((item: any) => ({
    name: t(item.priority.toLowerCase()),
    count: item.count,
    percentage: overview.totalTickets > 0 ? ((item.count / overview.totalTickets) * 100).toFixed(1) : 0,
    color: item.priority === 'URGENT' ? 'bg-red-500' : 
           item.priority === 'HIGH' ? 'bg-orange-500' : 
           item.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
  })) || [];

  // Prepare aging data
  const agingData = ticketAging ? [
    { name: t('lessThan24h'), value: ticketAging.lessThan24Hours, color: 'bg-green-500' },
    { name: t('oneToThreeDays'), value: ticketAging.oneToThreeDays, color: 'bg-yellow-500' },
    { name: t('threeToSevenDays'), value: ticketAging.threeToSevenDays, color: 'bg-orange-500' },
    { name: t('moreThanSevenDays'), value: ticketAging.moreThanSevenDays, color: 'bg-red-500' }
  ] : [];

  const totalAging = agingData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('totalTickets')}</span>
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{overview.totalTickets}</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('activeTickets')}</span>
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{overview.activeTickets}</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('resolvedTickets')}</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{overview.byStatus?.resolved || 0}</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('avgResolutionTime')}</span>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {overview.averageResolutionTimeHours}
            <span className="text-lg text-gray-500 ml-1">{t('hours')}</span>
          </div>
        </Card>
      </div>

      {/* Critical Tickets Summary */}
      {criticalSummary && (
        <Card className="p-6 border-l-4 border-l-red-500">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            {t('criticalTickets')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">{t('total')}</div>
              <div className="text-2xl font-bold text-gray-900">{criticalSummary.total}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">{t('open')}</div>
              <div className="text-2xl font-bold text-red-600">{criticalSummary.open}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">{t('resolved')}</div>
              <div className="text-2xl font-bold text-green-600">{criticalSummary.resolved}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">{t('resolutionRate')}</div>
              <div className="text-2xl font-bold text-blue-600">{criticalSummary.resolutionRate}%</div>
            </div>
          </div>
        </Card>
      )}

      {/* Category Distribution - Modern Progress Bars */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Package className="w-5 h-5 mr-2 text-gray-700" />
          {t('categoryDistribution')}
        </h3>
        <div className="space-y-4">
          {categoryData.map((category: any) => (
            <div key={category.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
                <span className="text-sm font-bold text-gray-900">{category.count} ({category.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Priority Distribution - Modern Progress Bars */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-gray-700" />
          {t('priorityDistribution')}
        </h3>
        <div className="space-y-4">
          {priorityData.map((priority: any) => (
            <div key={priority.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{priority.name}</span>
                <span className="text-sm font-bold text-gray-900">{priority.count} ({priority.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${priority.color} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${priority.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Ticket Aging - Modern Progress Bars */}
      {agingData.length > 0 && totalAging > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-700" />
            {t('ticketAging')}
          </h3>
          <div className="space-y-4">
            {agingData.map((aging) => (
              <div key={aging.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{aging.name}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {aging.value} ({((aging.value / totalAging) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${aging.color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${(aging.value / totalAging) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agent Ticket Analysis Table */}
      {agentAnalysis && agentAnalysis.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-700" />
            {t('agentTicketAnalysis')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('rank')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('agent')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('total')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('critical')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('resolved')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('resolutionRate')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('byCategory')}</th>
                </tr>
              </thead>
              <tbody>
                {agentAnalysis.slice(0, 15).map((agent: any, index: number) => (
                  <tr key={agent.agentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{agent.agentName}</div>
                      <div className="text-sm text-gray-500">{agent.agentCode}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-gray-900">{agent.totalTickets}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                        {agent.criticalTickets}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-green-600 font-semibold">{agent.resolvedTickets}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        agent.resolutionRate >= 70 ? 'bg-green-100 text-green-800' :
                        agent.resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {agent.resolutionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(agent.byCategory).slice(0, 3).map(([category, count]: [string, any]) => (
                          <span key={category} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {category.replace(/_/g, ' ')}: {count}
                          </span>
                        ))}
                        {Object.keys(agent.byCategory).length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            +{Object.keys(agent.byCategory).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}