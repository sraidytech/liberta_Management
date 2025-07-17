'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/lib/language-context';
import { X, Users, ArrowRight, Percent, Hash, Package, Search, Filter } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  agentCode: string;
  isOnline: boolean;
  assignedOrders: number;
  maxOrders: number;
}

interface Product {
  id: string;
  title: string;
  sku: string;
  orderCount: number;
}

interface TargetAgent {
  agentId: string;
  agentName: string;
  percentage: number;
}

interface ProductFilter {
  enabled: boolean;
  products: Array<{
    title?: string;
    sku?: string;
    productId?: string;
  }>;
  logic: 'ALL' | 'ANY';
}

interface BulkReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkReassignmentModal({ isOpen, onClose, onSuccess }: BulkReassignmentModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  
  // Product filtering state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  
  // Form state
  const [selectionType, setSelectionType] = useState<'global' | 'agents'>('global');
  const [orderCount, setOrderCount] = useState<number>(10);
  const [sourceAgentIds, setSourceAgentIds] = useState<string[]>([]);
  const [targetAgents, setTargetAgents] = useState<TargetAgent[]>([]);
  
  // Product filter state
  const [productFilter, setProductFilter] = useState<ProductFilter>({
    enabled: false,
    products: [],
    logic: 'ANY'
  });

  // Fetch available agents
  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/assignments/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data.data || []);
      } else {
        showToast({
          type: 'error',
          title: t('error'),
          message: 'Failed to fetch agents'
        });
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to fetch agents'
      });
    } finally {
      setLoadingAgents(false);
    }
  };

  // Fetch available products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/assignments/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      } else {
        showToast({
          type: 'error',
          title: t('error'),
          message: 'Failed to fetch products'
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to fetch products'
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
      fetchProducts();
    }
  }, [isOpen]);

  const addTargetAgent = () => {
    const availableAgents = agents.filter(agent => 
      !targetAgents.some(ta => ta.agentId === agent.id)
    );
    
    if (availableAgents.length > 0) {
      const remainingPercentage = 100 - targetAgents.reduce((sum, ta) => sum + ta.percentage, 0);
      setTargetAgents([...targetAgents, {
        agentId: availableAgents[0].id,
        agentName: availableAgents[0].name,
        percentage: Math.max(0, remainingPercentage)
      }]);
    } else {
      // If no agents available, add empty entry that user can select from
      const remainingPercentage = 100 - targetAgents.reduce((sum, ta) => sum + ta.percentage, 0);
      setTargetAgents([...targetAgents, {
        agentId: '',
        agentName: '',
        percentage: Math.max(0, remainingPercentage)
      }]);
    }
  };

  const removeTargetAgent = (index: number) => {
    setTargetAgents(targetAgents.filter((_, i) => i !== index));
  };

  const updateTargetAgent = (index: number, field: keyof TargetAgent, value: any) => {
    const updated = [...targetAgents];
    updated[index] = { ...updated[index], [field]: value };
    setTargetAgents(updated);
  };

  const getTotalPercentage = () => {
    return targetAgents.reduce((sum, ta) => sum + ta.percentage, 0);
  };

  // Product filtering helper functions
  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesTitle = !productSearchTerm ||
        product.title.toLowerCase().includes(productSearchTerm.toLowerCase());
      const matchesSku = !skuSearchTerm ||
        product.sku.toLowerCase().includes(skuSearchTerm.toLowerCase());
      return matchesTitle && matchesSku;
    });
  };

  const addProductToFilter = (product: Product) => {
    const isAlreadySelected = productFilter.products.some(p =>
      p.title === product.title && p.sku === product.sku
    );
    
    if (!isAlreadySelected) {
      setProductFilter(prev => ({
        ...prev,
        products: [...prev.products, {
          title: product.title,
          sku: product.sku,
          productId: product.id
        }]
      }));
    }
  };

  const removeProductFromFilter = (index: number) => {
    setProductFilter(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (orderCount <= 0) {
      showToast({
        type: 'error',
        title: t('validationError'),
        message: t('orderCountMustBeGreaterThanZero')
      });
      return;
    }

    if (targetAgents.length === 0) {
      showToast({
        type: 'error',
        title: t('validationError'),
        message: t('pleaseAddAtLeastOneTargetAgent')
      });
      return;
    }

    const totalPercentage = getTotalPercentage();
    if (Math.abs(totalPercentage - 100) > 0.01) {
      showToast({
        type: 'error',
        title: t('validationError'),
        message: t('targetAgentPercentagesMustSumTo100')
      });
      return;
    }

    if (selectionType === 'agents' && sourceAgentIds.length === 0) {
      showToast({
        type: 'error',
        title: t('validationError'),
        message: t('pleaseSelectAtLeastOneSourceAgent')
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/assignments/bulk-reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectionType,
          orderCount,
          sourceAgentIds: selectionType === 'agents' ? sourceAgentIds : undefined,
          targetAgents,
          productFilter: productFilter.enabled ? productFilter : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast({
          type: 'success',
          title: t('success'),
          message: data.message
        });
        onSuccess();
        onClose();
        // Reset form
        setSelectionType('global');
        setOrderCount(10);
        setSourceAgentIds([]);
        setTargetAgents([]);
        setProductFilter({
          enabled: false,
          products: [],
          logic: 'ANY'
        });
        setProductSearchTerm('');
        setSkuSearchTerm('');
      } else {
        showToast({
          type: 'error',
          title: t('error'),
          message: data.error?.message || 'Failed to perform bulk reassignment'
        });
      }
    } catch (error) {
      console.error('Bulk reassignment error:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: 'Failed to perform bulk reassignment'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            {t('bulkOrderReassignment')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selection Type */}
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-3">{t('orderSelection')}</h3>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="global"
                    checked={selectionType === 'global'}
                    onChange={(e) => setSelectionType(e.target.value as 'global')}
                    className="mr-2"
                  />
                  <span>{t('lastNOrdersGlobally')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="agents"
                    checked={selectionType === 'agents'}
                    onChange={(e) => setSelectionType(e.target.value as 'agents')}
                    className="mr-2"
                  />
                  <span>{t('lastNOrdersFromSpecificAgents')}</span>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium">{t('numberOfOrders')}:</label>
                <input
                  type="number"
                  value={orderCount}
                  onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
                  min="1"
                  max="1000"
                  className="border rounded px-3 py-1 w-20"
                />
              </div>

              {selectionType === 'agents' && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('sourceAgents')}:</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {loadingAgents ? (
                      <div className="col-span-2 text-center py-2">{t('loadingAgents')}</div>
                    ) : (
                      agents.map((agent) => (
                        <label key={agent.id} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={sourceAgentIds.includes(agent.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSourceAgentIds([...sourceAgentIds, agent.id]);
                              } else {
                                setSourceAgentIds(sourceAgentIds.filter(id => id !== agent.id));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className={agent.isOnline ? 'text-green-600' : 'text-gray-500'}>
                            {agent.name} ({agent.agentCode})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Product Filtering */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium flex items-center">
                <Package className="w-5 h-5 mr-2 text-purple-600" />
                {t('productFiltering')}
              </h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={productFilter.enabled}
                  onChange={(e) => setProductFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">{t('enableProductFiltering')}</span>
              </label>
            </div>

            {productFilter.enabled && (
              <div className="space-y-4">
                {/* Product Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('searchByProductTitle')}:</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        placeholder={t('enterProductTitle')}
                        className="border rounded px-10 py-2 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('searchBySku')}:</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={skuSearchTerm}
                        onChange={(e) => setSkuSearchTerm(e.target.value)}
                        placeholder={t('enterSku')}
                        className="border rounded px-10 py-2 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Available Products */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('availableProducts')}:</label>
                  <div className="border rounded p-3 max-h-32 overflow-y-auto bg-gray-50">
                    {loadingProducts ? (
                      <div className="text-center py-2 text-gray-500">{t('loadingProducts')}</div>
                    ) : (
                      <div className="space-y-1">
                        {getFilteredProducts().map((product) => (
                          <div
                            key={product.id}
                            onClick={() => addProductToFilter(product)}
                            className="flex justify-between items-center p-2 hover:bg-white rounded cursor-pointer text-sm"
                          >
                            <div>
                              <span className="font-medium">{product.title}</span>
                              {product.sku && <span className="text-gray-500 ml-2">({product.sku})</span>}
                            </div>
                            <span className="text-xs text-blue-600">{product.orderCount} {t('orders')}</span>
                          </div>
                        ))}
                        {getFilteredProducts().length === 0 && (
                          <div className="text-center py-2 text-gray-500">{t('noProductsFound')}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Products */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('selectedProducts')}:</label>
                  <div className="space-y-2">
                    {productFilter.products.map((product, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <div>
                          <span className="font-medium">{product.title}</span>
                          {product.sku && <span className="text-gray-500 ml-2">({product.sku})</span>}
                        </div>
                        <Button
                          onClick={() => removeProductFromFilter(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs"
                        >
                          {t('remove')}
                        </Button>
                      </div>
                    ))}
                    {productFilter.products.length === 0 && (
                      <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                        {t('noProductsSelected')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Matching Logic */}
                {productFilter.products.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('productMatchingLogic')}:</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="ANY"
                          checked={productFilter.logic === 'ANY'}
                          onChange={(e) => setProductFilter(prev => ({ ...prev, logic: e.target.value as 'ALL' | 'ANY' }))}
                          className="mr-2"
                        />
                        <span className="text-sm">{t('ordersContainingAnyProducts')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="ALL"
                          checked={productFilter.logic === 'ALL'}
                          onChange={(e) => setProductFilter(prev => ({ ...prev, logic: e.target.value as 'ALL' | 'ANY' }))}
                          className="mr-2"
                        />
                        <span className="text-sm">{t('ordersContainingAllProducts')}</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Target Agents */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">{t('targetAgentsDistribution')}</h3>
              <Button
                onClick={addTargetAgent}
                disabled={targetAgents.length >= agents.length}
                className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
              >
                {t('addAgent')}
              </Button>
            </div>

            <div className="space-y-3">
              {targetAgents.map((targetAgent, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                  <select
                    value={targetAgent.agentId}
                    onChange={(e) => {
                      const selectedAgent = agents.find(a => a.id === e.target.value);
                      const updated = [...targetAgents];
                      updated[index] = {
                        ...updated[index],
                        agentId: e.target.value,
                        agentName: selectedAgent?.name || ''
                      };
                      setTargetAgents(updated);
                    }}
                    className="border rounded px-3 py-1 flex-1"
                  >
                    {/* Show placeholder option if no agent is selected */}
                    {!targetAgent.agentId && (
                      <option value="" disabled>
                        {t('selectAgent')}
                      </option>
                    )}
                    {agents
                      .filter(agent => 
                        agent.id === targetAgent.agentId || 
                        !targetAgents.some(ta => ta.agentId === agent.id)
                      )
                      .map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.agentCode}) - {agent.assignedOrders}/{agent.maxOrders}
                        </option>
                      ))
                    }
                    {/* Show message if no agents available */}
                    {agents.filter(agent => 
                        agent.id === targetAgent.agentId || 
                        !targetAgents.some(ta => ta.agentId === agent.id)
                      ).length === 0 && (
                      <option value="" disabled>
                        {t('noAgentsAvailable')}
                      </option>
                    )}
                  </select>
                  
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={targetAgent.percentage}
                      onChange={(e) => updateTargetAgent(index, 'percentage', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                      className="border rounded px-2 py-1 w-16 text-center"
                    />
                    <Percent className="w-4 h-4 text-gray-500" />
                  </div>

                  <Button
                    onClick={() => removeTargetAgent(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-sm"
                  >
                    {t('remove')}
                  </Button>
                </div>
              ))}

              {targetAgents.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  {t('noTargetAgentsAdded')}
                </div>
              )}

              {targetAgents.length > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">{t('totalPercentage')}:</span>
                  <span className={`font-bold ${Math.abs(getTotalPercentage() - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {getTotalPercentage().toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Preview */}
          {targetAgents.length > 0 && orderCount > 0 && (
            <Card className="p-4 bg-blue-50">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <ArrowRight className="w-5 h-5 mr-2 text-blue-600" />
                {t('distributionPreviewRoundRobin')}
              </h3>
              
              {/* Product Filter Summary */}
              {productFilter.enabled && productFilter.products.length > 0 && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="flex items-center mb-2">
                    <Filter className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">{t('productFiltering')} {t('enabled')}</span>
                  </div>
                  <div className="text-xs text-purple-700">
                    <div className="mb-1">
                      <strong>{t('selectedProducts')}:</strong> {productFilter.products.map(p => p.title).join(', ')}
                    </div>
                    <div>
                      <strong>{t('logic')}:</strong> {productFilter.logic === 'ALL' ? t('allSelectedProducts') : t('anySelectedProducts')}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="space-y-2">
                  {targetAgents.map((targetAgent, index) => {
                    const ordersForAgent = Math.floor((orderCount * targetAgent.percentage) / 100);
                    return (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{targetAgent.agentName}</span>
                        <span className="text-blue-600">
                          ~{ordersForAgent} {t('orders')} ({targetAgent.percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Show distribution pattern */}
                <div className="pt-2 border-t border-blue-200">
                  <div className="text-xs text-blue-700 font-medium mb-1">{t('assignmentPattern')}:</div>
                  <div className="text-xs text-blue-600">
                    {(() => {
                      // Calculate the ratio pattern
                      const percentages = targetAgents.map(agent => Math.round(agent.percentage));
                      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                      let commonDivisor = percentages[0];
                      for (let i = 1; i < percentages.length; i++) {
                        commonDivisor = gcd(commonDivisor, percentages[i]);
                      }
                      const ratios = percentages.map(p => p / commonDivisor);
                      
                      // Create pattern description
                      const patternParts = targetAgents.map((agent, index) =>
                        `${ratios[index]} to ${agent.agentName}`
                      );
                      
                      return `${t('alternating')}: ${patternParts.join(`, ${t('then')} `)} (${t('repeating')})`;
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('ordersWillBeDistributedAlternating')}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || targetAgents.length === 0 || Math.abs(getTotalPercentage() - 100) > 0.01}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? t('processing') : t('startBulkReassignment')}
          </Button>
        </div>
      </div>
    </div>
  );
}
