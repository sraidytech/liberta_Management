'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Save, RotateCcw, Settings } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';

interface CommissionSettings {
  baseCommission: number;
  tier78Bonus: number;
  tier80Bonus: number;
  tier82Bonus: number;
  upsellBonus: number;
  upsellMinPercent: number;
  pack2Bonus: number;
  pack2MinPercent: number;
  pack4Bonus: number;
  pack4MinPercent: number;
}

const defaultSettings: CommissionSettings = {
  baseCommission: 5000,
  tier78Bonus: 4000,
  tier80Bonus: 4500,
  tier82Bonus: 5000,
  upsellBonus: 1000,
  upsellMinPercent: 30,
  pack2Bonus: 500,
  pack2MinPercent: 50,
  pack4Bonus: 600,
  pack4MinPercent: 25
};

export default function CommissionSettingsPage() {
  const { language } = useLanguage();
  const t = createTranslator(language);
  const { showToast } = useToast();
  
  const [settings, setSettings] = useState<CommissionSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<CommissionSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/commissions/default-settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setOriginalSettings(data.data);
      } else {
        showToast({ type: 'error', title: t('failedToUpdateCommissionSettings') });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast({ type: 'error', title: t('errorFetchingCommissionSettings') });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/v1/commissions/default-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const data = await response.json();
        setOriginalSettings(data.data);
        showToast({ type: 'success', title: t('commissionSettingsUpdatedSuccessfully') });
      } else {
        const errorData = await response.json();
        showToast({ type: 'error', title: errorData.message || t('failedToUpdateCommissionSettings') });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast({ type: 'error', title: t('errorFetchingCommissionSettings') });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    showToast({ type: 'info', title: t('settingsResetToLastSavedValues') });
  };

  const handleInputChange = (field: keyof CommissionSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSettings(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {t('commissionSettings')}
              </h1>
              <p className="text-gray-600 mt-1">{t('configureDefaultCommissionValues')}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {hasChanges && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t('reset')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Save className="h-4 w-4" />
              {saving ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Base Commission */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                💰 {t('baseCommission')}
              </CardTitle>
              <p className="text-sm text-gray-600">{t('commissionForReaching1500Orders')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="baseCommission" className="text-sm font-medium text-gray-700">
                  {t('baseCommissionDA')}
                </Label>
                <Input
                  id="baseCommission"
                  type="number"
                  value={settings.baseCommission}
                  onChange={(e) => handleInputChange('baseCommission', e.target.value)}
                  className="mt-1"
                  min="0"
                  step="100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Rate Tiers */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                📊 {t('confirmationRateBonuses')}
              </CardTitle>
              <p className="text-sm text-gray-600">{t('additionalBonusesBasedOnConfirmationRates')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tier78Bonus" className="text-sm font-medium text-gray-700">
                  {t('rate78Bonus')}
                </Label>
                <Input
                  id="tier78Bonus"
                  type="number"
                  value={settings.tier78Bonus}
                  onChange={(e) => handleInputChange('tier78Bonus', e.target.value)}
                  className="mt-1"
                  min="0"
                  step="100"
                />
              </div>
              <div>
                <Label htmlFor="tier80Bonus" className="text-sm font-medium text-gray-700">
                  {t('rate80Bonus')}
                </Label>
                <Input
                  id="tier80Bonus"
                  type="number"
                  value={settings.tier80Bonus}
                  onChange={(e) => handleInputChange('tier80Bonus', e.target.value)}
                  className="mt-1"
                  min="0"
                  step="100"
                />
              </div>
              <div>
                <Label htmlFor="tier82Bonus" className="text-sm font-medium text-gray-700">
                  {t('rate82Bonus')}
                </Label>
                <Input
                  id="tier82Bonus"
                  type="number"
                  value={settings.tier82Bonus}
                  onChange={(e) => handleInputChange('tier82Bonus', e.target.value)}
                  className="mt-1"
                  min="0"
                  step="100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upsell Bonus */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                🚀 {t('upsellBonus')}
              </CardTitle>
              <p className="text-sm text-gray-600">{t('bonusForAchievingUpsellTargets')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="upsellBonus" className="text-sm font-medium text-gray-700">
                  {t('upsellBonusDA')}
                </Label>
                <Input
                  id="upsellBonus"
                  type="number"
                  value={settings.upsellBonus}
                  onChange={(e) => handleInputChange('upsellBonus', e.target.value)}
                  className="mt-1"
                  min="0"
                  step="100"
                />
              </div>
              <div>
                <Label htmlFor="upsellMinPercent" className="text-sm font-medium text-gray-700">
                  {t('minimumUpsellRate')}
                </Label>
                <Input
                  id="upsellMinPercent"
                  type="number"
                  value={settings.upsellMinPercent}
                  onChange={(e) => handleInputChange('upsellMinPercent', e.target.value)}
                  className="mt-1"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pack Bonuses */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                📦 {t('packBonuses')}
              </CardTitle>
              <p className="text-sm text-gray-600">{t('bonusesForPackQuantityAchievements')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pack2Bonus" className="text-sm font-medium text-gray-700">
                    {t('pack2BonusDA')}
                  </Label>
                  <Input
                    id="pack2Bonus"
                    type="number"
                    value={settings.pack2Bonus}
                    onChange={(e) => handleInputChange('pack2Bonus', e.target.value)}
                    className="mt-1"
                    min="0"
                    step="50"
                  />
                </div>
                <div>
                  <Label htmlFor="pack2MinPercent" className="text-sm font-medium text-gray-700">
                    {t('minRate')}
                  </Label>
                  <Input
                    id="pack2MinPercent"
                    type="number"
                    value={settings.pack2MinPercent}
                    onChange={(e) => handleInputChange('pack2MinPercent', e.target.value)}
                    className="mt-1"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pack4Bonus" className="text-sm font-medium text-gray-700">
                    {t('pack4BonusDA')}
                  </Label>
                  <Input
                    id="pack4Bonus"
                    type="number"
                    value={settings.pack4Bonus}
                    onChange={(e) => handleInputChange('pack4Bonus', e.target.value)}
                    className="mt-1"
                    min="0"
                    step="50"
                  />
                </div>
                <div>
                  <Label htmlFor="pack4MinPercent" className="text-sm font-medium text-gray-700">
                    {t('minRate')}
                  </Label>
                  <Input
                    id="pack4MinPercent"
                    type="number"
                    value={settings.pack4MinPercent}
                    onChange={(e) => handleInputChange('pack4MinPercent', e.target.value)}
                    className="mt-1"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        {hasChanges && (
          <Card className="mt-6 border-0 shadow-xl bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Settings className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">{t('unsavedChanges')}</h3>
                  <p className="text-sm text-amber-700">{t('youHaveUnsavedChanges')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}