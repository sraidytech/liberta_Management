'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/language-context';
import { Plus, Edit, Trash2, Power, PowerOff, TestTube } from 'lucide-react';
import AdminLayout from '@/components/admin/admin-layout';

interface Store {
  id: string;
  storeName: string;
  storeIdentifier: string;
  apiToken: string;
  baseUrl: string;
  isActive: boolean;
  requestCount: number;
  lastUsed: string | null;
  totalOrders: number;
  lastSyncTime: string | null;
  lastOrderDate: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface StoreFormData {
  storeName: string;
  storeIdentifier: string;
  apiToken: string;
  baseUrl: string;
}

export default function StoresPage() {
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    storeName: '',
    storeIdentifier: '',
    apiToken: '',
    baseUrl: 'https://natureldz.ecomanager.dz'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/stores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStores(data.data);
      } else {
        console.error('Failed to fetch stores:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Response body:', errorText);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const url = editingStore ? `${apiUrl}/api/v1/stores/${editingStore.id}` : `${apiUrl}/api/v1/stores`;
      const method = editingStore ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchStores();
        resetForm();
        alert(editingStore ? 'Store updated successfully!' : 'Store created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save store');
      }
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Failed to save store');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      storeName: store.storeName,
      storeIdentifier: store.storeIdentifier,
      apiToken: store.apiToken,
      baseUrl: store.baseUrl
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (store: Store) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/stores/${store.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchStores();
        alert(`Store ${store.isActive ? 'deactivated' : 'activated'} successfully!`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to toggle store status');
      }
    } catch (error) {
      console.error('Error toggling store status:', error);
      alert('Failed to toggle store status');
    }
  };

  const handleDelete = async (store: Store) => {
    if (!confirm(`Are you sure you want to delete "${store.storeName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/stores/${store.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchStores();
        alert('Store deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete store');
      }
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Failed to delete store');
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/stores/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Connection test successful!');
      } else {
        const error = await response.json();
        alert(error.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const resetForm = () => {
    setFormData({
      storeName: '',
      storeIdentifier: '',
      apiToken: '',
      baseUrl: 'https://natureldz.ecomanager.dz'
    });
    setEditingStore(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('loadingStores')}</div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Store Management</h1>
          <p className="text-gray-600 mt-2">Manage your EcoManager API store configurations</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Store
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingStore ? 'Edit Store' : 'Add New Store'}</CardTitle>
            <CardDescription>
              Configure your EcoManager API connection settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="e.g., NATU Store"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="storeIdentifier">Store Identifier</Label>
                  <Input
                    id="storeIdentifier"
                    value={formData.storeIdentifier}
                    onChange={(e) => setFormData({ ...formData, storeIdentifier: e.target.value })}
                    placeholder="e.g., NATU"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://natureldz.ecomanager.dz/api/shop/v2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="apiToken">API Token</Label>
                <Input
                  id="apiToken"
                  type="password"
                  value={formData.apiToken}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                  placeholder={t('enterEcoManagerToken')}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.storeName || !formData.apiToken}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testingConnection ? t('testing') : t('testConnection')}
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? t('savingChanges') : editingStore ? t('updateStore') : t('createStore')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {stores.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No stores configured yet. Add your first store to get started.</p>
            </CardContent>
          </Card>
        ) : (
          stores.map((store) => (
            <Card key={store.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{store.storeName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        store.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {store.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Identifier:</span> {store.storeIdentifier}
                      </div>
                      <div>
                        <span className="font-medium">Total Orders:</span> {store.totalOrders}
                      </div>
                      <div>
                        <span className="font-medium">Last Sync:</span> {formatDate(store.lastSyncTime)}
                      </div>
                      <div>
                        <span className="font-medium">API Requests:</span> {store.requestCount}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Base URL:</span> {store.baseUrl}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(store)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(store)}
                      className={`flex items-center gap-1 ${
                        store.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {store.isActive ? (
                        <>
                          <PowerOff className="h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(store)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </AdminLayout>
  );
}
