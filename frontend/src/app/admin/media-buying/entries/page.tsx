'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  mediaBuyingService,
  MediaBuyingEntry,
  AdSource,
  MediaBuyingMetadata
} from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Media Buying Entries',
    addEntry: 'Add Entry',
    search: 'Search entries...',
    filter: 'Filter',
    date: 'Date',
    source: 'Source',
    spend: 'Spend (USD)',
    spendDZD: 'Spend (DZD)',
    leads: 'Leads',
    cpl: 'CPL',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this entry?',
    loading: 'Loading...',
    error: 'Error loading data',
    noEntries: 'No entries found',
    createEntry: 'Create Entry',
    editEntry: 'Edit Entry',
    save: 'Save',
    cancel: 'Cancel',
    selectSource: 'Select source',
    exchangeRate: 'Exchange Rate',
    notes: 'Notes',
    metadata: 'Additional Metrics',
    impressions: 'Impressions',
    clicks: 'Clicks',
    ctr: 'CTR (%)',
    cpm: 'CPM',
    cpc: 'CPC',
    conversions: 'Conversions',
    campaignName: 'Campaign Name',
    startDate: 'Start Date',
    endDate: 'End Date',
    allSources: 'All Sources',
    export: 'Export',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    entries: 'entries',
    store: 'Store',
    product: 'Product',
    optional: 'optional',
  },
  fr: {
    title: 'Entrées Media Buying',
    addEntry: 'Ajouter Entrée',
    search: 'Rechercher...',
    filter: 'Filtrer',
    date: 'Date',
    source: 'Source',
    spend: 'Dépense (USD)',
    spendDZD: 'Dépense (DZD)',
    leads: 'Leads',
    cpl: 'CPL',
    actions: 'Actions',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer cette entrée?',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noEntries: 'Aucune entrée trouvée',
    createEntry: 'Créer Entrée',
    editEntry: 'Modifier Entrée',
    save: 'Enregistrer',
    cancel: 'Annuler',
    selectSource: 'Sélectionner source',
    exchangeRate: 'Taux de Change',
    notes: 'Notes',
    metadata: 'Métriques Additionnelles',
    impressions: 'Impressions',
    clicks: 'Clics',
    ctr: 'CTR (%)',
    cpm: 'CPM',
    cpc: 'CPC',
    conversions: 'Conversions',
    campaignName: 'Nom de Campagne',
    startDate: 'Date Début',
    endDate: 'Date Fin',
    allSources: 'Toutes Sources',
    export: 'Exporter',
    page: 'Page',
    of: 'sur',
    showing: 'Affichage',
    entries: 'entrées',
    store: 'Boutique',
    product: 'Produit',
    optional: 'optionnel',
  },
};

interface EntryFormData {
  date: string;
  sourceId: string;
  storeId?: string;
  productId?: string;
  spendUSD: number;
  exchangeRate: number;
  totalLeads: number;
  notes?: string;
  metadata?: MediaBuyingMetadata;
}

// Store type for dropdown
interface Store {
  id: string;
  storeName: string;
  storeIdentifier: string;
  isActive: boolean;
}

// Product type for dropdown
interface Product {
  id: string;
  title: string;
  sku?: string;
  orderCount: number;
}

function MediaBuyingEntriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [entries, setEntries] = useState<MediaBuyingEntry[]>([]);
  const [sources, setSources] = useState<AdSource[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MediaBuyingEntry | null>(null);
  const [formData, setFormData] = useState<EntryFormData>({
    date: new Date().toISOString().split('T')[0],
    sourceId: '',
    spendUSD: 0,
    exchangeRate: 140,
    totalLeads: 0,
    notes: '',
    metadata: {},
  });
  const [saving, setSaving] = useState(false);

  // Check for action=new in URL
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateModal();
    }
  }, [searchParams]);

  useEffect(() => {
    loadSources();
    loadStores();
    loadProducts();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [page, selectedSource, startDate, endDate]);

  const loadSources = async () => {
    try {
      const data = await mediaBuyingService.getSources();
      setSources(data);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  };

  const loadStores = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/stores`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const json = await response.json();
        setStores(json.data || []);
      }
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/v1/product-assignments/available-products`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const json = await response.json();
        // Transform the data - available-products returns array of product names (strings)
        const productList = (json.data || []).map((name: string, index: number) => ({
          id: name,
          title: name,
          orderCount: 0,
        }));
        setProducts(productList);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadEntries = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await mediaBuyingService.getEntries({
        page,
        limit,
        sourceId: selectedSource || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      
      setEntries(result.entries);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      sourceId: sources[0]?.id || '',
      spendUSD: 0,
      exchangeRate: 140,
      totalLeads: 0,
      notes: '',
      metadata: {},
    });
    setShowModal(true);
  };

  const openEditModal = (entry: MediaBuyingEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date.split('T')[0],
      sourceId: entry.sourceId,
      storeId: entry.storeId,
      productId: entry.productId,
      spendUSD: entry.spendUSD,
      exchangeRate: entry.exchangeRate,
      totalLeads: entry.totalLeads,
      notes: entry.notes || '',
      metadata: entry.metadata || {},
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (editingEntry) {
        await mediaBuyingService.updateEntry(editingEntry.id, formData);
      } else {
        await mediaBuyingService.createEntry(formData);
      }
      
      setShowModal(false);
      loadEntries();
    } catch (err) {
      console.error('Error saving entry:', err);
      alert('Error saving entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t[language].confirmDelete)) return;
    
    try {
      await mediaBuyingService.deleteEntry(id);
      loadEntries();
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Error deleting entry');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await mediaBuyingService.exportData('csv', {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sourceId: selectedSource || undefined,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-buying-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = amount ?? 0;
    return `$${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getSourceName = (sourceId: string) => {
    return sources.find(s => s.id === sourceId)?.name || sourceId;
  };

  const getSourceColor = (sourceId: string) => {
    return sources.find(s => s.id === sourceId)?.color || '#8B5CF6';
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
  const canDelete = user.role === 'ADMIN';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              {t[language].export}
            </Button>
            <Button
              onClick={openCreateModal}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t[language].addEntry}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t[language].search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={selectedSource}
              onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">{t[language].allSources}</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-40"
              />
              <span className="text-gray-400">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>{t[language].noEntries}</p>
              <Button onClick={openCreateModal} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {t[language].addEntry}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].date}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].source}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].spend}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].spendDZD}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].leads}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].cpl}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t[language].actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(entry.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getSourceColor(entry.sourceId) }}
                            />
                            <span className="text-sm font-medium">{entry.source?.name || getSourceName(entry.sourceId)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(entry.spendUSD || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                          {(entry.spendDZD || 0).toLocaleString()} DZD
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {entry.totalLeads || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                          {entry.costPerLead ? formatCurrency(entry.costPerLead) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(entry)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-500">
                  {t[language].showing} {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} {t[language].of} {total} {t[language].entries}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    {t[language].page} {page} {t[language].of} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingEntry ? t[language].editEntry : t[language].createEntry}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].date} *
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].source} *
                  </label>
                  <select
                    value={formData.sourceId}
                    onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">{t[language].selectSource}</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                </div>

                {/* Store & Product (Optional) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].store} <span className="text-gray-400 text-xs">({t[language].optional})</span>
                    </label>
                    <select
                      value={formData.storeId || ''}
                      onChange={(e) => setFormData({ ...formData, storeId: e.target.value || undefined })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- {language === 'fr' ? 'Sélectionner' : 'Select'} --</option>
                      {stores.filter(s => s.isActive).map(store => (
                        <option key={store.id} value={store.id}>{store.storeName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].product} <span className="text-gray-400 text-xs">({t[language].optional})</span>
                    </label>
                    <select
                      value={formData.productId || ''}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value || undefined })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- {language === 'fr' ? 'Sélectionner' : 'Select'} --</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Spend & Exchange Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].spend} *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.spendUSD}
                        onChange={(e) => setFormData({ ...formData, spendUSD: parseFloat(e.target.value) || 0 })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].exchangeRate} *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.exchangeRate}
                      onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                {/* Calculated DZD */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-600">{t[language].spendDZD}: </span>
                  <span className="font-semibold">
                    {(formData.spendUSD * formData.exchangeRate).toLocaleString()} DZD
                  </span>
                </div>

                {/* Leads */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].leads} *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="number"
                      min="0"
                      value={formData.totalLeads}
                      onChange={(e) => setFormData({ ...formData, totalLeads: parseInt(e.target.value) || 0 })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Calculated CPL */}
                {formData.totalLeads > 0 && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <span className="text-sm text-purple-600">{t[language].cpl}: </span>
                    <span className="font-semibold text-purple-700">
                      {formatCurrency(formData.spendUSD / formData.totalLeads)}
                    </span>
                  </div>
                )}

                {/* Additional Metrics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].metadata} ({t[language].optional})
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t[language].impressions}</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.metadata?.impressions || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, impressions: parseInt(e.target.value) || undefined }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t[language].clicks}</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.metadata?.clicks || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, clicks: parseInt(e.target.value) || undefined }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t[language].conversions}</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.metadata?.conversions || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, conversions: parseInt(e.target.value) || undefined }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].campaignName} ({t[language].optional})
                  </label>
                  <Input
                    value={formData.metadata?.campaignName || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, campaignName: e.target.value || undefined }
                    })}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].notes} ({t[language].optional})
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {t[language].cancel}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !formData.sourceId || !formData.date}
                  className="bg-purple-600 hover:bg-purple-700"
                >
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

// Wrapper component with Suspense for useSearchParams
export default function MediaBuyingEntriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <MediaBuyingEntriesContent />
    </Suspense>
  );
}