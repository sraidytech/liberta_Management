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
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { stockService } from '@/services/stock.service';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  minStockLevel: number;
  reorderPoint: number;
  isActive: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
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
      loadProduct();
    }
  }, [authLoading, user, params.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await stockService.getProduct(params.id as string);
      if (data) {
        setProduct(data);
        setFormData({
          sku: data.sku,
          name: data.name,
          description: data.description || '',
          category: data.category || '',
          unit: data.unit,
          minStockLevel: data.minStockLevel,
          reorderPoint: data.reorderPoint,
          isActive: data.isActive
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      alert(text.notFound);
      router.push('/admin/stock/products');
    } finally {
      setLoading(false);
    }
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
      await stockService.updateProduct(params.id as string, {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        unit: formData.unit,
        minStockLevel: Number(formData.minStockLevel),
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