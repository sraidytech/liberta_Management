'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';

interface ProductMetrics {
  totalOrders: number;
  pack2Percent: number;
  pack4Percent: number;
  upsellPercent: number;
}

interface CommissionBreakdown {
  product: string;
  total: number;
  details: {
    baseCommission?: number;
    tier78?: number;
    tier80?: number;
    tier82?: number;
    upsellBonus?: number;
    pack2Bonus?: number;
    pack4Bonus?: number;
    [key: string]: number | undefined;
  };
  metrics: ProductMetrics;
}

interface AgentCommissionSummary {
  totalCommission: number;
  breakdown: CommissionBreakdown[];
  agentInfo: {
    id: string;
    name: string;
    agentCode: string;
    confirmationRate: number;
    totalOrders: number;
  };
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
}

export default function CommissionCalculator() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [commissionSummary, setCommissionSummary] = useState<AgentCommissionSummary[]>([]);
  const [calculatorPeriod, setCalculatorPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [thresholdMode, setThresholdMode] = useState<'product' | 'total'>('product');

  const toggleAgentExpansion = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  useEffect(() => {
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const calculateCommissions = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/summary?startDate=${startDate}&endDate=${endDate}&period=${calculatorPeriod}&thresholdMode=${thresholdMode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommissionSummary(data.data || []);
      }
    } catch (error) {
      console.error('Error calculating commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/export?startDate=${startDate}&endDate=${endDate}&period=${calculatorPeriod}&thresholdMode=${thresholdMode}&format=csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commission-report-${startDate}-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calculator Controls */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {language === 'fr' ? 'Paramètres de Calcul' : 'Calculation Settings'}
          </h3>
          <Button onClick={exportReport} variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>{language === 'fr' ? 'Exporter' : 'Export'}</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'fr' ? 'Période' : 'Period'}
            </label>
            <select
              value={calculatorPeriod}
              onChange={(e) => setCalculatorPeriod(e.target.value as 'weekly' | 'monthly')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">{language === 'fr' ? 'Hebdomadaire' : 'Weekly'}</option>
              <option value="monthly">{language === 'fr' ? 'Mensuel' : 'Monthly'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'fr' ? 'Mode de Seuil' : 'Threshold Mode'}
            </label>
            <select
              value={thresholdMode}
              onChange={(e) => setThresholdMode(e.target.value as 'product' | 'total')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="product">{language === 'fr' ? 'Par Produit (1500+)' : 'Per Product (1500+)'}</option>
              <option value="total">{language === 'fr' ? 'Total Commandes (1500+)' : 'Total Orders (1500+)'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'fr' ? 'Date de début' : 'Start Date'}
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'fr' ? 'Date de fin' : 'End Date'}
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={calculateCommissions} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Calculating...' : (language === 'fr' ? 'Calculer' : 'Calculate')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Commission Results */}
      {commissionSummary.length > 0 && (
        <div className="space-y-6">
          {commissionSummary.map((agent) => (
            <div key={agent.agentInfo.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Agent Summary Row */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-all duration-200"
                onClick={() => toggleAgentExpansion(agent.agentInfo.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-sm">
                        {agent.agentInfo.agentCode}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{agent.agentInfo.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {agent.agentInfo.totalOrders.toLocaleString()} {language === 'fr' ? 'commandes' : 'orders'} •
                        <span className="font-medium text-blue-600 ml-1">
                          {agent.agentInfo.confirmationRate}% {language === 'fr' ? 'confirmation' : 'confirmation'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {agent.totalCommission.toLocaleString()} DA
                    </div>
                    <div className="text-sm text-gray-400 mt-1 flex items-center justify-end">
                      <span className="mr-2">{language === 'fr' ? 'Détails' : 'Details'}</span>
                      <div className={`transform transition-transform duration-200 ${expandedAgents.has(agent.agentInfo.id) ? 'rotate-90' : ''}`}>
                        ▶
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {expandedAgents.has(agent.agentInfo.id) && (
                <div className="px-6 pb-6 bg-gray-50/30">
                  <div className="space-y-4">
                    {agent.breakdown.map((product, index) => (
                      <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h6 className="font-bold text-gray-900 text-lg">{product.product}</h6>
                            <p className="text-sm text-gray-500 mt-1">
                              {product.metrics.totalOrders.toLocaleString()} {language === 'fr' ? 'commandes' : 'orders'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-600">
                              {product.total.toLocaleString()} DA
                            </div>
                          </div>
                        </div>

                        {/* Commission Details - Modern Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {product.details.baseCommission && (
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                                {language === 'fr' ? 'Base' : 'Base'}
                              </div>
                              <div className="text-lg font-bold text-blue-900">
                                {product.details.baseCommission.toLocaleString()} DA
                              </div>
                            </div>
                          )}
                          
                          {product.details.tier78 && (
                            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                              <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">
                                78%+ Tier
                              </div>
                              <div className="text-lg font-bold text-yellow-900">
                                {product.details.tier78.toLocaleString()} DA
                              </div>
                            </div>
                          )}
                          
                          {product.details.tier80 && (
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                              <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                                80%+ Tier
                              </div>
                              <div className="text-lg font-bold text-orange-900">
                                {product.details.tier80.toLocaleString()} DA
                              </div>
                            </div>
                          )}
                          
                          {product.details.tier82 && (
                            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                              <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                                82%+ Tier
                              </div>
                              <div className="text-lg font-bold text-red-900">
                                {product.details.tier82.toLocaleString()} DA
                              </div>
                            </div>
                          )}
                          
                          {product.details.upsellBonus && (
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                              <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                                Upsell
                              </div>
                              <div className="text-lg font-bold text-purple-900">
                                {product.details.upsellBonus.toLocaleString()} DA
                              </div>
                              <div className="text-xs text-purple-600 font-medium mt-1">
                                {product.metrics.upsellPercent.toFixed(1)}%
                              </div>
                            </div>
                          )}
                          
                          {product.details.pack2Bonus && (
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                              <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                                Pack 2
                              </div>
                              <div className="text-lg font-bold text-green-900">
                                {product.details.pack2Bonus.toLocaleString()} DA
                              </div>
                              <div className="text-xs text-green-600 font-medium mt-1">
                                {product.metrics.pack2Percent.toFixed(1)}%
                              </div>
                            </div>
                          )}
                          
                          {product.details.pack4Bonus && (
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                                Pack 4
                              </div>
                              <div className="text-lg font-bold text-indigo-900">
                                {product.details.pack4Bonus.toLocaleString()} DA
                              </div>
                              <div className="text-xs text-indigo-600 font-medium mt-1">
                                {product.metrics.pack4Percent.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {commissionSummary.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            {language === 'fr' ? 'Résumé Général' : 'Overall Summary'}
          </h3>
          
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
                    {language === 'fr' ? 'Agents Éligibles' : 'Eligible Agents'}
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {commissionSummary.filter(a => a.totalCommission > 0).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">
                    {language === 'fr' ? 'Commission Totale' : 'Total Commission'}
                  </p>
                  <p className="text-3xl font-bold text-emerald-900">
                    {commissionSummary.reduce((sum, agent) => sum + agent.totalCommission, 0).toLocaleString()} DA
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2">
                    {language === 'fr' ? 'Commission Moyenne' : 'Average Commission'}
                  </p>
                  <p className="text-3xl font-bold text-purple-900">
                    {commissionSummary.length > 0
                      ? Math.round(commissionSummary.reduce((sum, agent) => sum + agent.totalCommission, 0) / commissionSummary.length).toLocaleString()
                      : 0
                    } DA
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-2">
                    {language === 'fr' ? 'Total Commandes' : 'Total Orders'}
                  </p>
                  <p className="text-3xl font-bold text-orange-900">
                    {commissionSummary.reduce((sum, agent) => sum + agent.agentInfo.totalOrders, 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📦</span>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Breakdown by Type */}
          <div className="border-t border-gray-200 pt-8">
            <h4 className="text-xl font-bold text-gray-900 mb-6">
              {language === 'fr' ? 'Répartition des Commissions' : 'Commission Breakdown by Type'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {(() => {
                const totals = {
                  baseCommission: 0,
                  tier78: 0,
                  tier80: 0,
                  tier82: 0,
                  upsellBonus: 0,
                  pack2Bonus: 0,
                  pack4Bonus: 0
                };

                commissionSummary.forEach(agent => {
                  agent.breakdown.forEach(product => {
                    Object.keys(totals).forEach(key => {
                      if (product.details[key]) {
                        totals[key as keyof typeof totals] += product.details[key] || 0;
                      }
                    });
                  });
                });

                return Object.entries(totals).map(([key, value]) => {
                  if (value === 0) return null;
                  
                  const labels = {
                    baseCommission: language === 'fr' ? 'Base' : 'Base',
                    tier78: '78%+',
                    tier80: '80%+',
                    tier82: '82%+',
                    upsellBonus: language === 'fr' ? 'Upsell' : 'Upsell',
                    pack2Bonus: 'Pack 2',
                    pack4Bonus: 'Pack 4'
                  };

                  const colors = {
                    baseCommission: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800',
                    tier78: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800',
                    tier80: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-800',
                    tier82: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-800',
                    upsellBonus: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-800',
                    pack2Bonus: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800',
                    pack4Bonus: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-800'
                  };

                  return (
                    <div key={key} className={`p-4 rounded-xl border ${colors[key as keyof typeof colors]}`}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2">
                        {labels[key as keyof typeof labels]}
                      </div>
                      <div className="text-lg font-bold">
                        {value.toLocaleString()} DA
                      </div>
                    </div>
                  );
                }).filter(Boolean);
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}