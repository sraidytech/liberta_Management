'use client';

import { useState } from 'react';
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
    title: 'Add New Product',
    sku: 'SKU',
    skuPlaceholder: 'Enter product SKU',
    name: 'Product Name',
    namePlaceholder: 'Enter product name',
    description: 'Description',
    descriptionPlaceholder: 'Enter product description (optional)',
    category: 'Category',
    categoryPlaceholder: 'Enter category (optional)',
    unit: 'Unit',
    unitPlaceholder: 'e.g., piece, box, kg',
    minThreshold: 'Minimum Stock Level',
    minThresholdPlaceholder: 'Enter minimum stock threshold',
    reorderPoint: 'Reorder Point',
    reorderPointPlaceholder: 'Enter reorder point (optional)',
    cancel: 'Cancel',
    save: 'Save Product',
    saving: 'Saving...',
    required: 'This field is required',
    success: 'Product created successfully!',
    error: 'Failed to create product',
  },
  fr: {
    title: 'Ajouter Nouveau Produit',
    sku: 'SKU',
    skuPlaceholder: 'Entrez le SKU du produit',
    name: 'Nom du Produit',
    namePlaceholder: 'Entrez le nom du produit',
    description: 'Description',
    descriptionPlaceholder: 'Entrez la description (optionnel)',
    category: 'Catégorie',
    categoryPlaceholder: 'Entrez la catégorie (optionnel)',
    unit: 'Unité',
    unitPlaceholder: 'ex: pièce, boîte, kg',
    minThreshold: 'Niveau de Stock Minimum',
    minThresholdPlaceholder: 'Entrez le seuil minimum',
    reorderPoint: 'Point de Réapprovisionnement',
    reorderPointPlaceholder: 'Entrez le point de réapprovisionnement (optionnel)',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    required: 'Ce champ est requis',
    success: 'Produit créé avec succès!',
    error: 'Échec de la création du produit',
  },
};

export default function NewProductPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'piece',
    minThreshold: '100',
    reorderPoint: '',
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'STOCK_MANAGEMENT_AGENT' ? StockAgentLayout : AdminLayout;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.sku.trim()) newErrors.sku = t[language].required;
    if (!formData.name.trim()) newErrors.name = t[language].required;
    if (!formData.unit.trim()) newErrors.unit = t[language].required;
    if (!formData.minThreshold || parseInt(formData.minThreshold) < 0) {
      newErrors.minThreshold = t[language].required;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      await stockService.createProduct({
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        unit: formData.unit.trim(),
        minStockLevel: parseInt(formData.minThreshold),
        reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : undefined,
      });

      alert(t[language].success);
      router.push('/admin/stock/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
      alert(error.message || t[language].error);
    } finally {
      setLoading(false);
    }
  };

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
            {/* SKU */}
            <div>
              <Label htmlFor="sku">{t[language].sku} *</Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder={t[language].skuPlaceholder}
                className={errors.sku ? 'border-red-500' : ''}
              />
              {errors.sku && <p className="text-sm text-red-500 mt-1">{errors.sku}</p>}
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">{t[language].name} *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t[language].namePlaceholder}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t[language].description}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t[language].descriptionPlaceholder}
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">{t[language].category}</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder={t[language].categoryPlaceholder}
              />
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="unit">{t[language].unit} *</Label>
              <Input
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder={t[language].unitPlaceholder}
                className={errors.unit ? 'border-red-500' : ''}
              />
              {errors.unit && <p className="text-sm text-red-500 mt-1">{errors.unit}</p>}
            </div>

            {/* Min Threshold */}
            <div>
              <Label htmlFor="minThreshold">{t[language].minThreshold} *</Label>
              <Input
                id="minThreshold"
                name="minThreshold"
                type="number"
                min="0"
                value={formData.minThreshold}
                onChange={handleChange}
                placeholder={t[language].minThresholdPlaceholder}
                className={errors.minThreshold ? 'border-red-500' : ''}
              />
              {errors.minThreshold && <p className="text-sm text-red-500 mt-1">{errors.minThreshold}</p>}
            </div>

            {/* Reorder Point */}
            <div>
              <Label htmlFor="reorderPoint">{t[language].reorderPoint}</Label>
              <Input
                id="reorderPoint"
                name="reorderPoint"
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={handleChange}
                placeholder={t[language].reorderPointPlaceholder}
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