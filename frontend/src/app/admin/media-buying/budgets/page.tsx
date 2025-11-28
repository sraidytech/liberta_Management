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
  TrendingUp,
  Wallet,
  CreditCard,
  PieChart,
  ArrowRight
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Budget Management',
    subtitle: 'Control your ad spend and monitor budget limits',
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
    loading: 'Loading budgets...',
    error: 'Error loading data',
    noBudgets: 'No budgets found',
    createBudget: 'Set New Budget',
    editBudget: 'Adjust Budget',
    save: 'Save Budget',
    cancel: 'Cancel',
    exchangeRate: 'Exchange Rate',
    alertThreshold: 'Alert Threshold (%)',
    notes: 'Notes',
    allSources: 'Global Budget (All Sources)',
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
    totalBudget: 'Total Budget',
    totalSpent: 'Total Spent',
    utilization: 'Utilization',
  },
  fr: {
    title: 'Gestion des Budgets',
    subtitle: 'Contrôlez vos dépenses publicitaires et surveillez les limites',
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
    loading: 'Chargement des budgets...',
    error: 'Erreur de chargement',
    noBudgets: 'Aucun budget trouvé',
    createBudget: 'Définir Nouveau Budget',
    editBudget: 'Ajuster Budget',
    save: 'Enregistrer Budget',
    cancel: 'Annuler',
    exchangeRate: 'Taux de Change',
    alertThreshold: 'Seuil d\'Alerte (%)',
    notes: 'Notes',
    allSources: 'Budget Global (Toutes Sources)',
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
    totalBudget: 'Budget Total',
    totalSpent: 'Total Dépensé',
    utilization: 'Utilisation',
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
    if (isOverBudget) return 'bg-gradient-to-r from-red-500 to-red-600';
    if (percentageUsed >= 90) return 'bg-gradient-to-r from-orange-500 to-red-500';
    if (percentageUsed >= 75) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    return 'bg-gradient-to-r from-green-400 to-emerald-500';
  };

  const getStatusLabel = (percentageUsed: number, isOverBudget: boolean) => {
    if (isOverBudget) return t[language].overBudget;
    if (percentageUsed >= 90) return t[language].critical;
    if (percentageUsed >= 75) return t[language].warning;
    return t[language].onTrack;
  };

  const getMonthName = (month: number) => {
    return t[language][months[month - 1] as keyof typeof t.en];
  };

  // Calculate totals
  const totalBudget = budgetStatus.reduce((sum, b) => sum + b.budgetUSD, 0);
  const totalSpent = budgetStatus.reduce((sum, b) => sum + b.spentUSD, 0);
  const totalUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-8 w-full pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{t[language].title}</h1>
            <p className="text-gray-500 mt-2 text-lg">{t[language].subtitle}</p>
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 rounded-xl px-6 py-6 h-auto text-base transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t[language].addBudget}
          </Button>
        </div>

        {/* Month/Year Filter & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-white/70 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t[language].selectMonth}</h3>
            </div>
            <div className="flex gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 px-4 py-3 bg-white border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
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
                className="w-32 px-4 py-3 bg-white border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </Card>

          <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-xl shadow-purple-200 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
              <div className="flex-1">
                <p className="text-purple-100 font-medium mb-1">{t[language].totalBudget}</p>
                <h2 className="text-4xl font-bold mb-4">{formatCurrency(totalBudget)}</h2>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-purple-200 text-sm">{t[language].totalSpent}</p>
                    <p className="text-xl font-semibold">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-sm">{t[language].remaining}</p>
                    <p className="text-xl font-semibold">{formatCurrency(totalBudget - totalSpent)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full max-w-xs">
                <div className="flex justify-between text-sm mb-2 font-medium">
                  <span>{t[language].utilization}</span>
                  <span>{totalUtilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-4 backdrop-blur-sm overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${totalUtilization > 100 ? 'bg-red-400' : 'bg-white'}`}
                    style={{ width: `${Math.min(totalUtilization, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-purple-200 mt-2 text-center">
                  {totalUtilization > 100 ? 'Budget Exceeded' : 'Within Budget'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Budget Status Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500 bg-red-50 rounded-2xl">
            {error}
          </div>
        ) : budgetStatus.length === 0 ? (
          <Card className="p-16 bg-white/50 backdrop-blur-sm border-dashed border-2 border-gray-200 shadow-none">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Wallet className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t[language].noBudgets}</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                No budgets defined for this month. Set up a budget to start tracking your spending.
              </p>
              <Button onClick={openCreateModal} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Plus className="w-4 h-4 mr-2" />
                {t[language].addBudget}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetStatus.map((status) => {
              const budget = budgets.find(b => b.id === status.budgetId);
              const source = sources.find(s => s.name === status.sourceName);

              return (
                <div
                  key={status.budgetId}
                  className="group relative bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                        style={{ backgroundColor: source?.color || '#8B5CF6' }}
                      >
                        {status.sourceName ? status.sourceName.charAt(0) : <Wallet className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">
                          {status.sourceName || t[language].allSources}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                          {getMonthName(status.month)} {status.year}
                        </p>
                      </div>
                    </div>
                    {budget && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditModal(budget)}
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${status.isOverBudget ? 'bg-red-100 text-red-700' :
                        status.percentageUsed >= 90 ? 'bg-orange-100 text-orange-700' :
                          status.percentageUsed >= 75 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                        {getStatusLabel(status.percentageUsed, status.isOverBudget)}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {status.percentageUsed.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getStatusColor(status.percentageUsed, status.isOverBudget)}`}
                        style={{ width: `${Math.min(status.percentageUsed, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget Details Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-auto bg-gray-50/50 rounded-2xl p-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t[language].budget}</p>
                      <p className="font-bold text-gray-900">{formatCurrency(status.budgetUSD)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t[language].spent}</p>
                      <p className="font-bold text-gray-900">{formatCurrency(status.spentUSD)}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">{t[language].remaining}</p>
                        <p className={`font-bold ${status.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                          {status.isOverBudget ? '-' : ''}{formatCurrency(Math.abs(status.remainingUSD))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBudget ? t[language].editBudget : t[language].createBudget}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full hover:bg-gray-200/50">
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </div>

              <div className="p-8 space-y-6">
                {/* Month & Year */}
                {!editingBudget && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">
                        {t[language].month} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                        className="w-full h-12 px-4 border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500 bg-white"
                      >
                        {months.map((month, index) => (
                          <option key={month} value={index + 1}>
                            {t[language][month as keyof typeof t.en]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">
                        {t[language].year} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full h-12 px-4 border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500 bg-white"
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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">
                      {t[language].source}
                    </label>
                    <select
                      value={formData.sourceId || ''}
                      onChange={(e) => setFormData({ ...formData, sourceId: e.target.value || undefined })}
                      className="w-full h-12 px-4 border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                      <option value="">{t[language].allSources}</option>
                      {sources.map(source => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Budget & Exchange Rate */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">
                      {t[language].budget} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.budgetUSD}
                        onChange={(e) => setFormData({ ...formData, budgetUSD: parseFloat(e.target.value) || 0 })}
                        className="h-12 pl-10 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">
                      {t[language].exchangeRate} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.exchangeRate}
                      onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 0 })}
                      className="h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* Calculated DZD */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-700">{t[language].budgetDZD}</span>
                  <span className="font-bold text-purple-900 text-lg">
                    {(formData.budgetUSD * formData.exchangeRate).toLocaleString()} DZD
                  </span>
                </div>

                {/* Alert Threshold */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-semibold text-gray-700 ml-1">
                      {t[language].alertThreshold}
                    </label>
                    <span className="text-sm font-bold text-purple-600">{formData.alertThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You will be notified when spending reaches this percentage.
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    {t[language].notes}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-8 py-6 border-t border-gray-100 bg-gray-50/50">
                <Button variant="outline" onClick={() => setShowModal(false)} className="h-12 px-6 rounded-xl border-gray-200">
                  {t[language].cancel}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || formData.budgetUSD <= 0}
                  className="bg-purple-600 hover:bg-purple-700 h-12 px-8 rounded-xl shadow-lg shadow-purple-200"
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