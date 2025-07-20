'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface AgentPerformanceData {
  agent: {
    id: string;
    name: string;
    agentCode: string;
    maxOrders: number;
    currentOrders: number;
  };
  hasInsufficientActivity?: boolean;
  message?: string;
  requiredActivity?: string;
  missingRequirements?: {
    needsNotes: boolean;
    needsDeliveredOrders: boolean;
    currentNotes: number;
    currentDeliveredOrders: number;
  };
  period?: {
    days: number;
    startDate: string;
    endDate: string;
  };
  completionRate?: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
  };
  averageProcessingTime?: {
    hours: number;
    comparison: 'excellent' | 'good' | 'needs_improvement';
  };
  orderCounts?: {
    total: number;
    completed: number;
    cancelled: number;
    confirmed: number;
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  successRate?: {
    delivered: number;
    cancelled: number;
    confirmed: number;
    percentage: number;
    cancellationRate: number;
  };
  productivity?: {
    ordersPerDay: number;
    utilizationRate: number;
  };
}

interface UseAgentPerformanceReturn {
  data: AgentPerformanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setPeriod: (period: '7d' | '30d' | '90d') => void;
  period: '7d' | '30d' | '90d';
}

export function useAgentPerformance(agentId?: string): UseAgentPerformanceReturn {
  const { user } = useAuth();
  const [data, setData] = useState<AgentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Use provided agentId or current user's ID
  const targetAgentId = agentId || user?.id;

  const fetchPerformanceData = useCallback(async () => {
    if (!targetAgentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      console.log('🔍 Fetching agent performance data for:', targetAgentId, 'period:', period);
      
      const response = await fetch(
        `${apiBaseUrl}/api/v1/analytics/agents/${targetAgentId}/performance?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to view this performance data');
        }
        if (response.status === 404) {
          throw new Error('Agent not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        console.log('✅ Agent performance data loaded successfully:', result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch performance data');
      }
    } catch (err) {
      console.error('❌ Error fetching agent performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [targetAgentId, period]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    await fetchPerformanceData();
  }, [fetchPerformanceData]);

  return {
    data,
    loading,
    error,
    refetch,
    setPeriod,
    period
  };
}