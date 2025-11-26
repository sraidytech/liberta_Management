'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import StockAgentLayout from '@/components/stock-agent/stock-agent-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import stockService from '@/services/stock.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Save } from 'lucide-react';

const t = {
  en: {
    title: 'Receive New Lot',
    product: 'Product',
    productPlaceholder: 'Select product',
    warehouse: 'Warehouse',
    warehousePlaceholder: 'Select warehouse',
    lotNumber: 'Lot Number',
    lotNumberPlaceholder: 'Enter lot number',
    quantity: 'Quantity',
    quantityPlaceholder: 'Enter quantity',
    unitCost: 'Unit Cost',
    unitCostPlaceholder: 'Enter cost per unit (optional)',
    productionDate: 'Production Date',
    expiryDate: 'Expiry Date',
    supplierInfo: 'Supplier Information',
    supplierInfoPlaceholder: 'Enter supplier details (optional)',
    notes: 'Notes',
    notesPlaceholder: 'Enter additional notes (optional)',
    cancel: 'Cancel',
    save: 'Receive Lot',
    saving: 'Saving...',
    loading: 'Loading...',
    required: 'This field is required',
    success: 'Lot received successfully!',
    error: 'Failed to receive lot',
    loadingData: 'Loading products and warehouses...',
  },
  fr: {
    title: 'Recevoir Nouveau Lot',
    product: 'Produit',
    productPlaceholder: 'Sélectionner produit',
    warehouse: 'Entrepôt',
    warehousePlaceholder: 'Sélectionner entrepôt',
    lotNumber: 'Numéro de Lot',
    lotNumberPlaceholder: 'Entrez le numéro de lot',
    quantity: 'Quantité',
    quantityPlaceholder: 'Entrez la quantité',
    unitCost: 'Coût Unitaire',
    unitCostPlaceholder: 'Entrez le coût par unité (optionnel)',
    productionDate: 'Date de Production',
    expiryDate: 'Date d\'Expiration',
    supplierInfo: 'Informations Fournisseur',
    supplierInfoPlaceholder: 'Entrez les détails du fournisseur (optionnel)',
    notes: 'Notes',
    notesPlaceholder: 'Entrez des notes supplémentaires (optionnel)',
    cancel: 'Annuler',
    save: 'Recevoir Lot',
    saving: 'Enregistrement...',
    loading: 'Chargement...',
    required: 'Ce champ est requis',
    success: 'Lot reçu avec succès!',
    error: 'Échec de la réception du lot',
    loadingData: 'Chargement des produits et entrepôts...',
  },
};

export default function NewLotPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    lotNumber: '',
    quantity: '',
    unitCost: '',
    productionDate: '',
    expiryDate: '',
    supplierInfo: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, warehousesData] = await Promise.all([
        stockService.getProducts(),
        stockService.getWarehouses(),
      ]);
      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.productId) newErrors.productId = t[language].required;
    if (!formData.warehouseId) newErrors.warehouseId = t[language].required;
    if (!formData.lotNumber.trim()) newErrors.lotNumber = t[language].required;
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = t[language].required;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      await stockService.createLot({
        productId: formData.productId,
        warehouseId: formData.warehouseId,
        lotNumber: formData.lotNumber.trim(),
        quantity: parseInt(formData.quantity),
        costPerUnit: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
        manufacturingDate: formData.productionDate || undefined,
        expiryDate: formData.expiryDate || undefined,
      });

      alert(t[language].success);
      router.push('/admin/stock/lots');
    } catch (error: any) {
      console.error('Error creating lot:', error);
      alert(error.message || t[language].error);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t[language].loadingData}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t[language].cancel}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product */}
            <div>
              <Label htmlFor="productId">{t[language].product} *</Label>
              <select
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.productId ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">{t[language].productPlaceholder}</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
              {errors.productId && <p className="text-sm text-red-500 mt-1">{errors.productId}</p>}
            </div>

            {/* Warehouse */}
            <div>
              <Label htmlFor="warehouseId">{t[language].warehouse} *</Label>
              <select
                id="warehouseId"
                name="warehouseId"
                value={formData.warehouseId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.warehouseId ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">{t[language].warehousePlaceholder}</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
              {errors.warehouseId && <p className="text-sm text-red-500 mt-1">{errors.warehouseId}</p>}
            </div>

            {/* Lot Number */}
            <div>
              <Label htmlFor="lotNumber">{t[language].lotNumber} *</Label>
              <Input
                id="lotNumber"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleChange}
                placeholder={t[language].lotNumberPlaceholder}
                className={errors.lotNumber ? 'border-red-500' : ''}
              />
              {errors.lotNumber && <p className="text-sm text-red-500 mt-1">{errors.lotNumber}</p>}
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">{t[language].quantity} *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                placeholder={t[language].quantityPlaceholder}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>}
            </div>

            {/* Unit Cost */}
            <div>
              <Label htmlFor="unitCost">{t[language].unitCost}</Label>
              <Input
                id="unitCost"
                name="unitCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitCost}
                onChange={handleChange}
                placeholder={t[language].unitCostPlaceholder}
              />
            </div>

            {/* Production Date */}
            <div>
              <Label htmlFor="productionDate">{t[language].productionDate}</Label>
              <Input
                id="productionDate"
                name="productionDate"
                type="date"
                value={formData.productionDate}
                onChange={handleChange}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <Label htmlFor="expiryDate">{t[language].expiryDate}</Label>
              <Input
                id="expiryDate"
                name="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={handleChange}
              />
            </div>

            {/* Supplier Info */}
            <div>
              <Label htmlFor="supplierInfo">{t[language].supplierInfo}</Label>
              <Input
                id="supplierInfo"
                name="supplierInfo"
                value={formData.supplierInfo}
                onChange={handleChange}
                placeholder={t[language].supplierInfoPlaceholder}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{t[language].notes}</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={t[language].notesPlaceholder}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                {t[language].cancel}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? t[language].saving : t[language].save}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}