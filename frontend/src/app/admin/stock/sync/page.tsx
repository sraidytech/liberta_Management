'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Database, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SyncStats {
  totalOrderItems: number;
  uniqueSKUs: number;
  productsInStock: number;
  unmatchedSKUs: number;
}

export default function ProductSyncPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: number } | null>(null);

  const t = {
    en: {
      title: 'Product Sync',
      subtitle: 'Auto-sync products from Order Items',
      loading: 'Loading statistics...',
      stats: 'Sync Statistics',
      totalOrderItems: 'Total Order Items',
      uniqueSKUs: 'Unique SKUs',
      productsInStock: 'Products in Stock System',
      unmatchedSKUs: 'Unmatched SKUs',
      unmatchedDesc: 'Order items without corresponding products',
      syncNow: 'Sync All Order Items',
      syncing: 'Syncing...',
      refreshStats: 'Refresh Statistics',
      lastSync: 'Last Sync Result',
      created: 'Created',
      skipped: 'Skipped',
      errors: 'Errors',
      syncSuccess: 'Sync completed successfully!',
      syncError: 'Sync failed. Please try again.',
      description: 'This tool automatically creates Product records from Order Items. Products are matched by SKU. If a product with the same SKU already exists, it will be skipped.',
      warning: 'Note: This operation may take a few minutes for large datasets.',
      howItWorks: 'How it works:',
      step1: '1. Scans all Order Items with SKUs',
      step2: '2. Checks if Product exists for each SKU',
      step3: '3. Creates new Products for unmatched SKUs',
      step4: '4. Auto-categorizes based on product name',
      step5: '5. Sets default stock thresholds'
    },
    fr: {
      title: 'Synchronisation des Produits',
      subtitle: 'Synchronisation automatique des produits depuis les articles de commande',
      loading: 'Chargement des statistiques...',
      stats: 'Statistiques de Synchronisation',
      totalOrderItems: 'Total des Articles de Commande',
      uniqueSKUs: 'SKUs Uniques',
      productsInStock: 'Produits dans le Système de Stock',
      unmatchedSKUs: 'SKUs Non Correspondants',
      unmatchedDesc: 'Articles de commande sans produits correspondants',
      syncNow: 'Synchroniser Tous les Articles',
      syncing: 'Synchronisation...',
      refreshStats: 'Actualiser les Statistiques',
      lastSync: 'Résultat de la Dernière Synchronisation',
      created: 'Créés',
      skipped: 'Ignorés',
      errors: 'Erreurs',
      syncSuccess: 'Synchronisation terminée avec succès!',
      syncError: 'Échec de la synchronisation. Veuillez réessayer.',
      description: 'Cet outil crée automatiquement des enregistrements de produits à partir des articles de commande. Les produits sont associés par SKU. Si un produit avec le même SKU existe déjà, il sera ignoré.',
      warning: 'Note: Cette opération peut prendre quelques minutes pour les grands ensembles de données.',
      howItWorks: 'Comment ça marche:',
      step1: '1. Analyse tous les articles de commande avec des SKUs',
      step2: '2. Vérifie si le produit existe pour chaque SKU',
      step3: '3. Crée de nouveaux produits pour les SKUs non correspondants',
      step4: '4. Catégorise automatiquement selon le nom du produit',
      step5: '5. Définit les seuils de stock par défaut'
    }
  };

  const text = t[language as keyof typeof t];

  useEffect(() => {
    if (!authLoading && user) {
      loadStats();
    }
  }, [authLoading, user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/v1/stock/sync/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const json = await response.json();
      setStats(json.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!confirm('Are you sure you want to sync all order items? This may take a few minutes.')) {
      return;
    }

    try {
      setSyncing(true);
      setSyncResult(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/v1/stock/sync/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to sync');
      const json = await response.json();
      setSyncResult(json.data);
      alert(text.syncSuccess);
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to sync:', error);
      alert(text.syncError);
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2">{text.loading}</span>
        </div>
      </AdminLayout>
    );
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEAM_MANAGER')) {
    router.push('/dashboard');
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{text.title}</h1>
          <p className="text-gray-600 mt-2">{text.subtitle}</p>
        </div>

        {/* Description */}
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Database className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-700 mb-3">{text.description}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{text.warning}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium">{text.howItWorks}</p>
                <p>{text.step1}</p>
                <p>{text.step2}</p>
                <p>{text.step3}</p>
                <p>{text.step4}</p>
                <p>{text.step5}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{text.totalOrderItems}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrderItems.toLocaleString()}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{text.uniqueSKUs}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.uniqueSKUs.toLocaleString()}</p>
                </div>
                <Database className="w-8 h-8 text-purple-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{text.productsInStock}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.productsInStock.toLocaleString()}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6 bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">{text.unmatchedSKUs}</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.unmatchedSKUs.toLocaleString()}</p>
                  <p className="text-xs text-orange-600 mt-1">{text.unmatchedDesc}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </Card>
          </div>
        )}

        {/* Last Sync Result */}
        {syncResult && (
          <Card className="p-6 mb-6 bg-green-50 border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{text.lastSync}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">{text.created}</p>
                <p className="text-2xl font-bold text-green-600">{syncResult.synced}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{text.skipped}</p>
                <p className="text-2xl font-bold text-gray-600">{syncResult.skipped}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{text.errors}</p>
                <p className="text-2xl font-bold text-red-600">{syncResult.errors}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handleSync}
            disabled={syncing || (stats?.unmatchedSKUs === 0)}
            className="flex-1"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {text.syncing}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {text.syncNow}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={loadStats}
            disabled={loading || syncing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {text.refreshStats}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}