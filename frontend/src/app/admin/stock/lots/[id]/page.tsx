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
import { ArrowLeft, Save, Loader2, Package, AlertTriangle } from 'lucide-react';
import { stockService } from '@/services/stock.service';

interface Lot {
  id: string;
  lotNumber: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  availableQuantity: number;
  costPerUnit?: number;
  productionDate?: string;
  expiryDate?: string;
  supplierInfo?: string;
  notes?: string;
  status: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export default function EditLotPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lot, setLot] = useState<Lot | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    lotNumber: '',
    productId: '',
    warehouseId: '',
    quantity: 0,
    costPerUnit: '',
    productionDate: '',
    expiryDate: '',
    supplierInfo: '',
    notes: '',
    status: 'ACTIVE'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = {
    en: {
      title: 'Edit Lot',
      loading: 'Loading lot...',
      lotNumber: 'Lot Number',
      lotNumberPlaceholder: 'Enter lot number',
      product: 'Product',
      selectProduct: 'Select a product',
      warehouse: 'Warehouse',
      selectWarehouse: 'Select a warehouse',
      quantity: 'Quantity',
      quantityPlaceholder: 'Enter quantity',
      available: 'Available',
      costPerUnit: 'Cost Per Unit (Optional)',
      costPlaceholder: 'Enter cost per unit',
      productionDate: 'Production Date (Optional)',
      expiryDate: 'Expiry Date (Optional)',
      supplierInfo: 'Supplier Information (Optional)',
      supplierPlaceholder: 'Enter supplier details',
      notes: 'Notes (Optional)',
      notesPlaceholder: 'Enter any additional notes',
      status: 'Status',
      active: 'Active',
      depleted: 'Depleted',
      expired: 'Expired',
      back: 'Back to Lots',
      save: 'Save Changes',
      saving: 'Saving...',
      success: 'Lot updated successfully',
      error: 'Failed to update lot',
      notFound: 'Lot not found',
      required: 'This field is required',
      invalidNumber: 'Must be a valid number',
      warning: 'Warning',
      quantityWarning: 'Changing quantity may affect stock levels. Current available: ',
      expiryWarning: 'This lot has expired or will expire soon'
    },
    fr: {
      title: 'Modifier le Lot',
      loading: 'Chargement du lot...',
      lotNumber: 'Numéro de Lot',
      lotNumberPlaceholder: 'Entrez le numéro de lot',
      product: 'Produit',
      selectProduct: 'Sélectionnez un produit',
      warehouse: 'Entrepôt',
      selectWarehouse: 'Sélectionnez un entrepôt',
      quantity: 'Quantité',
      quantityPlaceholder: 'Entrez la quantité',
      available: 'Disponible',
      costPerUnit: 'Coût Unitaire (Optionnel)',
      costPlaceholder: 'Entrez le coût unitaire',
      productionDate: 'Date de Production (Optionnel)',
      expiryDate: 'Date d\'Expiration (Optionnel)',
      supplierInfo: 'Informations Fournisseur (Optionnel)',
      supplierPlaceholder: 'Entrez les détails du fournisseur',
      notes: 'Notes (Optionnel)',
      notesPlaceholder: 'Entrez des notes supplémentaires',
      status: 'Statut',
      active: 'Actif',
      depleted: 'Épuisé',
      expired: 'Expiré',
      back: 'Retour aux Lots',
      save: 'Enregistrer les Modifications',
      saving: 'Enregistrement...',
      success: 'Lot mis à jour avec succès',
      error: 'Échec de la mise à jour du lot',
      notFound: 'Lot non trouvé',
      required: 'Ce champ est requis',
      invalidNumber: 'Doit être un nombre valide',
      warning: 'Avertissement',
      quantityWarning: 'La modification de la quantité peut affecter les niveaux de stock. Disponible actuel: ',
      expiryWarning: 'Ce lot a expiré ou expirera bientôt'
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
      const [lotData, productsData, warehousesData] = await Promise.all([
        stockService.getLot(params.id as string),
        stockService.getProducts(),
        stockService.getWarehouses()
      ]);

      if (lotData) {
        setLot(lotData);
        setFormData({
          lotNumber: lotData.lotNumber,
          productId: lotData.productId,
          warehouseId: lotData.warehouseId,
          quantity: lotData.quantity,
          costPerUnit: lotData.costPerUnit?.toString() || '',
          productionDate: lotData.productionDate ? new Date(lotData.productionDate).toISOString().split('T')[0] : '',
          expiryDate: lotData.expiryDate ? new Date(lotData.expiryDate).toISOString().split('T')[0] : '',
          supplierInfo: lotData.supplierInfo || '',
          notes: lotData.notes || '',
          status: lotData.status
        });
      }

      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert(text.notFound);
      router.push('/admin/stock/lots');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.lotNumber.trim()) {
      newErrors.lotNumber = text.required;
    }
    if (!formData.productId) {
      newErrors.productId = text.required;
    }
    if (!formData.warehouseId) {
      newErrors.warehouseId = text.required;
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = text.invalidNumber;
    }
    if (formData.costPerUnit && Number(formData.costPerUnit) < 0) {
      newErrors.costPerUnit = text.invalidNumber;
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
      await stockService.updateLot(params.id as string, {
        lotNumber: formData.lotNumber,
        productId: formData.productId,
        warehouseId: formData.warehouseId,
        quantity: Number(formData.quantity),
        costPerUnit: formData.costPerUnit ? Number(formData.costPerUnit) : undefined,
        productionDate: formData.productionDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        supplierInfo: formData.supplierInfo || undefined,
        notes: formData.notes || undefined,
        status: formData.status
      });

      alert(text.success);
      router.push('/admin/stock/lots');
    } catch (error) {
      console.error('Failed to update lot:', error);
      alert(text.error);
    } finally {
      setSaving(false);
    }
  };

  const isExpiringSoon = () => {
    if (!formData.expiryDate) return false;
    const expiryDate = new Date(formData.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
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
  const selectedProduct = products.find(p => p.id === formData.productId);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/stock/lots')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {text.back}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{text.title}</h1>
        </div>

        {/* Warnings */}
        {lot && (
          <div className="mb-6 space-y-3">
            {formData.quantity !== lot.quantity && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">{text.warning}</p>
                  <p className="text-sm text-yellow-700">
                    {text.quantityWarning}{lot.availableQuantity} {lot.product?.unit}
                  </p>
                </div>
              </div>
            )}
            {isExpiringSoon() && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">{text.warning}</p>
                  <p className="text-sm text-red-700">{text.expiryWarning}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lot Number */}
            <div>
              <Label htmlFor="lotNumber">{text.lotNumber} *</Label>
              <Input
                id="lotNumber"
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                placeholder={text.lotNumberPlaceholder}
                className={errors.lotNumber ? 'border-red-500' : ''}
              />
              {errors.lotNumber && <p className="text-red-500 text-sm mt-1">{errors.lotNumber}</p>}
            </div>

            {/* Product */}
            <div>
              <Label htmlFor="productId">{text.product} *</Label>
              <select
                id="productId"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.productId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{text.selectProduct}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
              {errors.productId && <p className="text-red-500 text-sm mt-1">{errors.productId}</p>}
            </div>

            {/* Warehouse */}
            <div>
              <Label htmlFor="warehouseId">{text.warehouse} *</Label>
              <select
                id="warehouseId"
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.warehouseId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">{text.selectWarehouse}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
              {errors.warehouseId && <p className="text-red-500 text-sm mt-1">{errors.warehouseId}</p>}
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">{text.quantity} *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  placeholder={text.quantityPlaceholder}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {selectedProduct && (
                  <span className="text-sm text-gray-600 whitespace-nowrap">{selectedProduct.unit}</span>
                )}
              </div>
              {lot && (
                <p className="text-sm text-gray-600 mt-1">
                  {text.available}: {lot.availableQuantity} {lot.product?.unit}
                </p>
              )}
              {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
            </div>

            {/* Cost Per Unit */}
            <div>
              <Label htmlFor="costPerUnit">{text.costPerUnit}</Label>
              <Input
                id="costPerUnit"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                placeholder={text.costPlaceholder}
                className={errors.costPerUnit ? 'border-red-500' : ''}
              />
              {errors.costPerUnit && <p className="text-red-500 text-sm mt-1">{errors.costPerUnit}</p>}
            </div>

            {/* Production Date */}
            <div>
              <Label htmlFor="productionDate">{text.productionDate}</Label>
              <Input
                id="productionDate"
                type="date"
                value={formData.productionDate}
                onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <Label htmlFor="expiryDate">{text.expiryDate}</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>

            {/* Supplier Info */}
            <div>
              <Label htmlFor="supplierInfo">{text.supplierInfo}</Label>
              <Input
                id="supplierInfo"
                value={formData.supplierInfo}
                onChange={(e) => setFormData({ ...formData, supplierInfo: e.target.value })}
                placeholder={text.supplierPlaceholder}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{text.notes}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={text.notesPlaceholder}
                rows={3}
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">{text.status}</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">{text.active}</option>
                <option value="DEPLETED">{text.depleted}</option>
                <option value="EXPIRED">{text.expired}</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/stock/lots')}
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