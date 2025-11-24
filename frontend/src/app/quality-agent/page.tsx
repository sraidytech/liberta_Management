'use client';

import { useState, useEffect } from 'react';
import QualityLayout from '@/components/quality/quality-layout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { QualityStatistics, QualityTicket } from '@/types/quality';
import {
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function QualityAgentDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  
  const [statistics, setStatistics] = useState<QualityStatistics | null>(null);
  const [recentTickets, setRecentTickets] = useState<QualityTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Fetch statistics
      const statsResponse = await fetch(`${apiBaseUrl}/api/v1/quality/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.data.statistics);
      }

      // Fetch recent tickets
      const ticketsResponse = await fetch(`${apiBaseUrl}/api/v1/quality/tickets?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setRecentTickets(ticketsData.data.tickets);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'MINOR': return 'bg-blue-100 text-blue-800';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
      case 'MAJOR': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'INITIAL_REVIEW': return 'bg-blue-100 text-blue-800';
      case 'INSPECTION': return 'bg-purple-100 text-purple-800';
      case 'DECISION': return 'bg-orange-100 text-orange-800';
      case 'RESOLUTION': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <QualityLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">{t('loading')}</div>
        </div>
      </QualityLayout>
    );
  }

  return (
    <QualityLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('qualityDashboard')}</h1>
          <p className="text-gray-600 mt-1">
            {t('welcome')}, {user?.name}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('pendingReviews')}</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {statistics?.pendingReviews || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ClipboardList className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('completedToday')}</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {statistics?.completedToday || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('approvalRate')}</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {statistics?.approvalRate?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('averageReviewTime')}</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {statistics?.averageReviewTime?.toFixed(1) || 0}h
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Issues by Severity */}
        {statistics?.issuesBySeverity && Object.keys(statistics.issuesBySeverity).length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('issuesBySeverity')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statistics.issuesBySeverity).map(([severity, count]) => (
                <div key={severity} className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(severity)}`}>
                    {t(`${severity.toLowerCase()}Severity` as any)}
                  </div>
                  <p className="text-2xl font-bold mt-2">{count}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Tickets */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t('recentTickets')}</h2>
            <Link 
              href="/quality-agent/tickets"
              className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium"
            >
              {t('viewAll')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>{t('noTicketsFound')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/quality-agent/tickets/${ticket.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                        {ticket.qualitySeverity && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(ticket.qualitySeverity)}`}>
                            {t(`${ticket.qualitySeverity.toLowerCase()}Severity` as any)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {t('order')}: {ticket.order.reference} • {ticket.order.customer.fullName}
                      </p>
                      {ticket.qualityReviewStage && (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStageColor(ticket.qualityReviewStage)}`}>
                          {t(ticket.qualityReviewStage.toLowerCase().replace('_', '') as any)}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/quality-agent/tickets">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <ClipboardList className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{t('qualityTickets')}</h3>
              <p className="text-sm text-gray-600">{t('viewAndManageQualityTickets')}</p>
            </Card>
          </Link>

          <Link href="/quality-agent/statistics">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <TrendingUp className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{t('qualityStatistics')}</h3>
              <p className="text-sm text-gray-600">{t('viewDetailedStatistics')}</p>
            </Card>
          </Link>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
            <AlertTriangle className="h-8 w-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">{t('needHelp')}</h3>
            <p className="text-sm text-gray-600">{t('contactYourTeamManager')}</p>
          </Card>
        </div>
        </div>
      </div>
    </QualityLayout>
  );
}