'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MaystroApiKey {
  id: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  lastUsed?: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  lastTestAt?: string;
  lastTestStatus?: 'success' | 'error';
  lastTestError?: string;
}

export function MaystroApiSettings() {
  const [apiKeys, setApiKeys] = useState<MaystroApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/scheduler/maystro-api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const transformedKeys: MaystroApiKey[] = data.data.map((key: any) => ({
          id: key.id,
          name: key.name,
          isActive: key.isActive,
          isPrimary: key.isPrimary,
          lastUsed: key.lastUsed,
          requestCount: key.requestCount,
          successCount: key.successCount,
          errorCount: key.errorCount,
          lastTestAt: key.lastTestAt,
          lastTestStatus: key.lastTestStatus,
          lastTestError: key.lastTestError
        }));
        setApiKeys(transformedKeys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (keyId: string) => {
    setTestingKey(keyId);
    try {
      const response = await fetch(`/api/v1/scheduler/test-maystro-key/${keyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const testResult = data.data;
        
        setApiKeys(prev => prev.map(key => 
          key.id === keyId 
            ? { 
                ...key, 
                lastTestAt: new Date().toISOString(),
                lastTestStatus: testResult.success ? 'success' as const : 'error' as const,
                lastTestError: testResult.error
              }
            : key
        ));
      }
    } catch (error) {
      setApiKeys(prev => prev.map(key => 
        key.id === keyId 
          ? { 
              ...key, 
              lastTestAt: new Date().toISOString(),
              lastTestStatus: 'error' as const,
              lastTestError: 'Connection test failed'
            }
          : key
      ));
    } finally {
      setTestingKey(null);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getSuccessRate = (key: MaystroApiKey) => {
    if (key.requestCount === 0) return 0;
    return Math.round((key.successCount / key.requestCount) * 100);
  };

  const getStatusBadge = (status?: 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Connected</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500">Untested</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading API configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Service Integration</h2>
          <p className="text-gray-600 mt-1">Monitor and manage delivery service API connections</p>
        </div>
      </div>

      {/* API Keys Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{apiKeys.length}</div>
            <div className="text-sm text-gray-600">Configured APIs</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {apiKeys.filter(key => key.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Active Connections</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {apiKeys.reduce((total, key) => total + key.requestCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>
        </Card>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((key) => (
          <Card key={key.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold">{key.name}</h3>
                  {key.isPrimary && <Badge className="bg-blue-500">Primary</Badge>}
                  <Badge className={key.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                    {key.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {getStatusBadge(key.lastTestStatus)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Used</label>
                    <div className="text-sm">{formatDateTime(key.lastUsed)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Success Rate</label>
                    <div className="text-sm">
                      {getSuccessRate(key)}% ({key.successCount}/{key.requestCount})
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Test</label>
                    <div className="text-sm">{formatDateTime(key.lastTestAt)}</div>
                  </div>
                </div>

                {/* Usage Statistics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-xl font-bold text-blue-600">{key.requestCount}</div>
                    <div className="text-xs text-blue-700">Total Requests</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-xl font-bold text-green-600">{key.successCount}</div>
                    <div className="text-xs text-green-700">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-xl font-bold text-red-600">{key.errorCount}</div>
                    <div className="text-xs text-red-700">Errors</div>
                  </div>
                </div>

                {/* Last Test Results */}
                {key.lastTestError && key.lastTestStatus === 'error' && (
                  <div className="mb-4 p-3 bg-red-50 rounded">
                    <label className="text-sm font-medium text-red-700">Connection Issue</label>
                    <div className="text-sm text-red-600 mt-1">{key.lastTestError}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 ml-4">
                <Button
                  onClick={() => handleTestConnection(key.id)}
                  disabled={testingKey === key.id}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {testingKey === key.id ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {apiKeys.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="text-lg font-semibold mb-2">No API Connections Configured</h3>
            <p className="mb-4">Contact your system administrator to configure delivery service integrations.</p>
          </div>
        </Card>
      )}

      {/* Configuration Information */}
      <Card className="p-6 bg-blue-50">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">🔧 Configuration Management</h3>
        <div className="text-blue-800 space-y-2">
          <p>• API connections are managed through secure environment configuration</p>
          <p>• Multiple API keys provide redundancy and load balancing</p>
          <p>• Connection health is monitored automatically</p>
          <p>• Contact your system administrator for configuration changes</p>
        </div>
      </Card>
    </div>
  );
}