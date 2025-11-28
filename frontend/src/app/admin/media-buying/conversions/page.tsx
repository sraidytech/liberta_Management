'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaBuyingService, LeadConversion, MediaBuyingEntry } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  Plus, 
  X,
  Target,
  Link2,
  Unlink,
  Search,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Lead Conversions',
    linkLead: 'Link Lead to Order',
    entryId: 'Media Entry',
    orderId: 'Order ID',
    conversionValue: 'Conversion Value',
    linkedAt: 'Linked At',
    actions: 'Actions',
    unlink: 'Unlink',
    loading: 'Loading...',
    error: 'Error loading data',
    noConversions: 'No conversions found',
    createConversion: 'Link Lead to Order',
    save: 'Link',
    cancel: 'Cancel',
    selectEntry: 'Select media entry',
    confirmUnlink: 'Are you sure you want to unlink this conversion?',
    conversionStats: 'Conversion Statistics',
    totalConversions: 'Total Conversions',
    conversionRate: 'Conversion Rate',
    avgValue: 'Avg. Value',
    totalValue: 'Total Value',
    recentConversions: 'Recent Conversions',
    searchOrders: 'Search order ID...',
    optional: 'optional',
  },
  fr: {
    title: 'Conversions de Leads',
    linkLead: 'Lier Lead à Commande',
    entryId: 'Entrée Media',
    orderId: 'ID Commande',
    conversionValue: 'Valeur de Conversion',
    linkedAt: 'Lié le',
    actions: 'Actions',
    unlink: 'Délier',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noConversions: 'Aucune conversion trouvée',
    createConversion: 'Lier Lead à Commande',
    save: 'Lier',
    cancel: 'Annuler',
    selectEntry: 'Sélectionner entrée media',
    confirmUnlink: 'Êtes-vous sûr de vouloir délier cette conversion?',
    conversionStats: 'Statistiques de Conversion',
    totalConversions: 'Total Conversions',
    conversionRate: 'Taux de Conversion',
    avgValue: 'Valeur Moyenne',
    totalValue: 'Valeur Totale',
    recentConversions: 'Conversions Récentes',
    searchOrders: 'Rechercher ID commande...',
    optional: 'optionnel',
  },
};

interface ConversionFormData {
  entryId: string;
  orderId: string;
  conversionValue?: number;
}

export default function MediaBuyingConversionsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [conversions, setConversions] = useState<LeadConversion[]>([]);
  const [entries, setEntries] = useState<MediaBuyingEntry[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalLeads: number;
    totalConversions: number;
    conversionRate: number;
    avgConversionValue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ConversionFormData>({
    entryId: '',
    orderId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Get current month date range
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [conversionsData, entriesData, analyticsData] = await Promise.all([
        mediaBuyingService.getConversions(),
        mediaBuyingService.getEntries({ limit: 100 }),
        mediaBuyingService.getConversionAnalytics(startDate, endDate),
      ]);
      
      setConversions(conversionsData);
      setEntries(entriesData.entries);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      entryId: entries[0]?.id || '',
      orderId: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await mediaBuyingService.linkLeadToOrder(formData);
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Error linking lead:', err);
      alert('Error linking lead to order');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (id: string) => {
    if (!confirm(t[language].confirmUnlink)) return;
    
    try {
      await mediaBuyingService.unlinkLeadFromOrder(id);
      loadData();
    } catch (err) {
      console.error('Error unlinking conversion:', err);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = amount ?? 0;
    return `$${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const getEntryLabel = (entry: MediaBuyingEntry) => {
    const date = new Date(entry.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
    return `${date} - ${entry.source?.name || 'Unknown'} - ${formatCurrency(entry.spendUSD)}`;
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          <Button
            onClick={openCreateModal}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t[language].linkLead}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].totalConversions}</p>
                      <p className="text-2xl font-bold mt-2">{analytics.totalConversions}</p>
                    </div>
                    <div className="p-4 rounded-full bg-green-50">
                      <Target className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].conversionRate}</p>
                      <p className="text-2xl font-bold mt-2">
                        {((analytics.conversionRate || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-purple-50">
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].avgValue}</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(analytics.avgConversionValue)}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-blue-50">
                      <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t[language].totalValue}</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(analytics.avgConversionValue * analytics.totalConversions)}
                      </p>
                    </div>
                    <div className="p-4 rounded-full bg-amber-50">
                      <Users className="w-8 h-8 text-amber-600" />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Conversions List */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold">{t[language].recentConversions}</h2>
              </div>
              
              {conversions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Link2 className="w-12 h-12 mb-4 text-gray-300" />
                  <p>{t[language].noConversions}</p>
                  <Button onClick={openCreateModal} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    {t[language].linkLead}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].entryId}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].orderId}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].conversionValue}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].linkedAt}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t[language].actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {conversions.map((conversion) => (
                        <tr key={conversion.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: conversion.entry?.source?.color || '#8B5CF6' }}
                              />
                              <span className="text-sm">
                                {conversion.entry ? getEntryLabel(conversion.entry) : conversion.entryId}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-sm">{conversion.orderId}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {conversion.conversionValue ? formatCurrency(conversion.conversionValue) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(conversion.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlink(conversion.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Unlink className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Create Conversion Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">{t[language].createConversion}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Entry Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].entryId} *
                  </label>
                  <select
                    value={formData.entryId}
                    onChange={(e) => setFormData({ ...formData, entryId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">{t[language].selectEntry}</option>
                    {entries.map(entry => (
                      <option key={entry.id} value={entry.id}>
                        {getEntryLabel(entry)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].orderId} *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={formData.orderId}
                      onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                      placeholder={t[language].searchOrders}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Conversion Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].conversionValue} ({t[language].optional})
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.conversionValue || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        conversionValue: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {t[language].cancel}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !formData.entryId || !formData.orderId}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {saving ? t[language].loading : t[language].save}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}