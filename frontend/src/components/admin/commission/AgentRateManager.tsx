'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Package, Calendar, Trash2, Upload, CheckSquare, Square } from 'lucide-react';
import { RateCard } from './RateCard';
import { AddRateModal } from './AddRateModal';
import { EditRateModal } from './EditRateModal';
import { BulkCreateModal } from './BulkCreateModal';

interface Agent {
  id: string;
  name: string;
  agentCode: string;
  role: string;
  isActive: boolean;
}

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

interface Product {
  productName: string;
  packQuantity: number;
  originalTitle: string;
  sku: string;
}

export default function AgentRateManager() {
  const { language } = useLanguage();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentProductRates, setAgentProductRates] = useState<AgentProductRate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddProductRate, setShowAddProductRate] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [editingRate, setEditingRate] = useState<AgentProductRate | null>(null);
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadAgents(),
      loadProducts(),
      loadAgentProductRates()
    ]);
  };

  const loadAgents = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/users?role=AGENT_SUIVI`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.data || []);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/products/from-orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data?.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAgentProductRates = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/agents/product-rates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgentProductRates(data.data || []);
      }
    } catch (error) {
      console.error('Error loading agent product rates:', error);
    }
  };

  const deleteProductRate = async (id: string) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/agents/product-rates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await loadAgentProductRates();
      }
    } catch (error) {
      console.error('Error deleting product rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const bulkDeleteRates = async () => {
    if (selectedRates.size === 0) return;
    
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/agents/product-rates/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ids: Array.from(selectedRates)
        })
      });
      
      if (response.ok) {
        await loadAgentProductRates();
        setSelectedRates(new Set());
      }
    } catch (error) {
      console.error('Error bulk deleting rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRateSelection = (id: string) => {
    const newSelected = new Set(selectedRates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRates(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRates.size === agentProductRates.length) {
      setSelectedRates(new Set());
    } else {
      setSelectedRates(new Set(agentProductRates.map(rate => rate.id)));
    }
  };

  // Get unique product names (without pack info)
  const getUniqueProducts = () => {
    const uniqueProducts = new Set(products.map(p => p.productName));
    return Array.from(uniqueProducts);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {language === 'fr' ? 'Taux de Confirmation par Produit' : 'Product Confirmation Rates'}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'fr' 
              ? 'Gérez les taux de confirmation spécifiques à chaque produit pour vos agents Suivi'
              : 'Manage product-specific confirmation rates for your Suivi agents'
            }
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>{getUniqueProducts().length} {language === 'fr' ? 'produits disponibles' : 'products available'}</span>
            </div>
            {selectedRates.size > 0 && (
              <div className="flex items-center space-x-2 text-blue-600">
                <CheckSquare className="w-4 h-4" />
                <span>{selectedRates.size} {language === 'fr' ? 'sélectionnés' : 'selected'}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {selectedRates.size > 0 && (
              <Button 
                onClick={bulkDeleteRates}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Supprimer sélectionnés' : 'Delete Selected'}
              </Button>
            )}
            
            <Button 
              onClick={() => setShowBulkCreate(true)}
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Création en lot' : 'Bulk Create'}
            </Button>
            
            <Button 
              onClick={() => setShowAddProductRate(true)} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="font-medium">
                {language === 'fr' ? 'Nouveau Taux' : 'New Rate'}
              </span>
            </Button>
          </div>
        </div>

        {/* Product Rates Grid */}
        {agentProductRates.length > 0 ? (
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-blue-600" />
                {language === 'fr' ? 'Taux Configurés' : 'Configured Rates'}
              </h2>
              
              <Button
                onClick={toggleSelectAll}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                {selectedRates.size === agentProductRates.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>{language === 'fr' ? 'Tout sélectionner' : 'Select All'}</span>
              </Button>
            </div>
            
            <div className="grid gap-4">
              {agentProductRates.map((rate) => (
                <RateCard
                  key={rate.id}
                  rate={rate}
                  isSelected={selectedRates.has(rate.id)}
                  onToggleSelect={() => toggleRateSelection(rate.id)}
                  onEdit={() => setEditingRate(rate)}
                  onDelete={() => deleteProductRate(rate.id)}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {language === 'fr' ? 'Aucun taux configuré' : 'No rates configured'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {language === 'fr' 
                  ? 'Commencez par ajouter des taux de confirmation spécifiques aux produits pour vos agents.'
                  : 'Start by adding product-specific confirmation rates for your agents.'
                }
              </p>
              <Button 
                onClick={() => setShowAddProductRate(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Ajouter le premier taux' : 'Add first rate'}
              </Button>
            </div>
          </Card>
        )}

        {/* Modals */}
        {showAddProductRate && (
          <AddRateModal
            agents={agents}
            products={getUniqueProducts()}
            onClose={() => setShowAddProductRate(false)}
            onSave={loadAgentProductRates}
          />
        )}

        {editingRate && (
          <EditRateModal
            rate={editingRate}
            onClose={() => setEditingRate(null)}
            onSave={loadAgentProductRates}
          />
        )}

        {showBulkCreate && (
          <BulkCreateModal
            agents={agents}
            products={getUniqueProducts()}
            onClose={() => setShowBulkCreate(false)}
            onSave={loadAgentProductRates}
          />
        )}
      </div>
    </div>
  );
}