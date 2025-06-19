'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BulkReassignmentModal } from './bulk-reassignment-modal';
import { useLanguage } from '@/lib/language-context';

interface AgentWorkload {
  agentId: string;
  agentName: string;
  agentCode: string;
  isOnline: boolean;
  assignedOrders: number;
  maxOrders: number;
  utilizationRate: number;
}

interface AssignmentStats {
  totalAgents: number;
  onlineAgents: number;
  offlineAgents: number;
  unassignedOrders: number;
  totalAssignedOrders: number;
  agentWorkloads: AgentWorkload[];
}

export default function AssignmentDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);

  const fetchStats = async () => {
    try {
      console.log('🔄 Fetching assignment stats...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/v1/assignments/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Assignment stats received:', data);
        setStats(data.data);
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to fetch stats:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching assignment stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAssignment = async () => {
    setAssigning(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/v1/assignments/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Assignment completed: ${data.data.successfulAssignments} orders assigned`);
        fetchStats(); // Refresh stats
      } else {
        alert('Failed to trigger assignment');
      }
    } catch (error) {
      console.error('Error triggering assignment:', error);
      alert('Error triggering assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleTestAssignment = async () => {
    setIsTesting(true);
    setTestMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/api/v1/assignments/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maxOrders: 5 }) // Test with 5 orders
      });

      const data = await response.json();
      
      if (data.success) {
        setTestMessage(`✅ Test completed: ${data.data.successfulAssignments} orders assigned out of ${data.data.totalProcessed} processed`);
        // Refresh stats after test
        fetchStats();
      } else {
        setTestMessage(`❌ Test failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test assignment error:', error);
      setTestMessage('❌ Failed to test assignment system');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading assignment dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-600">Failed to load assignment stats</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('agentAssignmentDashboard')}</h2>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowBulkReassignModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {t('bulkReassignment')}
          </Button>
          <Button
            onClick={triggerAssignment}
            disabled={assigning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {assigning ? t('assigning') : t('triggerAssignment')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">{t('totalAgents')}</div>
          <div className="text-2xl font-bold">{stats.totalAgents}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm font-medium text-green-600">{t('onlineAgents')}</div>
          <div className="text-2xl font-bold text-green-600">{stats.onlineAgents}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">{t('offlineAgents')}</div>
          <div className="text-2xl font-bold text-gray-600">{stats.offlineAgents}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm font-medium text-orange-600">{t('unassignedOrders')}</div>
          <div className="text-2xl font-bold text-orange-600">{stats.unassignedOrders}</div>
        </Card>
        
        <Card className="p-4">
          <div className="text-sm font-medium text-blue-600">{t('assignedOrders')}</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalAssignedOrders}</div>
        </Card>
      </div>

      {/* Agent Workloads */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('agentWorkloads')}</h3>
        
        {stats.agentWorkloads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('noAgentsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t('agent')}</th>
                  <th className="text-left py-2">{t('code')}</th>
                  <th className="text-center py-2">{t('status')}</th>
                  <th className="text-center py-2">{t('assignedOrders')}</th>
                  <th className="text-center py-2">Max {t('orders')}</th>
                  <th className="text-center py-2">{t('utilization')}</th>
                  <th className="text-center py-2">{t('progress')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.agentWorkloads.map((agent) => (
                  <tr key={agent.agentId} className="border-b hover:bg-gray-50">
                    <td className="py-3">{agent.agentName}</td>
                    <td className="py-3 font-mono text-sm">{agent.agentCode}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        agent.isOnline 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.isOnline ? t('online') : t('offline')}
                      </span>
                    </td>
                    <td className="py-3 text-center font-semibold">{agent.assignedOrders}</td>
                    <td className="py-3 text-center">{agent.maxOrders}</td>
                    <td className="py-3 text-center">
                      <span className={`font-semibold ${
                        agent.utilizationRate > 80 ? 'text-red-600' :
                        agent.utilizationRate > 60 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {agent.utilizationRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            agent.utilizationRate > 80 ? 'bg-red-500' :
                            agent.utilizationRate > 60 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(agent.utilizationRate, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assignment Instructions */}
      <Card className="p-6 bg-blue-50">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">How Assignment Works</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>• Orders are automatically assigned to AGENT_SUIVI when they sync from EcoManager</li>
          <li>• Assignment uses round-robin distribution among online agents</li>
          <li>• Agents must be online (connected via WebSocket) and under their maximum order limit</li>
          <li>• Only orders in "ASSIGNED" status count toward agent workload</li>
          <li>• Orders are redistributed when agents go offline</li>
          <li>• Manual assignment can be triggered using the button above</li>
        </ul>
      </Card>

      {/* Bulk Reassignment Modal */}
      <BulkReassignmentModal
        isOpen={showBulkReassignModal}
        onClose={() => setShowBulkReassignModal(false)}
        onSuccess={() => {
          fetchStats(); // Refresh stats after successful reassignment
        }}
      />
    </div>
  );
}