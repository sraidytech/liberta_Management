'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaBuyingService, MediaBuyingBudget, AdSource, BudgetStatus } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  Plus, 
  Edit,
  X,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Budget Management',
    addBudget: 'Add Budget',
    month: 'Month',
    year: 'Year',
    source: 'Source',
    budget: 'Budget (USD)',
    budgetDZD: 'Budget (DZD)',
    spent: 'Spent',
    remaining: 'Remaining',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error loading data',
    noBudgets: 'No budgets found',
    createBudget: 'Create Budget',
    editBudget: 'Edit Budget',
    save: 'Save',
    cancel: 'Cancel',
    exchangeRate: 'Exchange Rate',
    alertThreshold: 'Alert Threshold (%)',
    notes: 'Notes',
    allSources: 'All Sources (Global)',
    selectSource: 'Select source (optional)',
    onTrack: 'On Track',
    warning: 'Warning',
    critical: 'Critical',
    overBudget: 'Over Budget',
    budgetUsed: 'used',
    currentMonth: 'Current Month',
    selectMonth: 'Select Month',
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  },
  fr: {
    title: 'Gestion des Budgets',
    addBudget: 'Ajouter Budget',
    month: 'Mois',
    year: 'Année',
    source: 'Source',
    budget: 'Budget (USD)',
    budgetDZD: 'Budget (DZD)',
    spent: 'Dépensé',
    remaining: 'Restant',
    status: 'Statut',
    actions: 'Actions',
    edit: 'Modifier',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noBudgets: 'Aucun budget trouvé',
    createBudget: 'Créer Budget',
    editBudget: 'Modifier Budget',
    save: 'Enregistrer',
    cancel: 'Annuler',
    exchangeRate: 'Taux de Change',
    alertThreshold: 'Seuil d\'Alerte (%)',
    notes: 'Notes',
    allSources: 'Toutes Sources (Global)',
    selectSource: 'Sélectionner source (optionnel)',
    onTrack: 'En Bonne Voie',
    warning: 'Attention',
    critical: 'Critique',
    overBudget: 'Dépassement',
    budgetUsed: 'utilisé',
    currentMonth: 'Mois Actuel',
    selectMonth: 'Sélectionner Mois',
    january: 'Janvier',
    february: 'Février',
    march: 'Mars',
    april: 'Avril',
    may: 'Mai',
    june: 'Juin',
    july: 'Juillet',
    august: 'Août',
    september: 'Septembre',
    october: 'Octobre',
    november: 'Novembre',
    december: 'Décembre',
  },
};

const months = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

interface BudgetFormData {
  month: number;
  year: number;
  sourceId?: string;
  budgetUSD: number;
  exchangeRate: number;
  alertThreshold: number;
  notes?: string;
}

export default function MediaBuyingBudgetsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [budgets, setBudgets] = useState<MediaBuyingBudget[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [sources, setSources] = useState<AdSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<MediaBuyingBudget | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    budgetUSD: 0,
    exchangeRate: 140,
    alertThreshold: 80,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [selectedMonth, selectedYear]);

  const loadSources = async () => {
    try {
      const data = await mediaBuyingService.getSources();
      setSources(data);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  };

  const loadBudgets = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [budgetsData, statusData] = await Promise.all([
        mediaBuyingService.getBudgets({ month: selectedMonth, year: selectedYear }),
        mediaBuyingService.getBudgetStatus(selectedMonth, selectedYear),
      ]);
      
      setBudgets(budgetsData);
      setBudgetStatus(statusData);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormData({
      month: selectedMonth,
      year: selectedYear,
      budgetUSD: 0,
      exchangeRate: 140,
      alertThreshold: 80,
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (budget: MediaBuyingBudget) => {
    setEditingBudget(budget);
    setFormData({
      month: budget.month,
      year: budget.year,
      sourceId: budget.sourceId,
      budgetUSD: budget.budgetUSD,
      exchangeRate: budget.budgetDZD / budget.budgetUSD,
      alertThreshold: budget.alertThreshold,
      notes: budget.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (editingBudget) {
        await mediaBuyingService.updateBudget(editingBudget.id, {
          budgetUSD: formData.budgetUSD,
          exchangeRate: formData.exchangeRate,
          alertThreshold: formData.alertThreshold,
          notes: formData.notes,
        });
      } else {
        await mediaBuyingService.createBudget(formData);
      }
      
      setShowModal(false);
      loadBudgets();
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Error saving budget');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency: 'USD' | 'DZD' = 'USD') => {
    const safeAmount = amount ?? 0;
    if (currency === 'USD') {
      return `$${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${safeAmount.toLocaleString()} DZD`;
  };

  const getStatusColor = (percentageUsed: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'bg-red-500';
    if (percentageUsed >= 90) return 'bg-red-500';
    if (percentageUsed >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStatusLabel = (percentageUsed: number, isOverBudget: boolean) => {
    if (isOverBudget) return t[language].overBudget;
    if (percentageUsed >= 90) return t[language].critical;
    if (percentageUsed >= 75) return t[language].warning;
    return t[language].onTrack;
  };

  const getSourceName = (sourceId?: string) => {
    if (!sourceId) return t[language].allSources;
    return sources.find(s => s.id === sourceId)?.name || sourceId;
  };

  const getMonthName = (month: number) => {
    return t[language][months[month - 1] as keyof typeof t.en];
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
            {t[language].addBudget}
          </Button>
        </div>

        {/* Month/Year Filter */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {t[language][month as keyof typeof t.en]}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Budget Status Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : budgetStatus.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <DollarSign className="w-12 h-12 mb-4 text-gray-300" />
              <p>{t[language].noBudgets}</p>
              <Button onClick={openCreateModal} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {t[language].addBudget}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetStatus.map((status) => {
              const budget = budgets.find(b => b.id === status.budgetId);
              return (
                <Card key={status.budgetId} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {status.sourceName || t[language].allSources}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getMonthName(status.month)} {status.year}
                      </p>
                    </div>
                    {budget && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(budget)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{t[language].budgetUsed}</span>
                      <span className={`text-sm font-semibold ${
                        status.isOverBudget ? 'text-red-600' : 
                        status.percentageUsed >= 75 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {status.percentageUsed.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${getStatusColor(status.percentageUsed, status.isOverBudget)}`}
                        style={{ width: `${Math.min(status.percentageUsed, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t[language].budget}:</span>
                      <span className="font-medium">{formatCurrency(status.budgetUSD)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t[language].spent}:</span>
                      <span className="font-medium">{formatCurrency(status.spentUSD)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t[language].remaining}:</span>
                      <span className={`font-medium ${status.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {status.isOverBudget ? '-' : ''}{formatCurrency(Math.abs(status.remainingUSD))}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4 pt-4 border-t">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      status.isOverBudget ? 'bg-red-100 text-red-800' :
                      status.percentageUsed >= 90 ? 'bg-red-100 text-red-800' :
                      status.percentageUsed >= 75 ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {status.isOverBudget && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {!status.isOverBudget && status.percentageUsed < 75 && <TrendingUp className="w-3 h-3 mr-1" />}
                      {getStatusLabel(status.percentageUsed, status.isOverBudget)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingBudget ? t[language].editBudget : t[language].createBudget}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Month & Year */}
                {!editingBudget && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t[language].month} *
                      </label>
                      <select
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        {months.map((month, index) => (
                          <option key={month} value={index + 1}>
                            {t[language][month as keyof typeof t.en]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t[language].year} *
                      </label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        {[2024, 2025, 2026].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Source */}
                {!editingBudget && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].source}
                    </label>
                    <select
                      value={formData.sourceId || ''}
                      onChange={(e) => setFormData({ ...formData, sourceId: e.target.value || undefined })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">{t[language].allSources}</option>
                      {sources.map(source => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Budget & Exchange Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].budget} *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.budgetUSD}
                        onChange={(e) => setFormData({ ...formData, budgetUSD: parseFloat(e.target.value) || 0 })}
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
                  <span className="text-sm text-gray-600">{t[language].budgetDZD}: </span>
                  <span className="font-semibold">
                    {(formData.budgetUSD * formData.exchangeRate).toLocaleString()} DZD
                  </span>
                </div>

                {/* Alert Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].alertThreshold}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) || 80 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert when budget usage exceeds this percentage
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].notes}
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
                  disabled={saving || formData.budgetUSD <= 0}
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