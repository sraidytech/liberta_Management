'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReportFilters {
  dateRange: string;
  startDate: string;
  endDate: string;
  storeId: string;
  agentId: string;
  status: string;
  wilaya: string;
  minRevenue: string;
  maxRevenue: string;
}

interface SalesData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  revenueByStore: Array<{
    store: string;
    revenue: number;
    orders: number;
  }>;
  revenueByStatus: Array<{
    status: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    product: string;
    revenue: number;
    quantity: number;
    orders: number;
  }>;
  monthlyComparison: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

interface AgentData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    averageUtilization: number;
    totalOrders: number;
    totalRevenue: number;
  };
  agentPerformance: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    currentOrders: number;
    maxOrders: number;
    utilization: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    successRate: number;
    cancellationRate: number;
    totalActivities: number;
    totalWorkingHours: number;
    ordersPerDay: number;
  }>;
  workloadDistribution: Array<{
    id: string;
    name: string;
    currentOrders: number;
    maxOrders: number;
    utilization: number;
    activeOrders: number;
  }>;
  activityBreakdown: Array<{
    agentId: string;
    activityType: string;
    count: number;
    totalDuration: number;
  }>;
}

interface AgentNotesData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalNotes: number;
    averageNotesPerAgent: number;
    averageQualityScore: number;
    globalPeakHour: number;
    periodDays: number;
  };
  agentAnalytics: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    totalNotes: number;
    notesPerDay: number;
    notesPerOrder: number;
    averageNoteLength: number;
    averageTimeBetweenNotes: number;
    averageTimeToFirstNote: number;
    peakActivityHour: number | null;
    activityConsistency: number;
    noteQualityScore: number;
    productivityRank: number;
    activeDaysWithNotes: number;
    hourlyDistribution: number[];
    dailyTrend: Array<{
      date: string;
      notes: number;
    }>;
    responseTimeMetrics: {
      fastest: number;
      slowest: number;
      average: number;
    };
  }>;
  globalHourlyDistribution: number[];
  topPerformers: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    totalNotes: number;
    noteQualityScore: number;
    productivityRank: number;
  }>;
}

interface GeographicData {
  summary: {
    totalWilayas: number;
    totalCities: number;
    topWilaya: string | null;
    topCity: string | null;
    totalOrders: number;
    totalRevenue: number;
    totalDeliveredOrders: number;
    averageOrderValue: number;
  };
  ordersByWilaya: Array<{
    wilaya: string;
    orders: number;
    revenue: number;
  }>;
  ordersByCommune: Array<{
    location: string;
    orders: number;
    revenue: number;
  }>;
  revenueByWilaya: Array<{
    wilaya: string;
    revenue: number;
  }>;
  topCities: Array<{
    city: string;
    customers: number;
  }>;
}

interface CustomerData {
  summary: {
    totalCustomers: number;
    averageOrdersPerCustomer: number;
    retentionRate: number;
    newCustomers: number;
    returningCustomers: number;
    totalRevenue: number;
    totalDeliveredOrders: number;
    averageOrderValue: number;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    phone: string;
    location: string;
    totalOrders: number;
    totalRevenue: number;
  }>;
  customerRetention: {
    oneTimeCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
  newVsReturning: {
    newCustomers: number;
    returningCustomers: number;
    total: number;
  };
}

export const useReports = (filters: ReportFilters) => {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [agentNotesData, setAgentNotesData] = useState<AgentNotesData | null>(null);
  const [geographicData, setGeographicData] = useState<GeographicData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert date range to actual dates
  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (filters.startDate && filters.endDate) {
          startDate = new Date(filters.startDate);
          endDate = new Date(filters.endDate);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }, [filters.dateRange, filters.startDate, filters.endDate]);

  const fetchSalesData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.wilaya && { wilaya: filters.wilaya }),
        ...(filters.minRevenue && { minRevenue: filters.minRevenue }),
        ...(filters.maxRevenue && { maxRevenue: filters.maxRevenue })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/sales?${params}`, {
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
        setSalesData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch sales data');
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [filters, getDateRange]);

  const fetchAgentData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.storeId && { storeId: filters.storeId })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/agents/detailed?${params}`, {
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
        setAgentData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch agent data');
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [filters, getDateRange]);

  const fetchAgentNotesData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Convert date range to period parameter
      let period = '30d';
      switch (filters.dateRange) {
        case 'last7days':
          period = '7d';
          break;
        case 'last90days':
          period = '90d';
          break;
        default:
          period = '30d';
      }

      const params = new URLSearchParams({
        period,
        ...(filters.agentId && { agentId: filters.agentId })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/agents/notes?${params}`, {
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
        setAgentNotesData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch agent notes data');
      }
    } catch (err) {
      console.error('Error fetching agent notes data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [filters.dateRange, filters.agentId]);

  const fetchGeographicData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(filters.wilaya && { wilaya: filters.wilaya })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/geographic?${params}`, {
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
        setGeographicData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch geographic data');
      }
    } catch (err) {
      console.error('Error fetching geographic data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [filters, getDateRange]);

  const fetchCustomerData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(filters.wilaya && { wilaya: filters.wilaya })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/customers?${params}`, {
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
        setCustomerData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch customer data');
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [filters, getDateRange]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchSalesData(),
        fetchAgentData(),
        fetchAgentNotesData(),
        fetchGeographicData(),
        fetchCustomerData()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSalesData, fetchAgentData, fetchAgentNotesData, fetchGeographicData, fetchCustomerData]);

  const exportData = useCallback(async (format: 'pdf' | 'excel' | 'csv', type: 'sales' | 'agents' | 'geographic' | 'customers') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        format,
        type,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.wilaya && { wilaya: filters.wilaya }),
        ...(filters.minRevenue && { minRevenue: filters.minRevenue }),
        ...(filters.maxRevenue && { maxRevenue: filters.maxRevenue })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `${type}-report-${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
      throw err;
    }
  }, [filters, getDateRange]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    salesData,
    agentData,
    agentNotesData,
    geographicData,
    customerData,
    loading,
    error,
    refreshData,
    exportData
  };
};