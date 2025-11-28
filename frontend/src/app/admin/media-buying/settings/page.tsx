'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaBuyingService, ExchangeRate } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  Plus, 
  X,
  DollarSign,
  RefreshCw,
  Calendar,
  TrendingUp
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Settings',
    exchangeRates: 'Exchange Rates',
    addRate: 'Add Rate',
    currentRate: 'Current Rate',
    rateHistory: 'Rate History',
    fromCurrency: 'From Currency',
    toCurrency: 'To Currency',
    rate: 'Rate',
    effectiveDate: 'Effective Date',
    loading: 'Loading...',
    error: 'Error loading data',
    noRates: 'No exchange rates found',
    createRate: 'Create Exchange Rate',
    save: 'Save',
    cancel: 'Cancel',
    usdToDzd: 'USD to DZD',
    latestRate: 'Latest Rate',
    setNewRate: 'Set New Rate',
    rateUpdated: 'Rate updated successfully',
    quickSet: 'Quick Set',
  },
  fr: {
    title: 'Paramètres',
    exchangeRates: 'Taux de Change',
    addRate: 'Ajouter Taux',
    currentRate: 'Taux Actuel',
    rateHistory: 'Historique des Taux',
    fromCurrency: 'Devise Source',
    toCurrency: 'Devise Cible',
    rate: 'Taux',
    effectiveDate: 'Date d\'Effet',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noRates: 'Aucun taux de change trouvé',
    createRate: 'Créer Taux de Change',
    save: 'Enregistrer',
    cancel: 'Annuler',
    usdToDzd: 'USD vers DZD',
    latestRate: 'Dernier Taux',
    setNewRate: 'Définir Nouveau Taux',
    rateUpdated: 'Taux mis à jour avec succès',
    quickSet: 'Définition Rapide',
  },
};

interface RateFormData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
}

export default function MediaBuyingSettingsPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [latestRate, setLatestRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Quick set rate
  const [quickRate, setQuickRate] = useState<number>(140);
  const [savingQuickRate, setSavingQuickRate] = useState(false);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<RateFormData>({
    fromCurrency: 'USD',
    toCurrency: 'DZD',
    rate: 140,
    effectiveDate: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [ratesData, latestRateData] = await Promise.all([
        mediaBuyingService.getExchangeRates(),
        mediaBuyingService.getLatestExchangeRate('USD', 'DZD'),
      ]);
      
      setRates(ratesData);
      setLatestRate(latestRateData);
      if (latestRateData) {
        setQuickRate(latestRateData.rate);
      }
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      fromCurrency: 'USD',
      toCurrency: 'DZD',
      rate: latestRate?.rate || 140,
      effectiveDate: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await mediaBuyingService.createExchangeRate(formData);
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving rate:', err);
      alert('Error saving rate');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSave = async () => {
    try {
      setSavingQuickRate(true);
      await mediaBuyingService.createExchangeRate({
        fromCurrency: 'USD',
        toCurrency: 'DZD',
        rate: quickRate,
        effectiveDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (err) {
      console.error('Error saving quick rate:', err);
      alert('Error saving rate');
    } finally {
      setSavingQuickRate(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Rate Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  {t[language].currentRate}
                </h2>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 mb-6">
                <p className="text-sm text-purple-600 mb-2">{t[language].usdToDzd}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-purple-700">
                    {latestRate?.rate.toFixed(2) || '---'}
                  </span>
                  <span className="text-lg text-purple-600">DZD</span>
                </div>
                {latestRate && (
                  <p className="text-sm text-purple-500 mt-2">
                    {t[language].effectiveDate}: {formatDate(latestRate.effectiveDate)}
                  </p>
                )}
              </div>

              {/* Quick Set */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">{t[language].quickSet}</h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">1 USD =</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quickRate}
                      onChange={(e) => setQuickRate(parseFloat(e.target.value) || 0)}
                      className="pl-20 pr-16"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">DZD</span>
                  </div>
                  <Button 
                    onClick={handleQuickSave}
                    disabled={savingQuickRate || quickRate <= 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {savingQuickRate ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      t[language].save
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Rate History */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  {t[language].rateHistory}
                </h2>
                <Button onClick={openCreateModal} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  {t[language].addRate}
                </Button>
              </div>

              {rates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <DollarSign className="w-12 h-12 mb-4 text-gray-300" />
                  <p>{t[language].noRates}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {rates.slice(0, 10).map((rate, index) => (
                    <div 
                      key={rate.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-purple-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="font-medium">
                            1 {rate.fromCurrency} = {rate.rate.toFixed(2)} {rate.toCurrency}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(rate.effectiveDate)}
                          </p>
                        </div>
                      </div>
                      {index === 0 && (
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {t[language].latestRate}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Create Rate Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">{t[language].createRate}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Currencies */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].fromCurrency}
                    </label>
                    <select
                      value={formData.fromCurrency}
                      onChange={(e) => setFormData({ ...formData, fromCurrency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t[language].toCurrency}
                    </label>
                    <select
                      value={formData.toCurrency}
                      onChange={(e) => setFormData({ ...formData, toCurrency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="DZD">DZD</option>
                    </select>
                  </div>
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].rate} *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1 {formData.fromCurrency} = {formData.rate} {formData.toCurrency}
                  </p>
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].effectiveDate} *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                      className="pl-10"
                      required
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
                  disabled={saving || formData.rate <= 0}
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