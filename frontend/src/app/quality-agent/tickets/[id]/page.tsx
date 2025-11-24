'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QualityLayout from '@/components/quality/quality-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { QualityTicket } from '@/types/quality';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Package,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function QualityTicketReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  
  const [ticket, setTicket] = useState<QualityTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState<'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL'>('MODERATE');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Full API response:', data);
        console.log('data.data:', data.data);
        console.log('data.data.ticket:', data.data.ticket);
        setTicket(data.data.ticket);
        console.log('Ticket state set to:', data.data.ticket);
      } else {
        router.push('/quality-agent/tickets');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      router.push('/quality-agent/tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchTicket();
    }
  }, [params.id]);

  const handleApprove = async () => {
    if (!notes.trim()) {
      alert(t('notesRequired'));
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets/${params.id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvalNotes: notes })
      });

      if (response.ok) {
        alert(t('ticketApprovedSuccessfully'));
        router.push('/quality-agent/tickets');
      } else {
        const error = await response.json();
        alert(error.message || t('errorApprovingTicket'));
      }
    } catch (error) {
      console.error('Error approving ticket:', error);
      alert(t('errorApprovingTicket'));
    } finally {
      setActionLoading(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      alert(t('notesRequired'));
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets/${params.id}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejectionReason: notes })
      });

      if (response.ok) {
        alert(t('ticketRejectedSuccessfully'));
        router.push('/quality-agent/tickets');
      } else {
        const error = await response.json();
        alert(error.message || t('errorRejectingTicket'));
      }
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      alert(t('errorRejectingTicket'));
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const handleEscalate = async () => {
    if (!notes.trim()) {
      alert(t('notesRequired'));
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets/${params.id}/escalate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ escalationReason: notes })
      });

      if (response.ok) {
        alert(t('ticketEscalatedSuccessfully'));
        router.push('/quality-agent/tickets');
      } else {
        const error = await response.json();
        alert(error.message || t('errorEscalatingTicket'));
      }
    } catch (error) {
      console.error('Error escalating ticket:', error);
      alert(t('errorEscalatingTicket'));
    } finally {
      setActionLoading(false);
      setShowEscalateModal(false);
    }
  };

  const updateStage = async (stage: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets/${params.id}/stage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage })
      });

      if (response.ok) {
        fetchTicket();
      }
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const updateSeverity = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/v1/quality/tickets/${params.id}/severity`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ severity })
      });

      if (response.ok) {
        fetchTicket();
      }
    } catch (error) {
      console.error('Error updating severity:', error);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-blue-100 text-blue-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
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

  console.log('Render - loading:', loading, 'ticket:', ticket);

  if (loading) {
    return (
      <QualityLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">{t('loading')}</div>
        </div>
      </QualityLayout>
    );
  }

  if (!ticket) {
    console.log('Ticket is null/undefined, showing not found');
    return (
      <QualityLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">{t('ticketNotFound')}</div>
        </div>
      </QualityLayout>
    );
  }

  return (
    <QualityLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link href="/quality-agent/tickets">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('back')}
                  </Button>
                </Link>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status}
                </Badge>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{ticket?.title || 'No Title'}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{t('created')}: {formatDate(ticket.createdAt)}</span>
                </div>
                {ticket.reporter && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{t('reportedBy')}: {ticket.reporter.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Info */}
            <Card className="p-6 shadow-sm border-gray-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                {t('ticketInformation')}
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('description')}</label>
                  <p className="mt-2 text-gray-900 leading-relaxed">{ticket?.description || 'No description'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-blue-700 uppercase tracking-wide">{t('category')}</label>
                    <p className="mt-2 text-blue-900 font-semibold">{ticket?.category || 'N/A'}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-orange-700 uppercase tracking-wide">{t('priority')}</label>
                    <p className="mt-2 text-orange-900 font-semibold">{ticket?.priority || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Order Info */}
            {ticket.order && (
              <Card className="p-6 shadow-sm border-gray-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  {t('orderInformation')}
                </h2>
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-700">{t('reference')}</span>
                      <span className="font-bold text-purple-900 text-lg">{ticket.order?.reference || 'N/A'}</span>
                    </div>
                  </div>
                  {ticket.order.customer && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">{t('customer')}</span>
                        <span className="font-semibold text-gray-900">{ticket.order.customer?.fullName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">{t('phone')}</span>
                        <span className="font-mono font-medium text-gray-900">{ticket.order.customer?.telephone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">{t('wilaya')}</span>
                        <span className="font-medium text-gray-900">{ticket.order.customer?.wilaya || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                  {ticket.order.items && ticket.order.items.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-green-800 mb-3">{t('products')}</h3>
                      <div className="space-y-2">
                        {ticket.order.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-green-900">{item.title}</span>
                            <span className="font-medium text-green-800">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quality Notes */}
            {ticket.qualityNotes && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t('qualityNotes')}
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.qualityNotes}</p>
              </Card>
            )}

            {/* Messages */}
            {ticket.messages && ticket.messages.length > 0 && (
              <Card className="p-6 shadow-sm border-gray-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                  {t('messages')}
                </h2>
                <div className="space-y-3">
                  {ticket.messages.map((message: any) => (
                    <div key={message.id} className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 rounded-r-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-indigo-100 rounded-full p-1">
                          <User className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span className="font-semibold text-sm text-indigo-900">{message.sender?.name || 'Unknown'}</span>
                        <span className="text-xs text-indigo-600 ml-auto">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="text-gray-800 leading-relaxed pl-7">{message.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Stage */}
            <Card className="p-6 shadow-sm border-gray-200">
              <h3 className="font-semibold mb-4 text-gray-900">{t('reviewStage')}</h3>
              <div className="space-y-2">
                {['INITIAL_REVIEW', 'INSPECTION', 'DECISION', 'RESOLUTION'].map((stage, index) => {
                  const stageKey = stage === 'INITIAL_REVIEW' ? 'initialReview' : stage.toLowerCase();
                  return (
                    <button
                      key={stage}
                      onClick={() => updateStage(stage)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        ticket.qualityReviewStage === stage
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-md transform scale-105'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        ticket.qualityReviewStage === stage ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span>{t(stageKey as any)}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Severity */}
            <Card className="p-6 shadow-sm border-gray-200">
              <h3 className="font-semibold mb-4 text-gray-900">{t('severity')}</h3>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 mb-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="MINOR">{t('minorSeverity')}</option>
                <option value="MODERATE">{t('moderateSeverity')}</option>
                <option value="MAJOR">{t('majorSeverity')}</option>
                <option value="CRITICAL">{t('criticalSeverity')}</option>
              </select>
              <Button onClick={updateSeverity} className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                {t('updateSeverity')}
              </Button>
              {ticket.qualitySeverity && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">{t('currentSeverity')}</p>
                  <Badge className={`${getSeverityColor(ticket.qualitySeverity)} text-sm px-3 py-1`}>
                    {t(`${ticket.qualitySeverity.toLowerCase()}Severity` as any)}
                  </Badge>
                </div>
              )}
            </Card>

            {/* Actions */}
            <Card className="p-6 shadow-sm border-gray-200">
              <h3 className="font-semibold mb-4 text-gray-900">{t('actions')}</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => setShowApproveModal(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={ticket.status === 'RESOLVED'}
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {t('approve')}
                </Button>
                <Button
                  onClick={() => setShowRejectModal(true)}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={ticket.status === 'RESOLVED'}
                  size="lg"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  {t('reject')}
                </Button>
                <Button
                  onClick={() => setShowEscalateModal(true)}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={ticket.status === 'RESOLVED'}
                  size="lg"
                >
                  <TrendingUp className="h-5 w-5 mr-2" />
                  {t('escalate')}
                </Button>
              </div>
            </Card>

            {/* Metadata */}
            <Card className="p-6 shadow-sm border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <h3 className="font-semibold mb-4 text-gray-900">{t('metadata')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('created')}</p>
                    <p className="font-semibold text-gray-900">{formatDate(ticket.createdAt)}</p>
                  </div>
                </div>
                {ticket.qualityReviewedAt && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{t('reviewed')}</p>
                      <p className="font-semibold text-gray-900">{formatDate(ticket.qualityReviewedAt)}</p>
                    </div>
                  </div>
                )}
                {ticket.assignee && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <User className="h-5 w-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{t('assignedTo')}</p>
                      <p className="font-semibold text-gray-900">{ticket.assignee.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Modals */}
        {showApproveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t('approveTicket')}</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('enterApprovalNotes')}
                rows={4}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={actionLoading} className="flex-1">
                  {actionLoading ? t('processing') : t('confirm')}
                </Button>
                <Button onClick={() => setShowApproveModal(false)} variant="outline" className="flex-1">
                  {t('cancel')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t('rejectTicket')}</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('enterRejectionReason')}
                rows={4}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button onClick={handleReject} disabled={actionLoading} className="flex-1 bg-red-600 hover:bg-red-700">
                  {actionLoading ? t('processing') : t('confirm')}
                </Button>
                <Button onClick={() => setShowRejectModal(false)} variant="outline" className="flex-1">
                  {t('cancel')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showEscalateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">{t('escalateTicket')}</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('enterEscalationReason')}
                rows={4}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button onClick={handleEscalate} disabled={actionLoading} className="flex-1 bg-orange-600 hover:bg-orange-700">
                  {actionLoading ? t('processing') : t('confirm')}
                </Button>
                <Button onClick={() => setShowEscalateModal(false)} variant="outline" className="flex-1">
                  {t('cancel')}
                </Button>
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
    </QualityLayout>
  );
}