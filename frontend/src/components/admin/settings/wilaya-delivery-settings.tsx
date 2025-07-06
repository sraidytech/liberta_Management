'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  MapPin,
  Clock,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface WilayaSetting {
  id: string;
  wilayaName: string;
  maxDeliveryDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function WilayaDeliverySettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<WilayaSetting[]>([]);
  const [uniqueWilayas, setUniqueWilayas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Fetch wilaya settings
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/wilaya-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || []);
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching wilaya settings:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch wilaya settings'
      });
    }
  };

  // Fetch unique wilayas from orders
  const fetchUniqueWilayas = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/wilaya-settings/unique-wilayas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUniqueWilayas(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching unique wilayas:', error);
    }
  };

  // Initialize settings from existing orders
  const initializeSettings = async () => {
    try {
      setInitializing(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/wilaya-settings/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: 'Success',
          message: data.message || 'Wilaya settings initialized successfully'
        });
        await fetchSettings();
      } else {
        throw new Error('Failed to initialize settings');
      }
    } catch (error) {
      console.error('Error initializing settings:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to initialize wilaya settings'
      });
    } finally {
      setInitializing(false);
    }
  };

  // Save all settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/wilaya-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: settings.map(setting => ({
            wilayaName: setting.wilayaName,
            maxDeliveryDays: setting.maxDeliveryDays
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: 'Success',
          message: data.message || 'Settings saved successfully'
        });
        await fetchSettings();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save settings'
      });
    } finally {
      setSaving(false);
    }
  };

  // Update delivery days for a wilaya
  const updateDeliveryDays = (wilayaName: string, days: number) => {
    setSettings(prev => prev.map(setting => 
      setting.wilayaName === wilayaName 
        ? { ...setting, maxDeliveryDays: Math.max(1, days) }
        : setting
    ));
  };

  // Add new wilaya setting
  const addWilayaSetting = (wilayaName: string) => {
    if (!wilayaName.trim()) return;
    
    const exists = settings.some(setting => setting.wilayaName === wilayaName);
    if (exists) {
      showToast({
        type: 'warning',
        title: 'Warning',
        message: 'This wilaya already exists in settings'
      });
      return;
    }

    const newSetting: WilayaSetting = {
      id: `temp-${Date.now()}`,
      wilayaName: wilayaName.trim(),
      maxDeliveryDays: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSettings(prev => [...prev, newSetting]);
  };

  // Remove wilaya setting
  const removeSetting = (wilayaName: string) => {
    setSettings(prev => prev.filter(setting => setting.wilayaName !== wilayaName));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchUniqueWilayas()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg">Loading wilaya settings...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Wilaya Delivery Settings</h2>
              <p className="text-sm text-gray-600">
                Configure maximum delivery days for each wilaya. Orders exceeding these limits will be highlighted.
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={initializeSettings}
              disabled={initializing}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {initializing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Initialize from Orders</span>
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save All Settings</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Configured Wilayas</p>
              <p className="text-2xl font-bold text-gray-900">{settings.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unique Wilayas in Orders</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueWilayas.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Delivery Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {settings.length > 0 
                  ? Math.round(settings.reduce((sum, s) => sum + s.maxDeliveryDays, 0) / settings.length * 10) / 10
                  : 0
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Delivery Time Settings</h3>
            <div className="text-sm text-gray-600">
              {settings.length} wilaya{settings.length !== 1 ? 's' : ''} configured
            </div>
          </div>

          {settings.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Wilaya Settings</h3>
              <p className="text-gray-600 mb-4">
                Initialize settings from existing orders or add wilayas manually.
              </p>
              <Button
                onClick={initializeSettings}
                disabled={initializing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {initializing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Initialize from Orders
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Wilaya Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Max Delivery Days
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {settings.map((setting) => (
                    <tr key={setting.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {setting.wilayaName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={setting.maxDeliveryDays}
                            onChange={(e) => updateDeliveryDays(
                              setting.wilayaName, 
                              parseInt(e.target.value) || 1
                            )}
                            className="w-20 text-center"
                          />
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">days</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          setting.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {setting.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          onClick={() => removeSetting(setting.wilayaName)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Add Missing Wilayas */}
      {uniqueWilayas.length > settings.length && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Missing Wilayas</h3>
            <p className="text-sm text-gray-600">
              These wilayas exist in your orders but don't have delivery settings configured:
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueWilayas
                .filter(wilaya => !settings.some(setting => setting.wilayaName === wilaya))
                .map(wilaya => (
                  <Button
                    key={wilaya}
                    onClick={() => addWilayaSetting(wilaya)}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{wilaya}</span>
                  </Button>
                ))
              }
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}