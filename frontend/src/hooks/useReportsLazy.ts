'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
    // New Financial KPIs
    grossMargin: number;
    grossMarginPercentage: number;
    revenuePerCustomer: number;
    uniqueCustomers: number;
    repeatPurchaseRate: number;
    conversionRate: number;
    customerLifetimeValue: number;
    totalAllOrders: number;
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
    deliveredOrders: number;
    deliveryRate: number;
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
    averageQualityScore: number;
    averageGoalAchievement: number;
    totalOrders: number;
    totalRevenue: number;
    averageSuccessRate: number;
    averageNoteCompletionRate: number;
  };
  agentPerformance: Array<{
    id: string;
    name: string;
    agentCode: string;
    availability: string;
    currentOrders: number;
    maxOrders: number;
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
    // New Quality-based KPIs
    qualityScore: number;
    goalAchievementRate: number;
    activityConsistency: number;
    noteCompletionRate: number;
    orderSuccessWithNotesRate: number;
    avgResponseTime: number;
    performanceScore: number;
  }>;
  workloadDistribution: Array<{
    id: string;
    name: string;
    currentOrders: number;
    maxOrders: number;
    activeOrders: number;
    workloadPercentage: number;
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
    totalCancelledOrders?: number;
    deliveryRate?: number;
    averageOrderValue: number;
  };
  ordersByWilaya: Array<{
    wilaya: string;
    orders: number;
    revenue: number;
    completedOrders?: number;
    cancelledOrders?: number;
    deliveryRate?: number;
  }>;
  ordersByCommune: Array<{
    location: string;
    orders: number;
    revenue: number;
    completedOrders?: number;
    cancelledOrders?: number;
    deliveryRate?: number;
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

interface CommuneData {
  wilaya: string;
  summary: {
    totalCommunes: number;
    topCommune: string | null;
    totalOrders: number;
    totalRevenue: number;
    totalDeliveredOrders: number;
    totalCancelledOrders?: number;
    deliveryRate?: number;
    averageOrderValue: number;
    totalCustomers: number;
  };
  ordersByCommune: Array<{
    commune: string;
    wilaya: string;
    orders: number;
    revenue: number;
    completedOrders?: number;
    cancelledOrders?: number;
    deliveryRate?: number;
  }>;
  revenueByCommune: Array<{
    commune: string;
    wilaya: string;
    revenue: number;
  }>;
  customersByCommune: Array<{
    commune: string;
    wilaya: string;
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

type TabType = 'sales' | 'agents' | 'geographic' | 'customers';

interface TabLoadingState {
  sales: boolean;
  agents: boolean;
  geographic: boolean;
  customers: boolean;
}

interface TabDataState {
  sales: SalesData | null;
  agents: AgentData | null;
  agentNotes: AgentNotesData | null;
  geographic: GeographicData | null;
  customers: CustomerData | null;
}

export const useReportsLazy = (filters: ReportFilters, activeTab: TabType) => {
  // Separate loading states for each tab
  const [tabLoading, setTabLoading] = useState<TabLoadingState>({
    sales: false,
    agents: false,
    geographic: false,
    customers: false
  });

  // Separate data states for each tab
  const [tabData, setTabData] = useState<TabDataState>({
    sales: null,
    agents: null,
    agentNotes: null,
    geographic: null,
    customers: null
  });

  const [communeData, setCommuneData] = useState<CommuneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track which tabs have been loaded to prevent unnecessary refetches
  const loadedTabsRef = useRef<Set<TabType>>(new Set());
  
  // Stable filter reference to prevent unnecessary re-renders
  const filtersRef = useRef(filters);
  const prevFiltersRef = useRef(filters);

  // Convert date range to actual dates - memoized with stable dependencies
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

  // Individual fetch functions for each tab - with stable dependencies
  const fetchSalesData = useCallback(async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (!forceRefresh && loadedTabsRef.current.has('sales')) return;

    setTabLoading(prev => ({ ...prev, sales: true }));
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const currentFilters = filtersRef.current;
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(currentFilters.storeId && { storeId: currentFilters.storeId }),
        ...(currentFilters.agentId && { agentId: currentFilters.agentId }),
        ...(currentFilters.status && { status: currentFilters.status }),
        ...(currentFilters.wilaya && { wilaya: currentFilters.wilaya }),
        ...(currentFilters.minRevenue && { minRevenue: currentFilters.minRevenue }),
        ...(currentFilters.maxRevenue && { maxRevenue: currentFilters.maxRevenue })
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
        setTabData(prev => ({ ...prev, sales: result.data }));
        loadedTabsRef.current.add('sales');
      } else {
        throw new Error(result.error?.message || 'Failed to fetch sales data');
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTabLoading(prev => ({ ...prev, sales: false }));
    }
  }, [getDateRange]);

  const fetchAgentData = useCallback(async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (!forceRefresh && loadedTabsRef.current.has('agents')) return;

    setTabLoading(prev => ({ ...prev, agents: true }));
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const currentFilters = filtersRef.current;
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(currentFilters.agentId && { agentId: currentFilters.agentId }),
        ...(currentFilters.storeId && { storeId: currentFilters.storeId })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Fetch both agent data and agent notes data
      const [agentResponse, notesResponse] = await Promise.all([
        fetch(`${apiUrl}/api/v1/analytics/agents/detailed?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${apiUrl}/api/v1/analytics/agents/notes?period=30d${currentFilters.agentId ? `&agentId=${currentFilters.agentId}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!agentResponse.ok || !notesResponse.ok) {
        throw new Error(`HTTP error! agent: ${agentResponse.status}, notes: ${notesResponse.status}`);
      }

      const [agentResult, notesResult] = await Promise.all([
        agentResponse.json(),
        notesResponse.json()
      ]);

      if (agentResult.success && notesResult.success) {
        setTabData(prev => ({
          ...prev,
          agents: agentResult.data,
          agentNotes: notesResult.data
        }));
        loadedTabsRef.current.add('agents');
      } else {
        throw new Error('Failed to fetch agent data');
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTabLoading(prev => ({ ...prev, agents: false }));
    }
  }, [getDateRange]);

  const fetchGeographicData = useCallback(async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (!forceRefresh && loadedTabsRef.current.has('geographic')) return;

    setTabLoading(prev => ({ ...prev, geographic: true }));
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const currentFilters = filtersRef.current;
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(currentFilters.wilaya && { wilaya: currentFilters.wilaya })
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
        setTabData(prev => ({ ...prev, geographic: result.data }));
        loadedTabsRef.current.add('geographic');
      } else {
        throw new Error(result.error?.message || 'Failed to fetch geographic data');
      }
    } catch (err) {
      console.error('Error fetching geographic data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTabLoading(prev => ({ ...prev, geographic: false }));
    }
  }, [getDateRange]);

  const fetchCustomerData = useCallback(async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (!forceRefresh && loadedTabsRef.current.has('customers')) return;

    setTabLoading(prev => ({ ...prev, customers: true }));
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const currentFilters = filtersRef.current;
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(currentFilters.storeId && { storeId: currentFilters.storeId }),
        ...(currentFilters.wilaya && { wilaya: currentFilters.wilaya }),
        ...(currentFilters.agentId && { agentId: currentFilters.agentId }),
        ...(currentFilters.status && { status: currentFilters.status })
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
        setTabData(prev => ({ ...prev, customers: result.data }));
        loadedTabsRef.current.add('customers');
      } else {
        throw new Error(result.error?.message || 'Failed to fetch customer data');
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTabLoading(prev => ({ ...prev, customers: false }));
    }
  }, [getDateRange]);

  const fetchCommuneData = useCallback(async (wilaya: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        wilaya,
        startDate,
        endDate,
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status })
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/analytics/geographic/commune?${params}`, {
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
        setCommuneData(result.data);
        return result.data;
      } else {
        throw new Error(result.error?.message || 'Failed to fetch commune data');
      }
    } catch (err) {
      console.error('Error fetching commune data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    }
  }, [filters, getDateRange]);

  // Update filter refs when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Detect filter changes and clear loaded tabs cache
  useEffect(() => {
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    
    if (filtersChanged) {
      // Clear loaded tabs cache when filters change
      loadedTabsRef.current.clear();
      
      // Clear ALL existing data when filters change
      setTabData({
        sales: null,
        agents: null,
        agentNotes: null,
        geographic: null,
        customers: null
      });
      
      // Update previous filters
      prevFiltersRef.current = filters;
      
      // Fetch data for current active tab with force refresh
      switch (activeTab) {
        case 'sales':
          fetchSalesData(true);
          break;
        case 'agents':
          fetchAgentData(true);
          break;
        case 'geographic':
          fetchGeographicData(true);
          break;
        case 'customers':
          fetchCustomerData(true);
          break;
      }
    }
  }, [filters, activeTab, fetchSalesData, fetchAgentData, fetchGeographicData, fetchCustomerData]);

  // LAZY LOADING: Only fetch data when the active tab changes (if not already loaded)
  useEffect(() => {
    switch (activeTab) {
      case 'sales':
        fetchSalesData(false);
        break;
      case 'agents':
        fetchAgentData(false);
        break;
      case 'geographic':
        fetchGeographicData(false);
        break;
      case 'customers':
        fetchCustomerData(false);
        break;
    }
  }, [activeTab, fetchSalesData, fetchAgentData, fetchGeographicData, fetchCustomerData]);

  const refreshData = useCallback(async () => {
    // Force refresh the currently active tab
    switch (activeTab) {
      case 'sales':
        await fetchSalesData(true);
        break;
      case 'agents':
        await fetchAgentData(true);
        break;
      case 'geographic':
        await fetchGeographicData(true);
        break;
      case 'customers':
        await fetchCustomerData(true);
        break;
    }
  }, [activeTab, fetchSalesData, fetchAgentData, fetchGeographicData, fetchCustomerData]);

  const exportData = useCallback(async (format: 'pdf' | 'excel' | 'csv', type: TabType) => {
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

  return {
    salesData: tabData.sales,
    agentData: tabData.agents,
    agentNotesData: tabData.agentNotes,
    geographicData: tabData.geographic,
    communeData,
    customerData: tabData.customers,
    loading: tabLoading[activeTab], // Only show loading for active tab
    error,
    refreshData,
    exportData,
    fetchCommuneData
  };
};