'use client';

import { useState, useEffect } from 'react';
import QualityLayout from '@/components/quality/quality-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { QualityTicket, QualityTicketFilters } from '@/types/quality';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function QualityTicketsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  
  const [tickets, setTickets] = useState<QualityTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<QualityTicketFilters>({
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id, filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.decision) params.append('decision', filters.decision);

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.data.tickets);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket =>
    searchTerm === '' ||
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.order.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">{t('qualityTickets')}</h1>
          <p className="text-gray-600 mt-1">
            {t('viewAndManageQualityTickets')}
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('allStatuses')}</option>
                <option value="OPEN">{t('openTicket')}</option>
                <option value="IN_PROGRESS">{t('inProgressTicket')}</option>
                <option value="RESOLVED">{t('resolvedTicket')}</option>
                <option value="CLOSED">{t('closedTicket')}</option>
              </select>

              <select
                value={filters.stage || ''}
                onChange={(e) => setFilters({ ...filters, stage: e.target.value as any, page: 1 })}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('allStages')}</option>
                <option value="INITIAL_REVIEW">{t('initialReview')}</option>
                <option value="INSPECTION">{t('inspection')}</option>
                <option value="DECISION">{t('decision')}</option>
                <option value="RESOLUTION">{t('resolution')}</option>
              </select>

              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value as any, page: 1 })}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('allSeverities')}</option>
                <option value="MINOR">{t('minorSeverity')}</option>
                <option value="MODERATE">{t('moderateSeverity')}</option>
                <option value="MAJOR">{t('majorSeverity')}</option>
                <option value="CRITICAL">{t('criticalSeverity')}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Tickets Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('ticket')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('order')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('severity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('reviewStage')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500">{t('noTicketsFound')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{ticket.title}</p>
                          <p className="text-sm text-gray-500">{ticket.order.customer.fullName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{ticket.order.reference}</p>
                      </td>
                      <td className="px-6 py-4">
                        {ticket.qualitySeverity && (
                          <Badge className={getSeverityColor(ticket.qualitySeverity)}>
                            {t(`${ticket.qualitySeverity.toLowerCase()}Severity` as any)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ticket.qualityReviewStage && (
                          <Badge className={getStageColor(ticket.qualityReviewStage)}>
                            {t(ticket.qualityReviewStage === 'INITIAL_REVIEW' ? 'initialReview' : ticket.qualityReviewStage.toLowerCase() as any)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(ticket.status)}>
                          {t(`${ticket.status.toLowerCase().replace('_', '')}Ticket` as any)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/quality-agent/tickets/${ticket.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            {t('viewDetails')}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
        </div>
      </div>
    </QualityLayout>
  );
}