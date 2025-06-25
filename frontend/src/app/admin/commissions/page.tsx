'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  Download, 
  Settings,
  Users
} from 'lucide-react';
import CommissionCalculator from '@/components/admin/commission/CommissionCalculator';
import ProductCommissionManager from '@/components/admin/commission/ProductCommissionManager';
import AgentRateManager from '@/components/admin/commission/AgentRateManager';

export default function CommissionManagementPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'calculator' | 'products' | 'rates'>('calculator');

  const exportReport = async () => {
    // This will be handled by the calculator component
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'fr' ? 'Gestion des Commissions' : 'Commission Management'}
            </h1>
            <p className="text-gray-600 mt-1">
              {language === 'fr' 
                ? 'Calculez et gérez les commissions des agents Suivi' 
                : 'Calculate and manage Suivi agent commissions'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calculator'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calculator className="w-4 h-4 inline mr-2" />
              {language === 'fr' ? 'Calculateur' : 'Calculator'}
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              {language === 'fr' ? 'Produits' : 'Products'}
            </button>
            <button
              onClick={() => setActiveTab('rates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              {language === 'fr' ? 'Taux Agents' : 'Agent Rates'}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'calculator' && <CommissionCalculator />}
        {activeTab === 'products' && <ProductCommissionManager />}
        {activeTab === 'rates' && <AgentRateManager />}
      </div>
    </AdminLayout>
  );
}