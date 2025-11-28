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
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Video,
  MessageCircle,
  Users,
  Layers,
  Smartphone
} from 'lucide-react';

// Inline translations
const t = {
  en: {
    title: 'Ad Sources',
    subtitle: 'Manage your advertising platforms and traffic sources',
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
    createSource: 'Create New Source',
    editSource: 'Edit Source',
    save: 'Save Changes',
    cancel: 'Cancel',
    icon: 'Icon',
    defaultSources: 'Default Sources',
    customSources: 'Custom Sources',
    searchPlaceholder: 'Search sources...',
    activeSources: 'Active Sources',
    totalSources: 'Total Sources',
  },
  fr: {
    title: 'Sources Publicitaires',
    subtitle: 'Gérez vos plateformes publicitaires et sources de trafic',
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
    createSource: 'Créer Nouvelle Source',
    editSource: 'Modifier Source',
    save: 'Enregistrer',
    cancel: 'Annuler',
    icon: 'Icône',
    defaultSources: 'Sources par Défaut',
    customSources: 'Sources Personnalisées',
    searchPlaceholder: 'Rechercher des sources...',
    activeSources: 'Sources Actives',
    totalSources: 'Total Sources',
  },
};

// Predefined colors for sources with gradients
const sourceColors = [
  { name: 'Facebook Blue', value: '#1877F2', gradient: 'from-blue-500 to-blue-600' },
  { name: 'Google Red', value: '#EA4335', gradient: 'from-red-500 to-red-600' },
  { name: 'TikTok Black', value: '#000000', gradient: 'from-gray-800 to-black' },
  { name: 'Instagram Pink', value: '#E4405F', gradient: 'from-pink-500 to-rose-500' },
  { name: 'Snapchat Yellow', value: '#FFFC00', gradient: 'from-yellow-300 to-yellow-400' },
  { name: 'Purple', value: '#8B5CF6', gradient: 'from-purple-500 to-purple-600' },
  { name: 'Green', value: '#10B981', gradient: 'from-emerald-400 to-emerald-600' },
  { name: 'Orange', value: '#F97316', gradient: 'from-orange-400 to-orange-600' },
  { name: 'Cyan', value: '#06B6D4', gradient: 'from-cyan-400 to-cyan-600' },
  { name: 'Rose', value: '#F43F5E', gradient: 'from-rose-400 to-rose-600' },
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const getSourceIcon = (source: AdSource) => {
    const slug = source.slug.toLowerCase();
    const name = source.name.toLowerCase();

    if (slug.includes('facebook') || name.includes('facebook')) return <Facebook className="w-10 h-10" />;
    if (slug.includes('instagram') || name.includes('instagram')) return <Instagram className="w-10 h-10" />;
    if (slug.includes('twitter') || name.includes('twitter') || slug.includes('x')) return <Twitter className="w-10 h-10" />;
    if (slug.includes('linkedin') || name.includes('linkedin')) return <Linkedin className="w-10 h-10" />;
    if (slug.includes('youtube') || name.includes('youtube')) return <Youtube className="w-10 h-10" />;
    if (slug.includes('tiktok') || name.includes('tiktok')) return <Video className="w-10 h-10" />;
    if (slug.includes('snapchat') || name.includes('snapchat')) return <MessageCircle className="w-10 h-10" />;
    if (slug.includes('google') || name.includes('google')) return <Search className="w-10 h-10" />;
    if (slug.includes('influencer') || name.includes('influencer')) return <Users className="w-10 h-10" />;

    return <Layers className="w-10 h-10" />;
  };

  const filteredSources = sources.filter(source =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = sources.filter(s => s.isActive).length;

  // Wait for auth to load
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const Layout = user.role === 'MEDIA_BUYER' ? MediaBuyerLayout : AdminLayout;
  const canManage = user.role === 'ADMIN';

  return (
    <Layout>
      <div className="space-y-8 w-full pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{t[language].title}</h1>
            <p className="text-gray-500 mt-2 text-lg">{t[language].subtitle}</p>
          </div>
          {canManage && (
            <Button
              onClick={openCreateModal}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 rounded-xl px-6 py-6 h-auto text-base transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t[language].addSource}
            </Button>
          )}
        </div>

        {/* Stats & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-1 bg-white/70 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl overflow-hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t[language].searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 text-base"
              />
            </div>
          </Card>

          <Card className="p-4 bg-white/70 backdrop-blur-xl border-white/20 shadow-xl rounded-2xl flex items-center justify-between px-8">
            <div>
              <p className="text-sm text-gray-500 font-medium">{t[language].activeSources}</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount} <span className="text-gray-400 text-lg font-normal">/ {sources.length}</span></p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Sources Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500 bg-red-50 rounded-2xl">
            {error}
          </div>
        ) : filteredSources.length === 0 ? (
          <Card className="p-16 bg-white/50 backdrop-blur-sm border-dashed border-2 border-gray-200 shadow-none">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Megaphone className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t[language].noSources}</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                No advertising sources found matching your criteria. Add a new source to get started.
              </p>
              {canManage && (
                <Button onClick={openCreateModal} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                  <Plus className="w-4 h-4 mr-2" />
                  {t[language].addSource}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSources.map((source) => (
              <div
                key={source.id}
                className={`group relative bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 ${!source.isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-gray-100"
                      onClick={() => openEditModal(source)}
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: source.color || '#8B5CF6' }}
                  >
                    {getSourceIcon(source)}
                  </div>

                  <h3 className="font-bold text-xl text-gray-900 mb-1">{source.name}</h3>
                  <p className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full mb-6">
                    {source.slug}
                  </p>

                  <div className="w-full pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${source.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${source.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {source.isActive ? t[language].active : t[language].inactive}
                    </span>

                    {canManage && (
                      <button
                        onClick={() => toggleSourceStatus(source)}
                        className={`text-xs font-medium transition-colors ${source.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                          }`}
                      >
                        {source.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSource ? t[language].editSource : t[language].createSource}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full hover:bg-gray-200/50">
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </div>

              <div className="p-8 space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    {t[language].name} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Facebook Ads"
                    className="h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    {t[language].slug} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. facebook_ads"
                    className="h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Icon */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">
                      {t[language].icon}
                    </label>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="FB"
                      maxLength={2}
                      className="h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500 text-center uppercase font-bold"
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">
                      {t[language].color}
                    </label>
                    <div className="flex items-center gap-2 h-12">
                      <div className="relative w-full h-full">
                        <Input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="absolute inset-0 w-full h-full p-1 rounded-xl cursor-pointer opacity-0 z-10"
                        />
                        <div
                          className="w-full h-full rounded-xl border border-gray-200 flex items-center justify-center font-mono text-sm font-medium shadow-sm"
                          style={{ backgroundColor: formData.color, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                        >
                          {formData.color}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                    Presets
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {sourceColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-10 h-10 rounded-full border-2 transition-all transform hover:scale-110 ${formData.color === color.value
                            ? 'border-gray-900 scale-110 shadow-md'
                            : 'border-transparent'
                          }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-100 flex items-center justify-center">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all duration-300"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.icon || formData.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{formData.name || 'Source Name'}</h4>
                      <p className="text-sm text-gray-500">{formData.slug || 'source_slug'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-8 py-6 border-t border-gray-100 bg-gray-50/50">
                <Button variant="outline" onClick={() => setShowModal(false)} className="h-12 px-6 rounded-xl border-gray-200">
                  {t[language].cancel}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.slug}
                  className="bg-purple-600 hover:bg-purple-700 h-12 px-8 rounded-xl shadow-lg shadow-purple-200"
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