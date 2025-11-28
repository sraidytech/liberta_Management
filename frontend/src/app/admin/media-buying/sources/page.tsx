'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import MediaBuyerLayout from '@/components/media-buyer/media-buyer-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaBuyingService, AdSource } from '@/services/media-buying.service';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { 
  Plus, 
  Edit,
  X,
  Megaphone,
  Check,
  XCircle
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Ad Sources',
    addSource: 'Add Source',
    name: 'Name',
    slug: 'Slug',
    color: 'Color',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Inactive',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error loading data',
    noSources: 'No sources found',
    createSource: 'Create Source',
    editSource: 'Edit Source',
    save: 'Save',
    cancel: 'Cancel',
    icon: 'Icon',
    defaultSources: 'Default Sources',
    customSources: 'Custom Sources',
    facebook: 'Facebook',
    google: 'Google Ads',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    snapchat: 'Snapchat',
    influencer: 'Influencer',
    other: 'Other',
  },
  fr: {
    title: 'Sources Publicitaires',
    addSource: 'Ajouter Source',
    name: 'Nom',
    slug: 'Slug',
    color: 'Couleur',
    status: 'Statut',
    actions: 'Actions',
    active: 'Actif',
    inactive: 'Inactif',
    edit: 'Modifier',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noSources: 'Aucune source trouvée',
    createSource: 'Créer Source',
    editSource: 'Modifier Source',
    save: 'Enregistrer',
    cancel: 'Annuler',
    icon: 'Icône',
    defaultSources: 'Sources par Défaut',
    customSources: 'Sources Personnalisées',
    facebook: 'Facebook',
    google: 'Google Ads',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    snapchat: 'Snapchat',
    influencer: 'Influenceur',
    other: 'Autre',
  },
};

// Predefined colors for sources
const sourceColors = [
  { name: 'Facebook Blue', value: '#1877F2' },
  { name: 'Google Red', value: '#EA4335' },
  { name: 'TikTok Black', value: '#000000' },
  { name: 'Instagram Pink', value: '#E4405F' },
  { name: 'Snapchat Yellow', value: '#FFFC00' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Rose', value: '#F43F5E' },
];

interface SourceFormData {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export default function MediaBuyingSourcesPage() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  
  const [sources, setSources] = useState<AdSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<AdSource | null>(null);
  const [formData, setFormData] = useState<SourceFormData>({
    name: '',
    slug: '',
    icon: '',
    color: '#8B5CF6',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await mediaBuyingService.getSources(true);
      setSources(data);
    } catch (err) {
      setError(t[language].error);
      console.error('Error loading sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSource(null);
    setFormData({
      name: '',
      slug: '',
      icon: '',
      color: '#8B5CF6',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (source: AdSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      slug: source.slug,
      icon: source.icon || '',
      color: source.color || '#8B5CF6',
      isActive: source.isActive,
    });
    setShowModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingSource ? formData.slug : generateSlug(name),
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (editingSource) {
        await mediaBuyingService.updateSource(editingSource.id, formData);
      } else {
        await mediaBuyingService.createSource(formData);
      }
      
      setShowModal(false);
      loadSources();
    } catch (err) {
      console.error('Error saving source:', err);
      alert('Error saving source');
    } finally {
      setSaving(false);
    }
  };

  const toggleSourceStatus = async (source: AdSource) => {
    try {
      await mediaBuyingService.updateSource(source.id, { isActive: !source.isActive });
      loadSources();
    } catch (err) {
      console.error('Error toggling source status:', err);
    }
  };

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;
  const canManage = user.role === 'ADMIN';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t[language].title}</h1>
          {canManage && (
            <Button
              onClick={openCreateModal}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t[language].addSource}
            </Button>
          )}
        </div>

        {/* Sources Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : sources.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <Megaphone className="w-12 h-12 mb-4 text-gray-300" />
              <p>{t[language].noSources}</p>
              {canManage && (
                <Button onClick={openCreateModal} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {t[language].addSource}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <Card 
                key={source.id} 
                className={`p-6 hover:shadow-lg transition-shadow ${!source.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: source.color || '#8B5CF6' }}
                    >
                      {source.icon || source.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{source.name}</h3>
                      <p className="text-sm text-gray-500">{source.slug}</p>
                    </div>
                  </div>
                  
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(source)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    source.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {source.isActive ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        {t[language].active}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        {t[language].inactive}
                      </>
                    )}
                  </span>
                  
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSourceStatus(source)}
                      className={source.isActive ? 'text-red-600' : 'text-green-600'}
                    >
                      {source.isActive ? t[language].inactive : t[language].active}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingSource ? t[language].editSource : t[language].createSource}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].name} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Facebook Ads"
                    required
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].slug} *
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="facebook_ads"
                    required
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t[language].icon}
                  </label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="FB"
                    maxLength={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1-2 characters to display in the icon
                  </p>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].color}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sourceColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          formData.color === color.value 
                            ? 'border-gray-900 scale-110' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-8 p-0 border-0"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.icon || formData.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="font-medium">{formData.name || 'Source Name'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {t[language].cancel}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !formData.name || !formData.slug}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? t[language].loading : t[language].save}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}