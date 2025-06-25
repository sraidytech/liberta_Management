'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X, Plus, Trash2, Copy } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  agentCode: string;
}

interface BulkRate {
  agentId: string;
  productName: string;
  confirmationRate: number;
  startDate: string;
  endDate: string;
}

interface BulkCreateModalProps {
  agents: Agent[];
  products: string[];
  onClose: () => void;
  onSave: () => void;
}

export function BulkCreateModal({ agents, products, onClose, onSave }: BulkCreateModalProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Set default dates (current month)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [bulkRates, setBulkRates] = useState<BulkRate[]>([
    {
      agentId: '',
      productName: '',
      confirmationRate: 0,
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    }
  ]);

  const addBulkRate = () => {
    setBulkRates([...bulkRates, {
      agentId: '',
      productName: '',
      confirmationRate: 0,
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    }]);
  };

  const removeBulkRate = (index: number) => {
    setBulkRates(bulkRates.filter((_, i) => i !== index));
  };

  const cloneBulkRate = (index: number) => {
    const rateToClone = { ...bulkRates[index] };
    const newRates = [...bulkRates];
    newRates.splice(index + 1, 0, rateToClone);
    setBulkRates(newRates);
  };

  const updateBulkRate = (index: number, field: keyof BulkRate, value: any) => {
    const updated = [...bulkRates];
    updated[index] = { ...updated[index], [field]: value };
    setBulkRates(updated);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/agents/product-rates/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rates: bulkRates.map(rate => ({
            agentId: rate.agentId,
            productName: rate.productName,
            confirmationRate: rate.confirmationRate,
            startDate: new Date(rate.startDate),
            endDate: new Date(rate.endDate)
          }))
        })
      });
      
      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error bulk creating rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return bulkRates.every(rate => 
      rate.agentId && 
      rate.productName && 
      rate.confirmationRate >= 0 && 
      rate.startDate && 
      rate.endDate
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">
              {language === 'fr' ? 'Création en Lot' : 'Bulk Create Rates'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              {language === 'fr' 
                ? 'Ajoutez plusieurs taux de confirmation en une seule fois'
                : 'Add multiple confirmation rates at once'
              }
            </p>
            <Button
              onClick={addBulkRate}
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Ajouter' : 'Add Row'}
            </Button>
          </div>

          <div className="space-y-4">
            {bulkRates.map((rate, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">
                    {language === 'fr' ? `Taux ${index + 1}` : `Rate ${index + 1}`}
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => cloneBulkRate(index)}
                      variant="outline"
                      size="sm"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      title={language === 'fr' ? 'Cloner cette ligne' : 'Clone this row'}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {bulkRates.length > 1 && (
                      <Button
                        onClick={() => removeBulkRate(index)}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        title={language === 'fr' ? 'Supprimer cette ligne' : 'Delete this row'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Agent Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'fr' ? 'Agent' : 'Agent'}
                    </label>
                    <select
                      value={rate.agentId}
                      onChange={(e) => updateBulkRate(index, 'agentId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.agentCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'fr' ? 'Produit' : 'Product'}
                    </label>
                    <select
                      value={rate.productName}
                      onChange={(e) => updateBulkRate(index, 'productName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                      {products.map((productName) => (
                        <option key={productName} value={productName}>
                          {productName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Confirmation Rate */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'fr' ? 'Taux (%)' : 'Rate (%)'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={rate.confirmationRate}
                      onChange={(e) => updateBulkRate(index, 'confirmationRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                      className="text-sm"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'fr' ? 'Début' : 'Start'}
                    </label>
                    <Input
                      type="date"
                      value={rate.startDate}
                      onChange={(e) => updateBulkRate(index, 'startDate', e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'fr' ? 'Fin' : 'End'}
                    </label>
                    <Input
                      type="date"
                      value={rate.endDate}
                      onChange={(e) => updateBulkRate(index, 'endDate', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6 py-2 rounded-xl"
          >
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !isFormValid()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>
              {loading 
                ? (language === 'fr' ? 'Création...' : 'Creating...') 
                : (language === 'fr' ? `Créer ${bulkRates.length} taux` : `Create ${bulkRates.length} rates`)
              }
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}