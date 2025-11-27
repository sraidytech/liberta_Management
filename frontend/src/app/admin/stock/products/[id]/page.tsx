'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2, Package, AlertTriangle, Plus, Minus } from 'lucide-react';
import { stockService } from '@/services/stock.service';

interface StockLevel {
  id: string;
  warehouseId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  minStockLevel: number;
  minThreshold?: number;
  reorderPoint: number;
  isActive: boolean;
  stockLevels?: StockLevel[];
  lots?: any[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isPrimary?: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'UNIT',
    minStockLevel: 0,
    reorderPoint: 0,
    isActive: true
  });
  const [adjustmentData, setAdjustmentData] = useState({
    warehouseId: '',
    quantity: 0,
    reason: '',
    type: 'add' as 'add' | 'remove'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = {
    en: {
      title: 'Edit Product',
      loading: 'Loading product...',
      sku: 'SKU',
      skuPlaceholder: 'Enter product SKU',
      name: 'Product Name',
      namePlaceholder: 'Enter product name',
      description: 'Description',
      descriptionPlaceholder: 'Enter product description (optional)',
      category: 'Category',
      categoryPlaceholder: 'Enter category (optional)',
      unit: 'Unit of Measurement',
      minStock: 'Minimum Stock Level',
      minStockPlaceholder: 'Enter minimum stock threshold',
      reorderPoint: 'Reorder Point',
      reorderPointPlaceholder: 'Enter reorder point',
      active: 'Active',
      inactive: 'Inactive',
      status: 'Status',
      back: 'Back to Products',
      save: 'Save Changes',
      saving: 'Saving...',
      success: 'Product updated successfully',
      error: 'Failed to update product',
      notFound: 'Product not found',
      required: 'This field is required',
      invalidNumber: 'Must be a valid number',
      stockLevels: 'Current Stock Levels',
      warehouse: 'Warehouse',
      totalQuantity: 'Total',
      availableQuantity: 'Available',
      reservedQuantity: 'Reserved',
      noStock: 'No stock records found',
      adjustStock: 'Adjust Stock',
      adjustmentQuantity: 'Adjustment Quantity',
      adjustmentReason: 'Reason',
      adjustmentReasonPlaceholder: 'Enter reason for adjustment',
      addStock: 'Add Stock',
      removeStock: 'Remove Stock',
      adjustmentSuccess: 'Stock adjusted successfully',
      adjustmentError: 'Failed to adjust stock',
      lowStockWarning: 'Low stock warning',
      manualAdjustment: 'Manual Stock Adjustment',
      selectWarehouse: 'Select Warehouse',
      adjustmentType: 'Adjustment Type',
      add: 'Add',
      remove: 'Remove',
      apply: 'Apply Adjustment',
      applying: 'Applying...',
      quantityRequired: 'Quantity must be greater than 0',
      warehouseRequired: 'Please select a warehouse',
      reasonRequired: 'Please enter a reason for the adjustment',
      units: {
        UNIT: 'Unit',
        KG: 'Kilogram',
        G: 'Gram',
        L: 'Liter',
        ML: 'Milliliter',
        BOX: 'Box',
        PACK: 'Pack',
        PIECE: 'Piece'
      }
    },
    fr: {
      title: 'Modifier le Produit',
      loading: 'Chargement du produit...',
      sku: 'SKU',
      skuPlaceholder: 'Entrez le SKU du produit',
      name: 'Nom du Produit',
      namePlaceholder: 'Entrez le nom du produit',
      description: 'Description',
      descriptionPlaceholder: 'Entrez la description du produit (optionnel)',
      category: 'Catégorie',
      categoryPlaceholder: 'Entrez la catégorie (optionnel)',
      unit: 'Unité de Mesure',
      minStock: 'Niveau de Stock Minimum',
      minStockPlaceholder: 'Entrez le seuil de stock minimum',
      reorderPoint: 'Point de Réapprovisionnement',
      reorderPointPlaceholder: 'Entrez le point de réapprovisionnement',
      active: 'Actif',
      inactive: 'Inactif',
      status: 'Statut',
      back: 'Retour aux Produits',
      save: 'Enregistrer les Modifications',
      saving: 'Enregistrement...',
      success: 'Produit mis à jour avec succès',
      error: 'Échec de la mise à jour du produit',
      notFound: 'Produit non trouvé',
      required: 'Ce champ est requis',
      invalidNumber: 'Doit être un nombre valide',
      stockLevels: 'Niveaux de Stock Actuels',
      warehouse: 'Entrepôt',
      totalQuantity: 'Total',
      availableQuantity: 'Disponible',
      reservedQuantity: 'Réservé',
      noStock: 'Aucun enregistrement de stock trouvé',
      adjustStock: 'Ajuster le Stock',
      adjustmentQuantity: 'Quantité d\'Ajustement',
      adjustmentReason: 'Raison',
      adjustmentReasonPlaceholder: 'Entrez la raison de l\'ajustement',
      addStock: 'Ajouter Stock',
      removeStock: 'Retirer Stock',
      adjustmentSuccess: 'Stock ajusté avec succès',
      adjustmentError: 'Échec de l\'ajustement du stock',
      lowStockWarning: 'Avertissement de stock bas',
      manualAdjustment: 'Ajustement Manuel du Stock',
      selectWarehouse: 'Sélectionner Entrepôt',
      adjustmentType: 'Type d\'Ajustement',
      add: 'Ajouter',
      remove: 'Retirer',
      apply: 'Appliquer l\'Ajustement',
      applying: 'Application...',
      quantityRequired: 'La quantité doit être supérieure à 0',
      warehouseRequired: 'Veuillez sélectionner un entrepôt',
      reasonRequired: 'Veuillez entrer une raison pour l\'ajustement',
      units: {
        UNIT: 'Unité',
        KG: 'Kilogramme',
        G: 'Gramme',
        L: 'Litre',
        ML: 'Millilitre',
        BOX: 'Boîte',
        PACK: 'Pack',
        PIECE: 'Pièce'
      }
    }
  };

  const text = t[language as keyof typeof t];

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load product and warehouses in parallel
      const [productData, warehousesData] = await Promise.all([
        stockService.getProduct(params.id as string),
        stockService.getWarehouses()
      ]);
      
      if (productData) {
        setProduct(productData);
        // Map backend field names to frontend field names
        setFormData({
          sku: productData.sku,
          name: productData.name,
          description: productData.description || '',
          category: productData.category || '',
          unit: productData.unit || 'UNIT',
          minStockLevel: productData.minThreshold || productData.minStockLevel || 0,
          reorderPoint: productData.reorderPoint || 0,
          isActive: productData.isActive !== false
        });
      }
      
      // Set warehouses and auto-select primary/first warehouse
      const warehousesList = Array.isArray(warehousesData) ? warehousesData : [];
      setWarehouses(warehousesList);
      
      // Auto-select primary warehouse or first warehouse
      if (warehousesList.length > 0) {
        const primaryWarehouse = warehousesList.find((w: Warehouse) => w.isPrimary);
        const defaultWarehouse = primaryWarehouse || warehousesList[0];
        setAdjustmentData(prev => ({ ...prev, warehouseId: defaultWarehouse.id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert(text.notFound);
      router.push('/admin/stock/products');
    } finally {
      setLoading(false);
    }
  };

  const loadProduct = async () => {
    await loadData();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = text.required;
    }
    if (!formData.name.trim()) {
      newErrors.name = text.required;
    }
    if (formData.minStockLevel < 0) {
      newErrors.minStockLevel = text.invalidNumber;
    }
    if (formData.reorderPoint < 0) {
      newErrors.reorderPoint = text.invalidNumber;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      // Map frontend field names to backend field names
      await stockService.updateProduct(params.id as string, {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        unit: formData.unit,
        minThreshold: Number(formData.minStockLevel),
        reorderPoint: Number(formData.reorderPoint),
        isActive: formData.isActive
      });

      alert(text.success);
      router.push('/admin/stock/products');
    } catch (error) {
      console.error('Failed to update product:', error);
      alert(text.error);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustment = async () => {
    // Validate
    if (!adjustmentData.warehouseId) {
      alert(text.warehouseRequired);
      return;
    }
    if (adjustmentData.quantity <= 0) {
      alert(text.quantityRequired);
      return;
    }
    if (!adjustmentData.reason.trim()) {
      alert(text.reasonRequired);
      return;
    }

    try {
      setAdjusting(true);
      await stockService.createMovement({
        productId: params.id as string,
        warehouseId: adjustmentData.warehouseId,
        type: 'ADJUSTMENT',
        quantity: adjustmentData.type === 'add' ? adjustmentData.quantity : -adjustmentData.quantity,
        reason: adjustmentData.reason,
        reference: `Manual adjustment - ${new Date().toISOString()}`
      });

      alert(text.adjustmentSuccess);
      // Reset form and reload product
      setAdjustmentData({
        warehouseId: '',
        quantity: 0,
        reason: '',
        type: 'add'
      });
      loadProduct();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      alert(text.adjustmentError);
    } finally {
      setAdjusting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">{text.loading}</span>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/stock/products')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {text.back}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{text.title}</h1>
        </div>

        {/* Stock Levels Section */}
        {product && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                {text.stockLevels}
              </h2>
            </div>

            {/* Stock Summary */}
            {product.stockLevels && product.stockLevels.length > 0 ? (
              <div className="space-y-4">
                {/* Total Stock Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600">{text.totalQuantity}</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {product.stockLevels.reduce((sum, sl) => sum + (sl.totalQuantity || 0), 0)} {product.unit}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600">{text.availableQuantity}</p>
                    <p className="text-2xl font-bold text-green-900">
                      {product.stockLevels.reduce((sum, sl) => sum + (sl.availableQuantity || 0), 0)} {product.unit}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-orange-600">{text.reservedQuantity}</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {product.stockLevels.reduce((sum, sl) => sum + (sl.reservedQuantity || 0), 0)} {product.unit}
                    </p>
                  </div>
                </div>

                {/* Low Stock Warning */}
                {(() => {
                  const totalAvailable = product.stockLevels.reduce((sum, sl) => sum + (sl.availableQuantity || 0), 0);
                  const minThreshold = product.minThreshold || product.minStockLevel || 0;
                  if (totalAvailable < minThreshold) {
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800">
                          {text.lowStockWarning}: {totalAvailable} / {minThreshold} {product.unit}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Stock by Warehouse */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{text.warehouse}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{text.totalQuantity}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{text.availableQuantity}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{text.reservedQuantity}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {product.stockLevels.map((sl) => (
                        <tr key={sl.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {sl.warehouse?.name || 'Unknown'} ({sl.warehouse?.code || '-'})
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{sl.totalQuantity || 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-green-600">{sl.availableQuantity || 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-orange-600">{sl.reservedQuantity || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Link to add lot */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    To add stock, create a new lot for this product:
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/admin/stock/lots/new?productId=${params.id}`)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {text.addStock}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>{text.noStock}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/admin/stock/lots/new?productId=${params.id}`)}
                  className="mt-4 flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  {text.addStock}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Manual Stock Adjustment Section */}
        {product && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {text.manualAdjustment}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Warehouse Selection */}
              <div>
                <Label htmlFor="adjustWarehouse">{text.selectWarehouse} *</Label>
                <select
                  id="adjustWarehouse"
                  value={adjustmentData.warehouseId}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{text.selectWarehouse}</option>
                  {warehouses.map((warehouse) => {
                    // Find stock level for this warehouse if exists
                    const stockLevel = product?.stockLevels?.find(sl => sl.warehouseId === warehouse.id);
                    const availableQty = stockLevel?.availableQuantity || 0;
                    return (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code}){stockLevel ? ` - ${availableQty} available` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Adjustment Type */}
              <div>
                <Label htmlFor="adjustType">{text.adjustmentType} *</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={adjustmentData.type === 'add' ? 'default' : 'outline'}
                    onClick={() => setAdjustmentData({ ...adjustmentData, type: 'add' })}
                    className={adjustmentData.type === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {text.add}
                  </Button>
                  <Button
                    type="button"
                    variant={adjustmentData.type === 'remove' ? 'default' : 'outline'}
                    onClick={() => setAdjustmentData({ ...adjustmentData, type: 'remove' })}
                    className={adjustmentData.type === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    {text.remove}
                  </Button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="adjustQuantity">{text.adjustmentQuantity} *</Label>
                <Input
                  id="adjustQuantity"
                  type="number"
                  min="1"
                  value={adjustmentData.quantity || ''}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: Number(e.target.value) })}
                  placeholder="Enter quantity"
                />
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="adjustReason">{text.adjustmentReason} *</Label>
                <Input
                  id="adjustReason"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  placeholder={text.adjustmentReasonPlaceholder}
                />
              </div>
            </div>

            {/* Apply Button */}
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={handleAdjustment}
                disabled={adjusting}
                className={adjustmentData.type === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {adjusting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {text.applying}
                  </>
                ) : (
                  <>
                    {adjustmentData.type === 'add' ? <Plus className="w-4 h-4 mr-2" /> : <Minus className="w-4 h-4 mr-2" />}
                    {text.apply}
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SKU */}
            <div>
              <Label htmlFor="sku">{text.sku} *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={text.skuPlaceholder}
                className={errors.sku ? 'border-red-500' : ''}
              />
              {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku}</p>}
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">{text.name} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={text.namePlaceholder}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{text.description}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={text.descriptionPlaceholder}
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">{text.category}</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={text.categoryPlaceholder}
              />
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="unit">{text.unit} *</Label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(text.units).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Stock Level */}
            <div>
              <Label htmlFor="minStockLevel">{text.minStock} *</Label>
              <Input
                id="minStockLevel"
                type="number"
                min="0"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                placeholder={text.minStockPlaceholder}
                className={errors.minStockLevel ? 'border-red-500' : ''}
              />
              {errors.minStockLevel && <p className="text-red-500 text-sm mt-1">{errors.minStockLevel}</p>}
            </div>

            {/* Reorder Point */}
            <div>
              <Label htmlFor="reorderPoint">{text.reorderPoint} *</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) })}
                placeholder={text.reorderPointPlaceholder}
                className={errors.reorderPoint ? 'border-red-500' : ''}
              />
              {errors.reorderPoint && <p className="text-red-500 text-sm mt-1">{errors.reorderPoint}</p>}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="isActive">{text.status}</Label>
              <select
                id="isActive"
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">{text.active}</option>
                <option value="false">{text.inactive}</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/stock/products')}
              >
                {text.back}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {text.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {text.save}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}