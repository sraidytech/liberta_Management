'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Database, AlertTriangle, CheckCircle, RotateCcw, Truck, Shield, Activity } from 'lucide-react';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface SyncPositionStatus {
  totalStores: number;
  healthyStores: number;
  problematicStores: number;
  stores: Array<{
    storeIdentifier: string;
    storeName: string;
    status: 'healthy' | 'missing' | 'reset' | 'calculated';
    lastPage: number;
    lastOrderId: number;
    source: string;
    timestamp: string;
  }>;
  insights: {
    cacheHealth: number;
    needsAttention: any[];
    recommendations: string[];
  };
}

export function DatabaseManagementSettings() {
  const [loading, setLoading] = useState<string | null>(null);
  const [syncPositionStatus, setSyncPositionStatus] = useState<SyncPositionStatus | null>(null);
  const [results, setResults] = useState<{ [key: string]: ApiResponse | null }>({
    deleteOrders: null,
    syncStores: null,
    cleanupAssignments: null,
    fullSync: null,
    syncShipping: null,
    restoreSyncPositions: null
  });

  // Load sync position status on component mount
  useEffect(() => {
    loadSyncPositionStatus();
  }, []);

  const loadSyncPositionStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/admin/sync-position-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = await response.json();
      if (result.success) {
        setSyncPositionStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load sync position status:', error);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (!confirm('Are you sure you want to delete ALL orders? This action cannot be undone.')) return;
    
    setLoading('deleteOrders');
    setResults(prev => ({ ...prev, deleteOrders: null }));
    
    try {
      const response = await fetch('/api/v1/orders/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = await response.json();
      setResults(prev => ({ ...prev, deleteOrders: result }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        deleteOrders: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleSyncStores = async () => {
    setLoading('syncStores');
    setResults(prev => ({ ...prev, syncStores: null }));
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/admin/sync-stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = await response.json();
      setResults(prev => ({ ...prev, syncStores: result }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        syncStores: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleCleanupAssignments = async () => {
    if (!confirm('Are you sure you want to cleanup ALL order assignments? This will remove ALL agent assignments from ALL orders in the system.')) return;
    
    setLoading('cleanupAssignments');
    setResults(prev => ({ ...prev, cleanupAssignments: null }));
    
    try {
      // Use the correct API URL - same pattern as other functions in this component
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/admin/cleanup-assignments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = await response.json();
      setResults(prev => ({ ...prev, cleanupAssignments: result }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        cleanupAssignments: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleFullSync = async () => {
    if (!confirm('Are you sure you want to perform a full sync? This will fetch ALL orders from all active stores and may take a long time.')) return;
    
    setLoading('fullSync');
    setResults(prev => ({ ...prev, fullSync: null }));
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/orders/sync-all-stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ fullSync: true })
      });
      
      const result = await response.json();
      setResults(prev => ({ ...prev, fullSync: result }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        fullSync: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleSyncShippingStatus = async () => {
    setLoading('syncShipping');
    setResults(prev => ({ ...prev, syncShipping: null }));
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/orders/sync-shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      setResults(prev => ({ ...prev, syncShipping: result }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        syncShipping: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  // 🚀 NEW: Handle restore sync positions
  const handleRestoreSyncPositions = async () => {
    if (!confirm('Are you sure you want to restore sync positions? This will fix Redis cache issues and prevent timeout problems during order sync.')) return;
    
    setLoading('restoreSyncPositions');
    setResults(prev => ({ ...prev, restoreSyncPositions: null }));
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/admin/restore-sync-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = await response.json();
      setResults(prev => ({ ...prev, restoreSyncPositions: result }));
      
      // Reload sync position status after restoration
      if (result.success) {
        await loadSyncPositionStatus();
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        restoreSyncPositions: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const renderResult = (key: string, result: ApiResponse | null) => {
    if (!result) return null;
    
    return (
      <div className={`mt-3 p-4 rounded-lg border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <div className={result.success ? 'text-green-800' : 'text-red-800'}>
            {result.message}
            {result.data && (
              <div className="mt-2 text-sm">
                {typeof result.data === 'object' ? (
                  <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded border">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                ) : result.data}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>;
      case 'missing':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Missing</Badge>;
      case 'reset':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Reset</Badge>;
      case 'calculated':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Calculated</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Database Management</h2>
        <p className="text-gray-600 mt-1">Manage database operations and system maintenance</p>
      </div>

      {/* 🚀 NEW: Sync Position Management */}
      <Card className="p-6 border-blue-200 bg-blue-50">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          🚀 Sync Position Management - REDIS CACHE FIX
        </h3>
        <p className="text-gray-700 mb-4">
          <strong>CRITICAL FIX:</strong> Restore sync positions when Redis cache is cleared. 
          This prevents the timeout issue where all stores reset to page 1 and try to fetch thousands of pages.
          The system uses JSON backups and database calculations to restore optimal starting pages.
        </p>
        
        {/* Sync Position Status Dashboard */}
        {syncPositionStatus && (
          <div className="mb-4 p-4 bg-white rounded-lg border">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Current Sync Position Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncPositionStatus.healthyStores}</div>
                <div className="text-sm text-gray-600">Healthy Stores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{syncPositionStatus.problematicStores}</div>
                <div className="text-sm text-gray-600">Need Attention</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(syncPositionStatus.insights.cacheHealth * 100)}%</div>
                <div className="text-sm text-gray-600">Cache Health</div>
              </div>
            </div>
            
            {/* Store Details */}
            <div className="space-y-2">
              {syncPositionStatus.stores.map((store) => (
                <div key={store.storeIdentifier} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{store.storeName}</span>
                    {getStatusBadge(store.status)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Page: {store.lastPage} | Last ID: {store.lastOrderId} | Source: {store.source.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Recommendations */}
            {syncPositionStatus.insights.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h5 className="font-medium text-yellow-800 mb-2">Recommendations:</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {syncPositionStatus.insights.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-3">
          <Button
            onClick={handleRestoreSyncPositions}
            disabled={loading === 'restoreSyncPositions'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading === 'restoreSyncPositions' ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Restoring Positions...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Restore Sync Positions
              </>
            )}
          </Button>
          
          <Button
            onClick={loadSyncPositionStatus}
            variant="outline"
            disabled={loading !== null}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>
        {renderResult('restoreSyncPositions', results.restoreSyncPositions)}
      </Card>

      {/* Order Management */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-600" />
          Order Management
        </h3>
        <p className="text-gray-600 mb-4">Delete all orders from the system. This action cannot be undone. [UPDATED API ENDPOINT]</p>
        <Button
          onClick={handleDeleteAllOrders}
          disabled={loading === 'deleteOrders'}
          variant="destructive"
          className="w-full sm:w-auto"
        >
          {loading === 'deleteOrders' ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Deleting Orders...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Orders
            </>
          )}
        </Button>
        {renderResult('deleteOrders', results.deleteOrders)}
      </Card>

      {/* Store Synchronization */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          Store Synchronization
        </h3>
        <p className="text-gray-600 mb-4">Synchronize stores from EcoManager system.</p>
        <Button
          onClick={handleSyncStores}
          disabled={loading === 'syncStores'}
          className="w-full sm:w-auto"
        >
          {loading === 'syncStores' ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing Stores...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Stores from EcoManager
            </>
          )}
        </Button>
        {renderResult('syncStores', results.syncStores)}
      </Card>

      {/* Assignment Cleanup */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-orange-600" />
          Assignment Cleanup - OPTIMIZED
        </h3>
        <p className="text-gray-600 mb-4">Clean up ALL order assignments from ALL orders in the system and reset agent workloads. Perfect for testing the new optimized assignment system which will then work only with the last 15,000 orders.</p>
        <Button
          onClick={handleCleanupAssignments}
          disabled={loading === 'cleanupAssignments'}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {loading === 'cleanupAssignments' ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Cleaning Assignments...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Cleanup Order Assignments
            </>
          )}
        </Button>
        {renderResult('cleanupAssignments', results.cleanupAssignments)}
      </Card>

      {/* Full Sync Orders */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-gray-600" />
          Full Order Synchronization
        </h3>
        <p className="text-gray-600 mb-4">Perform a complete synchronization of ALL orders from all active EcoManager stores. This may take a long time and should be used sparingly.</p>
        <Button
          onClick={handleFullSync}
          disabled={loading === 'fullSync'}
          variant="outline"
          className="w-full sm:w-auto bg-gray-50 hover:bg-gray-100"
        >
          {loading === 'fullSync' ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Full Syncing...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Full Sync All Orders
            </>
          )}
        </Button>
        {renderResult('fullSync', results.fullSync)}
      </Card>

      {/* Sync Shipping Status */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-purple-600" />
          Shipping Status Synchronization
        </h3>
        <p className="text-gray-600 mb-4">Synchronize shipping status updates from Maystro delivery service for all orders with tracking numbers.</p>
        <Button
          onClick={handleSyncShippingStatus}
          disabled={loading === 'syncShipping'}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
        >
          {loading === 'syncShipping' ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing Shipping...
            </>
          ) : (
            <>
              <Truck className="mr-2 h-4 w-4" />
              Sync Shipping Status
            </>
          )}
        </Button>
        {renderResult('syncShipping', results.syncShipping)}
      </Card>

      {/* Warning Notice */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold mb-3 text-yellow-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          ⚠️ Warning
        </h3>
        <div className="text-yellow-800">
          <strong>Important:</strong> These operations affect production data and cannot be undone.
          Make sure you have proper backups before performing any destructive operations.
        </div>
      </Card>
    </div>
  );
}
