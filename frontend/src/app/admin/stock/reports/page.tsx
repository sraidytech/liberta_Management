'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { BarChart3, Download, Calendar, TrendingUp, Package, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';

const t = {
  en: {
    title: 'Stock Reports',
    reportType: 'Report Type',
    dateRange: 'Date Range',
    warehouse: 'Warehouse',
    generate: 'Generate Report',
    export: 'Export CSV',
    stockLevel: 'Stock Level Report',
    movements: 'Movement Report',
    valuation: 'Valuation Report',
    expiry: 'Expiry Report',
    lowStock: 'Low Stock Report',
    turnover: 'Turnover Report',
    selectReport: 'Select a report type to begin',
    loading: 'Generating report...',
    from: 'From',
    to: 'To',
    all: 'All Warehouses',
    product: 'Product',
    quantity: 'Quantity',
    value: 'Value',
    status: 'Status',
    expiryDate: 'Expiry Date',
    daysLeft: 'Days Left',
    turnoverRate: 'Turnover Rate',
  },
  fr: {
    title: 'Rapports de Stock',
    reportType: 'Type de Rapport',
    dateRange: 'Période',
    warehouse: 'Entrepôt',
    generate: 'Générer Rapport',
    export: 'Exporter CSV',
    stockLevel: 'Rapport de Niveau de Stock',
    movements: 'Rapport de Mouvements',
    valuation: 'Rapport de Valorisation',
    expiry: 'Rapport d\'Expiration',
    lowStock: 'Rapport de Stock Faible',
    turnover: 'Rapport de Rotation',
    selectReport: 'Sélectionnez un type de rapport pour commencer',
    loading: 'Génération du rapport...',
    from: 'De',
    to: 'À',
    all: 'Tous les Entrepôts',
    product: 'Produit',
    quantity: 'Quantité',
    value: 'Valeur',
    status: 'Statut',
    expiryDate: 'Date d\'Expiration',
    daysLeft: 'Jours Restants',
    turnoverRate: 'Taux de Rotation',
  },
};

const reportTypes = [
  { id: 'stock-level', icon: Package, labelEn: 'Stock Level Report', labelFr: 'Rapport de Niveau de Stock' },
  { id: 'movements', icon: TrendingUp, labelEn: 'Movement Report', labelFr: 'Rapport de Mouvements' },
  { id: 'valuation', icon: DollarSign, labelEn: 'Valuation Report', labelFr: 'Rapport de Valorisation' },
  { id: 'expiry', icon: Calendar, labelEn: 'Expiry Report', labelFr: 'Rapport d\'Expiration' },
  { id: 'low-stock', icon: AlertTriangle, labelEn: 'Low Stock Report', labelFr: 'Rapport de Stock Faible' },
  { id: 'turnover', icon: RefreshCw, labelEn: 'Turnover Report', labelFr: 'Rapport de Rotation' },
];

export default function ReportsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    
    setLoading(true);
    try {
      let data;
      switch (selectedReport) {
        case 'stock-level':
          data = await stockService.getStockLevelReport(filters.warehouseId ? { warehouseId: filters.warehouseId } : undefined);
          break;
        case 'movements':
          data = await stockService.getMovementReport({
            startDate: filters.startDate,
            endDate: filters.endDate,
            warehouseId: filters.warehouseId || undefined,
          });
          break;
        case 'valuation':
          data = await stockService.getValuationReport(filters.warehouseId ? { warehouseId: filters.warehouseId } : undefined);
          break;
        case 'expiry':
          data = await stockService.getExpiryReport(filters.warehouseId ? { warehouseId: filters.warehouseId } : undefined);
          break;
        case 'low-stock':
          data = await stockService.getLowStockReport(filters.warehouseId ? { warehouseId: filters.warehouseId } : undefined);
          break;
        case 'turnover':
          data = await stockService.getTurnoverReport({
            startDate: filters.startDate,
            endDate: filters.endDate,
            warehouseId: filters.warehouseId || undefined,
          });
          break;
      }
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedReport) return;
    
    try {
      const blob = await stockService.exportReport(selectedReport, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          {reportData && (
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t[language].export}
            </Button>
          )}
        </div>

        {/* Report Type Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t[language].reportType}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReport === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {language === 'en' ? report.labelEn : report.labelFr}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Filters */}
        {selectedReport && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(selectedReport === 'movements' || selectedReport === 'turnover') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t[language].from}
                    </label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t[language].to}
                    </label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t[language].warehouse}
                </label>
                <select
                  value={filters.warehouseId}
                  onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t[language].all}</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleGenerateReport} disabled={loading} className="w-full md:w-auto">
                <BarChart3 className="w-4 h-4 mr-2" />
                {loading ? t[language].loading : t[language].generate}
              </Button>
            </div>
          </Card>
        )}

        {/* Report Results */}
        {!selectedReport && !reportData && (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {t[language].selectReport}
            </div>
          </Card>
        )}

        {loading && (
          <Card className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t[language].loading}</p>
            </div>
          </Card>
        )}

        {reportData && !loading && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t[language].product}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t[language].quantity}
                    </th>
                    {selectedReport === 'valuation' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].value}
                      </th>
                    )}
                    {selectedReport === 'expiry' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].expiryDate}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].daysLeft}
                        </th>
                      </>
                    )}
                    {selectedReport === 'turnover' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].turnoverRate}
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t[language].status}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(reportData) && reportData.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.productName || item.product?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity || item.totalQuantity || '-'}
                      </td>
                      {selectedReport === 'valuation' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(item.value || 0).toLocaleString()}
                        </td>
                      )}
                      {selectedReport === 'expiry' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.daysUntilExpiry || '-'}
                          </td>
                        </>
                      )}
                      {selectedReport === 'turnover' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.turnoverRate ? `${item.turnoverRate.toFixed(2)}x` : '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'OK' || item.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'LOW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}