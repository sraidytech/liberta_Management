'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Database, AlertTriangle, CheckCircle, RotateCcw, Truck } from 'lucide-react';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export function DatabaseManagementSettings() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<{ [key: string]: ApiResponse | null }>({
    deleteOrders: null,
    syncStores: null,
    cleanupAssignments: null,
    fullSync: null,
    syncShipping: null
  });

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
                {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Database Management</h2>
        <p className="text-gray-600 mt-1">Manage database operations and system maintenance</p>
      </div>

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
        <p className="text-gray-600 mb-4">Synchronize shipping status updates from Maystro delivery service for the last 40,000 orders with tracking numbers.</p>
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
