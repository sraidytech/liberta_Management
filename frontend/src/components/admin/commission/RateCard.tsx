'use client';

import { useLanguage } from '@/lib/language-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, User, Calendar, Trash2 } from 'lucide-react';

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

interface RateCardProps {
  rate: AgentProductRate;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  loading: boolean;
}

export function RateCard({ rate, isSelected, onToggleSelect, onEdit, onDelete, loading }: RateCardProps) {
  const { language } = useLanguage();

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rate.agent.name}</h3>
                  <p className="text-sm text-gray-500">{rate.agent.agentCode}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 text-sm font-medium rounded-full">
                  {rate.productName}
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium rounded-full">
                  {Math.round(rate.confirmationRate * 100) / 100}% {language === 'fr' ? 'confirmation' : 'confirmation'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 space-x-4">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(rate.startDate).toLocaleDateString()} - {new Date(rate.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{Math.round(rate.confirmationRate * 100) / 100}%</div>
            <div className="text-sm text-gray-500">
              {language === 'fr' ? 'Taux de confirmation' : 'Confirmation rate'}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-blue-50 border-blue-200 text-blue-600"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-red-50 border-red-200 text-red-600"
              onClick={onDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}