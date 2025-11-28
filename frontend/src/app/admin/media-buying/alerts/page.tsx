'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mediaBuyingService, BudgetAlert } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Budget Alerts',
    allAlerts: 'All Alerts',
    unreadOnly: 'Unread Only',
    markAsRead: 'Mark as Read',
    markAllRead: 'Mark All as Read',
    loading: 'Loading...',
    error: 'Error loading data',
    noAlerts: 'No alerts',
    noUnreadAlerts: 'No unread alerts',
    threshold50: '50% Budget Used',
    threshold75: '75% Budget Used',
    threshold90: '90% Budget Used',
    exceeded: 'Budget Exceeded',
    read: 'Read',
    unread: 'Unread',
    alertTypes: {
      THRESHOLD_50: '50% Threshold',
      THRESHOLD_75: '75% Threshold',
      THRESHOLD_90: '90% Threshold',
      EXCEEDED: 'Exceeded',
    },
  },
  fr: {
    title: 'Alertes Budget',
    allAlerts: 'Toutes les Alertes',
    unreadOnly: 'Non Lues',
    markAsRead: 'Marquer comme Lu',
    markAllRead: 'Tout Marquer Lu',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noAlerts: 'Aucune alerte',
    noUnreadAlerts: 'Aucune alerte non lue',
    threshold50: '50% Budget Utilisé',
    threshold75: '75% Budget Utilisé',
    threshold90: '90% Budget Utilisé',
    exceeded: 'Budget Dépassé',
    read: 'Lu',
    unread: 'Non Lu',
    alertTypes: {
      THRESHOLD_50: 'Seuil 50%',
      THRESHOLD_75: 'Seuil 75%',
      THRESHOLD_90: 'Seuil 90%',
      EXCEEDED: 'Dépassé',
    },
  },
};

export default function MediaBuyingAlertsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [showUnreadOnly]);

  const loadAlerts = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await mediaBuyingService.getAlerts(showUnreadOnly);
      setAlerts(data);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await mediaBuyingService.markAlertAsRead(alertId);
      loadAlerts();
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadAlerts = alerts.filter(a => !a.isRead);
      await Promise.all(unreadAlerts.map(a => mediaBuyingService.markAlertAsRead(a.id)));
      loadAlerts();
    } catch (err) {
      console.error('Error marking all alerts as read:', err);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'EXCEEDED':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'THRESHOLD_90':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'THRESHOLD_75':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'EXCEEDED':
        return 'bg-red-50 border-red-200';
      case 'THRESHOLD_90':
        return 'bg-red-50 border-red-200';
      case 'THRESHOLD_75':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getAlertBadgeColor = (alertType: string) => {
    switch (alertType) {
      case 'EXCEEDED':
        return 'bg-red-100 text-red-800';
      case 'THRESHOLD_90':
        return 'bg-red-100 text-red-800';
      case 'THRESHOLD_75':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="outline">
              <CheckCircle className="w-4 h-4 mr-2" />
              {t[language].markAllRead}
            </Button>
          )}
        </div>

        {/* Filter */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              <Button
                variant={!showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnreadOnly(false)}
                className={!showUnreadOnly ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                {t[language].allAlerts}
              </Button>
              <Button
                variant={showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnreadOnly(true)}
                className={showUnreadOnly ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                {t[language].unreadOnly}
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Alerts List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <Bell className="w-12 h-12 mb-4 text-gray-300" />
              <p>{showUnreadOnly ? t[language].noUnreadAlerts : t[language].noAlerts}</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={`p-4 border-2 transition-all ${getAlertColor(alert.alertType)} ${
                  alert.isRead ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      {getAlertIcon(alert.alertType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getAlertBadgeColor(alert.alertType)}`}>
                          {t[language].alertTypes[alert.alertType as keyof typeof t.en.alertTypes] || alert.alertType}
                        </span>
                        {alert.isRead ? (
                          <span className="inline-flex items-center text-xs text-gray-500">
                            <Check className="w-3 h-3 mr-1" />
                            {t[language].read}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-purple-600 font-medium">
                            {t[language].unread}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(alert.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!alert.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {t[language].markAsRead}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}