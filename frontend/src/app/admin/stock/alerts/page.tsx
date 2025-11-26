'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const t = {
  en: {
    title: 'Stock Alerts',
    markAllRead: 'Mark All Resolved',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    resolve: 'Resolve',
    resolved: 'Resolved',
    loading: 'Loading...',
    noAlerts: 'No active alerts',
    units: 'units',
    threshold: 'threshold',
    all: 'All',
  },
  fr: {
    title: 'Alertes de Stock',
    markAllRead: 'Tout Résoudre',
    critical: 'Critique',
    warning: 'Avertissement',
    info: 'Info',
    resolve: 'Résoudre',
    resolved: 'Résolu',
    loading: 'Chargement...',
    noAlerts: 'Aucune alerte active',
    units: 'unités',
    threshold: 'seuil',
    all: 'Tous',
  },
};

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  currentQuantity: number;
  threshold?: number;
  resolved: boolean;
  product: {
    name: string;
    unit: string;
  };
  createdAt: string;
}

export default function AlertsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await stockService.getAlerts({ resolved: false });
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await stockService.resolveAlert(alertId);
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    const icons = {
      CRITICAL: <XCircle className="w-5 h-5" />,
      WARNING: <AlertTriangle className="w-5 h-5" />,
      INFO: <Info className="w-5 h-5" />,
    };
    return icons[severity as keyof typeof icons] || icons.INFO;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-50 border-red-200 text-red-800',
      WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
      INFO: 'bg-blue-50 border-blue-200 text-blue-800',
    };
    return colors[severity as keyof typeof colors] || colors.INFO;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter === 'all') return true;
    return alert.severity === severityFilter;
  });

  // Group alerts by severity
  const groupedAlerts = {
    CRITICAL: filteredAlerts.filter(a => a.severity === 'CRITICAL'),
    WARNING: filteredAlerts.filter(a => a.severity === 'WARNING'),
    INFO: filteredAlerts.filter(a => a.severity === 'INFO'),
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Choose layout based on user role
  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t[language].loading}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Button
              variant={severityFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setSeverityFilter('all')}
              size="sm"
            >
              {t[language].all}
            </Button>
            <Button
              variant={severityFilter === 'CRITICAL' ? 'default' : 'outline'}
              onClick={() => setSeverityFilter('CRITICAL')}
              size="sm"
            >
              {t[language].critical}
            </Button>
            <Button
              variant={severityFilter === 'WARNING' ? 'default' : 'outline'}
              onClick={() => setSeverityFilter('WARNING')}
              size="sm"
            >
              {t[language].warning}
            </Button>
            <Button
              variant={severityFilter === 'INFO' ? 'default' : 'outline'}
              onClick={() => setSeverityFilter('INFO')}
              size="sm"
            >
              {t[language].info}
            </Button>
          </div>
        </Card>

        {/* Alerts */}
        {filteredAlerts.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              {t[language].noAlerts}
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Critical Alerts */}
            {groupedAlerts.CRITICAL.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  {t[language].critical}
                </h2>
                <div className="space-y-3">
                  {groupedAlerts.CRITICAL.map((alert) => (
                    <Card key={alert.id} className={`p-4 border-2 ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityIcon(alert.severity)}
                            <h3 className="font-semibold">{alert.product.name}</h3>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span>
                              {alert.currentQuantity} {alert.product.unit}
                            </span>
                            {alert.threshold && (
                              <span className="text-gray-600">
                                {t[language].threshold}: {alert.threshold} {alert.product.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleResolve(alert.id)}
                          size="sm"
                          variant="outline"
                        >
                          {t[language].resolve}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Warning Alerts */}
            {groupedAlerts.WARNING.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t[language].warning}
                </h2>
                <div className="space-y-3">
                  {groupedAlerts.WARNING.map((alert) => (
                    <Card key={alert.id} className={`p-4 border-2 ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityIcon(alert.severity)}
                            <h3 className="font-semibold">{alert.product.name}</h3>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span>
                              {alert.currentQuantity} {alert.product.unit}
                            </span>
                            {alert.threshold && (
                              <span className="text-gray-600">
                                {t[language].threshold}: {alert.threshold} {alert.product.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleResolve(alert.id)}
                          size="sm"
                          variant="outline"
                        >
                          {t[language].resolve}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Info Alerts */}
            {groupedAlerts.INFO.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  {t[language].info}
                </h2>
                <div className="space-y-3">
                  {groupedAlerts.INFO.map((alert) => (
                    <Card key={alert.id} className={`p-4 border-2 ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityIcon(alert.severity)}
                            <h3 className="font-semibold">{alert.product.name}</h3>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span>
                              {alert.currentQuantity} {alert.product.unit}
                            </span>
                            {alert.threshold && (
                              <span className="text-gray-600">
                                {t[language].threshold}: {alert.threshold} {alert.product.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleResolve(alert.id)}
                          size="sm"
                          variant="outline"
                        >
                          {t[language].resolve}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}