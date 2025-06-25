'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X } from 'lucide-react';

interface AgentProductRate {
  id: string;
  agentId: string;
  productName: string;
  confirmationRate: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  agent: {
    name: string;
    agentCode: string;
  };
}

interface EditRateModalProps {
  rate: AgentProductRate;
  onClose: () => void;
  onSave: () => void;
}

export function EditRateModal({ rate, onClose, onSave }: EditRateModalProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    confirmationRate: rate.confirmationRate,
    startDate: rate.startDate.split('T')[0],
    endDate: rate.endDate.split('T')[0]
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/agents/product-rates/${rate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          confirmationRate: formData.confirmationRate,
          startDate: formData.startDate,
          endDate: formData.endDate
        })
      });
      
      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error updating product rate:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">
              {language === 'fr' ? 'Modifier le Taux' : 'Edit Rate'}
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
          {/* Agent (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {language === 'fr' ? 'Agent' : 'Agent'}
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
              {rate.agent.name} ({rate.agent.agentCode})
            </div>
          </div>

          {/* Product (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {language === 'fr' ? 'Produit' : 'Product'}
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
              {rate.productName}
            </div>
          </div>

          {/* Confirmation Rate */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {language === 'fr' ? 'Taux de Confirmation (%)' : 'Confirmation Rate (%)'}
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.confirmationRate}
              onChange={(e) => setFormData({...formData, confirmationRate: parseFloat(e.target.value) || 0})}
              placeholder="0.0"
              className="px-4 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {language === 'fr' ? 'Date de début' : 'Start Date'}
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="px-4 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {language === 'fr' ? 'Date de fin' : 'End Date'}
              </label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="px-4 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>{loading ? (language === 'fr' ? 'Mise à jour...' : 'Updating...') : (language === 'fr' ? 'Mettre à jour' : 'Update')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}