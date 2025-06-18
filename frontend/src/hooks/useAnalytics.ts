'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  overview: {
    totalOrders: number;
    orderGrowth: string;
    todayOrders: number;
    weekOrders: number;
    monthOrders: number;
    totalRevenue: number;
    monthRevenue: number;
    revenueGrowth: string;
    activeAgents: number;
    totalAgents: number;
    agentUtilization: string;
  };
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  storePerformance: Array<{
    store: string;
    orders: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    reference: string;
    customer: string;
    total: number;
    status: string;
    store: string;
    agent: string | null;
    createdAt: string;
  }>;
  topAgents: Array<{
    id: string;
    name: string;
    agentCode: string;
    currentOrders: number;
    maxOrders: number;
    monthlyOrders: number;
    availability: string;
    utilization: string;
  }>;
  stores: Array<{
    identifier: string;
    name: string;
    isActive: boolean;
    orders: number;
    revenue: number;
  }>;
}

interface OrderTrends {
  date: string;
  orders: number;
  revenue: number;
}

export const useAnalytics = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [orderTrends, setOrderTrends] = useState<OrderTrends[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardStats(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch dashboard stats');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const fetchOrderTrends = async (period: string = '7d') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/trends?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setOrderTrends(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch order trends');
      }
    } catch (err) {
      console.error('Error fetching order trends:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchOrderTrends()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    dashboardStats,
    orderTrends,
    loading,
    error,
    refreshData,
    fetchOrderTrends
  };
};