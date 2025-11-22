'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/language-context';
import { Plus, Edit, Trash2, Power, PowerOff, TestTube, RefreshCw, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/admin/admin-layout';

interface ShippingCompany {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface ShippingAccount {
  id: string;
  name: string;
  companyId: string;
  company: ShippingCompany;
  isActive: boolean;
  isPrimary: boolean;
  hasCredentials: boolean;
  requestCount: number;
  successCount: number;
  errorCount: number;
  lastUsed: string | null;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  createdAt: string;
}

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
  shippingAccountId: string | null;
  shippingAccount: ShippingAccount | null;
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
  shippingAccountId: string;
}

interface ShippingAccountFormData {
  name: string;
  companyId: string;
  credentials: {
    apiKey?: string;
    apiId?: string;
    apiToken?: string;
    userGuid?: string;
  };
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
    baseUrl: '',
    shippingAccountId: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingStores, setSyncingStores] = useState<Set<string>>(new Set());
  
  // Shipping accounts state
  const [shippingAccounts, setShippingAccounts] = useState<ShippingAccount[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);
  const [showShippingAccountForm, setShowShippingAccountForm] = useState(false);
  const [editingShippingAccount, setEditingShippingAccount] = useState<ShippingAccount | null>(null);
  const [shippingAccountFormData, setShippingAccountFormData] = useState<ShippingAccountFormData>({
    name: '',
    companyId: '',
    credentials: {},
    baseUrl: ''
  });
  const [shippingAccountFormLoading, setShippingAccountFormLoading] = useState(false);
  const [testingShippingConnection, setTestingShippingConnection] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchShippingCompanies();
    fetchShippingAccounts();
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

  const fetchShippingCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('🔍 Fetching shipping companies from:', `${apiUrl}/api/v1/shipping/companies`);
      
      const response = await fetch(`${apiUrl}/api/v1/shipping/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Shipping companies data:', data);
        setShippingCompanies(data.data);
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to fetch shipping companies:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching shipping companies:', error);
    }
  };

  const fetchShippingAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/shipping/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShippingAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching shipping accounts:', error);
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
      baseUrl: store.baseUrl,
      shippingAccountId: store.shippingAccountId || ''
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

  const handleSyncStore = async (store: Store, fullSync: boolean = false) => {
    setSyncingStores(prev => new Set(prev).add(store.id));

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/stores/${store.id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fullSync })
      });

      if (response.ok) {
        const result = await response.json();
        const syncData = result.data;
        
        // Show detailed success message
        const message = `✅ Sync completed for ${store.storeName}!\n\n` +
          `📊 Results:\n` +
          `• Orders Synced: ${syncData.syncedCount || 0}\n` +
          `• Total Fetched: ${syncData.totalFetched || 0}\n` +
          `• Errors: ${syncData.errorCount || 0}\n` +
          `• Duration: ${((syncData.duration || 0) / 1000).toFixed(1)}s\n` +
          `• Sync Type: ${syncData.syncType || 'incremental'}`;
        
        alert(message);
        await fetchStores(); // Refresh store data
      } else {
        const error = await response.json();
        alert(`❌ Sync failed for ${store.storeName}:\n\n${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error syncing store:', error);
      alert(`❌ Sync failed for ${store.storeName}:\n\nNetwork error or server unavailable`);
    } finally {
      setSyncingStores(prev => {
        const newSet = new Set(prev);
        newSet.delete(store.id);
        return newSet;
      });
    }
  };

  const handleSubmitShippingAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setShippingAccountFormLoading(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const url = editingShippingAccount
        ? `${apiUrl}/api/v1/shipping/accounts/${editingShippingAccount.id}`
        : `${apiUrl}/api/v1/shipping/accounts`;
      const method = editingShippingAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shippingAccountFormData)
      });

      if (response.ok) {
        await fetchShippingAccounts();
        await fetchStores();
        resetShippingAccountForm();
        alert(editingShippingAccount ? 'Shipping account updated!' : 'Shipping account created!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save shipping account');
      }
    } catch (error) {
      console.error('Error saving shipping account:', error);
      alert('Failed to save shipping account');
    } finally {
      setShippingAccountFormLoading(false);
    }
  };

  const handleTestShippingConnection = async (accountId?: string) => {
    setTestingShippingConnection(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      if (accountId) {
        // Test existing account
        const response = await fetch(`${apiUrl}/api/v1/shipping/accounts/${accountId}/test`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          alert('✅ Connection test successful!');
          await fetchShippingAccounts();
        } else {
          const error = await response.json();
          alert(`❌ Connection test failed:\n${error.message || 'Unknown error'}`);
        }
      } else {
        // Test new account credentials
        const response = await fetch(`${apiUrl}/api/v1/shipping/accounts/test-credentials`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(shippingAccountFormData)
        });

        if (response.ok) {
          alert('✅ Connection test successful!');
        } else {
          const error = await response.json();
          alert(`❌ Connection test failed:\n${error.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error testing shipping connection:', error);
      alert('❌ Connection test failed: Network error');
    } finally {
      setTestingShippingConnection(false);
    }
  };

  const handleDeleteShippingAccount = async (account: ShippingAccount) => {
    if (!confirm(`Are you sure you want to delete "${account.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/shipping/accounts/${account.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchShippingAccounts();
        await fetchStores();
        alert('Shipping account deleted!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete shipping account');
      }
    } catch (error) {
      console.error('Error deleting shipping account:', error);
      alert('Failed to delete shipping account');
    }
  };

  const handleLinkShippingAccount = async (storeId: string, shippingAccountId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/stores/${storeId}/shipping-account`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shippingAccountId })
      });

      if (response.ok) {
        await fetchStores();
        alert('Shipping account linked successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to link shipping account');
      }
    } catch (error) {
      console.error('Error linking shipping account:', error);
      alert('Failed to link shipping account');
    }
  };

  const resetForm = () => {
    setFormData({
      storeName: '',
      storeIdentifier: '',
      apiToken: '',
      baseUrl: '',
      shippingAccountId: ''
    });
    setEditingStore(null);
    setShowForm(false);
  };

  const resetShippingAccountForm = () => {
    setShippingAccountFormData({
      name: '',
      companyId: '',
      credentials: {},
      baseUrl: ''
    });
    setEditingShippingAccount(null);
    setShowShippingAccountForm(false);
  };

  const getCredentialFields = (companySlug: string) => {
    const company = shippingCompanies.find(c => c.id === shippingAccountFormData.companyId);
    if (!company) return [];

    switch (company.slug) {
      case 'maystro':
        return [{ key: 'apiKey', label: 'API Key', type: 'password' }];
      case 'guepex':
        return [
          { key: 'apiId', label: 'API ID', type: 'text' },
          { key: 'apiToken', label: 'API Token', type: 'password' }
        ];
      case 'nord_west':
        return [
          { key: 'apiToken', label: 'API Token', type: 'password' },
          { key: 'userGuid', label: 'User GUID', type: 'text' }
        ];
      default:
        return [];
    }
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
          <p className="text-gray-600 mt-2">Manage your EcoManager API store configurations and shipping accounts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowShippingAccountForm(true)} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Shipping Account
          </Button>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Store
          </Button>
        </div>
      </div>

      {/* Shipping Accounts Section */}
      {shippingAccounts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🚚 Shipping Accounts</CardTitle>
            <CardDescription>
              Manage shipping company accounts for order delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {shippingAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{account.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.company.slug === 'maystro' ? 'bg-blue-100 text-blue-800' :
                        account.company.slug === 'guepex' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {account.company.name}
                      </span>
                      {account.isPrimary && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Primary
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 grid grid-cols-3 gap-4">
                      <div>
                        <span className="font-medium">Requests:</span> {account.requestCount}
                      </div>
                      <div>
                        <span className="font-medium">Success Rate:</span>{' '}
                        {account.requestCount > 0
                          ? `${((account.successCount / account.requestCount) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Last Test:</span>{' '}
                        {account.lastTestAt ? (
                          <span className={account.lastTestStatus === 'success' ? 'text-green-600' : 'text-red-600'}>
                            {formatDate(account.lastTestAt)} ({account.lastTestStatus})
                          </span>
                        ) : 'Never'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestShippingConnection(account.id)}
                      disabled={testingShippingConnection}
                      className="flex items-center gap-1"
                    >
                      <TestTube className="h-4 w-4" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteShippingAccount(account)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Account Form Modal */}
      {showShippingAccountForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingShippingAccount ? 'Edit Shipping Account' : 'Add New Shipping Account'}</CardTitle>
            <CardDescription>
              Configure shipping company API credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitShippingAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={shippingAccountFormData.name}
                    onChange={(e) => setShippingAccountFormData({ ...shippingAccountFormData, name: e.target.value })}
                    placeholder="e.g., Maystro Primary Account"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="shippingCompany">Shipping Company</Label>
                  <select
                    id="shippingCompany"
                    value={shippingAccountFormData.companyId}
                    onChange={(e) => setShippingAccountFormData({
                      ...shippingAccountFormData,
                      companyId: e.target.value,
                      credentials: {}
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">Select Company</option>
                    {shippingCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {shippingAccountFormData.companyId && (
                <>
                  <div>
                    <Label htmlFor="accountBaseUrl">Base URL (Optional)</Label>
                    <Input
                      id="accountBaseUrl"
                      value={shippingAccountFormData.baseUrl}
                      onChange={(e) => setShippingAccountFormData({ ...shippingAccountFormData, baseUrl: e.target.value })}
                      placeholder="Leave empty for default URL"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>API Credentials</Label>
                    {getCredentialFields(shippingAccountFormData.companyId).map((field) => (
                      <div key={field.key}>
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Input
                          id={field.key}
                          type={field.type}
                          value={(shippingAccountFormData.credentials as any)[field.key] || ''}
                          onChange={(e) => setShippingAccountFormData({
                            ...shippingAccountFormData,
                            credentials: {
                              ...shippingAccountFormData.credentials,
                              [field.key]: e.target.value
                            }
                          })}
                          placeholder={`Enter ${field.label}`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTestShippingConnection()}
                  disabled={testingShippingConnection || !shippingAccountFormData.companyId}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testingShippingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button type="submit" disabled={shippingAccountFormLoading}>
                  {shippingAccountFormLoading ? 'Saving...' : editingShippingAccount ? 'Update Account' : 'Create Account'}
                </Button>
                <Button type="button" variant="outline" onClick={resetShippingAccountForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                  placeholder="e.g., https://alphalab.ecomanager.dz (without /api/shop/v2)"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter your store's EcoManager domain. The API path will be added automatically.
                </p>
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

              <div>
                <Label htmlFor="storeShippingAccount">Shipping Account (Optional)</Label>
                <select
                  id="storeShippingAccount"
                  value={formData.shippingAccountId}
                  onChange={(e) => setFormData({ ...formData, shippingAccountId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">No shipping account</option>
                  {shippingAccounts.filter(a => a.isActive).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.company.name})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Link this store to a shipping account for order delivery
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.storeName || !formData.apiToken || !formData.baseUrl}
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

                    {store.shippingAccount && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">🚚 Shipping:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          store.shippingAccount.company.slug === 'maystro' ? 'bg-blue-100 text-blue-800' :
                          store.shippingAccount.company.slug === 'guepex' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {store.shippingAccount.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncStore(store)}
                      disabled={syncingStores.has(store.id) || !store.isActive}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                      title={!store.isActive ? 'Store must be active to sync' : 'Sync new orders for this store'}
                    >
                      {syncingStores.has(store.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Sync Orders
                        </>
                      )}
                    </Button>

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
