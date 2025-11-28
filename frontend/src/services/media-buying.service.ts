const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Types
export interface AdSource {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaBuyingEntry {
  id: string;
  date: string;
  sourceId: string;
  source?: AdSource;
  storeId?: string;
  productId?: string;
  spendUSD: number;
  exchangeRate: number;
  spendDZD: number;
  totalLeads: number;
  costPerLead?: number;
  metadata?: MediaBuyingMetadata;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaBuyingMetadata {
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  cpa?: number;
  roas?: number;
  conversions?: number;
  conversionRate?: number;
  reach?: number;
  frequency?: number;
  videoViews?: number;
  engagement?: number;
  campaignName?: string;
  adSetName?: string;
  adName?: string;
  [key: string]: any;
}

export interface MediaBuyingBudget {
  id: string;
  month: number;
  year: number;
  sourceId?: string;
  source?: AdSource;
  budgetUSD: number;
  budgetDZD: number;
  alertThreshold: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budget?: MediaBuyingBudget;
  alertType: 'THRESHOLD_50' | 'THRESHOLD_75' | 'THRESHOLD_90' | 'EXCEEDED';
  message: string;
  isRead: boolean;
  readAt?: string;
  readById?: string;
  createdAt: string;
}

export interface LeadConversion {
  id: string;
  entryId: string;
  entry?: MediaBuyingEntry;
  orderId: string;
  conversionValue?: number;
  createdAt: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  createdById: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSpendUSD: number;
  totalSpendDZD: number;
  totalLeads: number;
  avgCostPerLead: number;
  totalConversions: number;
  conversionRate: number;
  avgROAS: number;
  periodComparison: {
    spendChange: number;
    leadsChange: number;
    cplChange: number;
  };
}

export interface AnalyticsBySource {
  sourceId: string;
  sourceName: string;
  sourceColor?: string;
  totalSpendUSD: number;
  totalSpendDZD: number;
  totalLeads: number;
  avgCostPerLead: number;
  percentageOfTotal: number;
}

export interface BudgetStatus {
  budgetId: string;
  month: number;
  year: number;
  sourceName?: string;
  budgetUSD: number;
  spentUSD: number;
  remainingUSD: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

// Media Buying Service
export const mediaBuyingService = {
  // ============================================
  // AD SOURCES
  // ============================================
  
  getSources: async (includeInactive = false): Promise<AdSource[]> => {
    const params = new URLSearchParams();
    if (includeInactive) params.append('includeInactive', 'true');
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/sources?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch sources');
    const json = await response.json();
    return json.data || [];
  },

  createSource: async (data: {
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  }): Promise<AdSource> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create source');
    const json = await response.json();
    return json.data;
  },

  updateSource: async (id: string, data: Partial<{
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    isActive: boolean;
  }>): Promise<AdSource> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/sources/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update source');
    const json = await response.json();
    return json.data;
  },

  // ============================================
  // ENTRIES
  // ============================================

  getEntries: async (filters?: {
    startDate?: string;
    endDate?: string;
    sourceId?: string;
    storeId?: string;
    productId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    entries: MediaBuyingEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/entries?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch entries');
    const json = await response.json();
    
    // Transform backend response to frontend format
    const transformEntry = (entry: any): MediaBuyingEntry => ({
      ...entry,
      spendUSD: entry.totalSpend || 0,
      spendDZD: entry.spendInDZD || (entry.totalSpend * (entry.exchangeRate || 1)) || 0,
      costPerLead: entry.totalLeads > 0 ? (entry.totalSpend || 0) / entry.totalLeads : undefined,
    });
    
    if (json.data && json.data.entries) {
      return {
        entries: json.data.entries.map(transformEntry),
        total: json.data.total || json.data.entries.length,
        page: json.data.page || 1,
        totalPages: json.data.totalPages || 1,
      };
    }
    
    const entries = json.data || [];
    return {
      entries: Array.isArray(entries) ? entries.map(transformEntry) : [],
      total: Array.isArray(entries) ? entries.length : 0,
      page: 1,
      totalPages: 1,
    };
  },

  getEntry: async (id: string): Promise<MediaBuyingEntry> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/entries/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch entry');
    const json = await response.json();
    
    // Transform backend response to frontend format
    const entry = json.data;
    return {
      ...entry,
      spendUSD: entry.totalSpend || 0,
      spendDZD: entry.spendInDZD || (entry.totalSpend * (entry.exchangeRate || 1)) || 0,
      costPerLead: entry.totalLeads > 0 ? (entry.totalSpend || 0) / entry.totalLeads : undefined,
    };
  },

  createEntry: async (data: {
    date: string;
    sourceId: string;
    storeId?: string;
    productId?: string;
    spendUSD: number;
    exchangeRate: number;
    totalLeads: number;
    metadata?: MediaBuyingMetadata;
    notes?: string;
  }): Promise<MediaBuyingEntry> => {
    // Transform frontend data to backend format
    const backendData = {
      date: data.date,
      sourceId: data.sourceId,
      storeId: data.storeId,
      productId: data.productId,
      totalSpend: data.spendUSD,
      totalLeads: data.totalLeads,
      currency: 'USD' as const,
      exchangeRate: data.exchangeRate,
      metadata: {
        ...data.metadata,
        notes: data.notes,
      },
    };
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/entries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(backendData),
    });
    if (!response.ok) throw new Error('Failed to create entry');
    const json = await response.json();
    return json.data;
  },

  updateEntry: async (id: string, data: Partial<{
    date: string;
    sourceId: string;
    storeId?: string;
    productId?: string;
    spendUSD: number;
    exchangeRate: number;
    totalLeads: number;
    metadata?: MediaBuyingMetadata;
    notes?: string;
  }>): Promise<MediaBuyingEntry> => {
    // Transform frontend data to backend format
    const backendData: any = {};
    if (data.date) backendData.date = data.date;
    if (data.sourceId) backendData.sourceId = data.sourceId;
    if (data.storeId !== undefined) backendData.storeId = data.storeId;
    if (data.productId !== undefined) backendData.productId = data.productId;
    if (data.spendUSD !== undefined) {
      backendData.totalSpend = data.spendUSD;
      backendData.currency = 'USD';
    }
    if (data.totalLeads !== undefined) backendData.totalLeads = data.totalLeads;
    if (data.exchangeRate !== undefined) backendData.exchangeRate = data.exchangeRate;
    if (data.metadata || data.notes) {
      backendData.metadata = {
        ...data.metadata,
        notes: data.notes,
      };
    }
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/entries/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(backendData),
    });
    if (!response.ok) throw new Error('Failed to update entry');
    const json = await response.json();
    return json.data;
  },

  deleteEntry: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/entries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete entry');
  },

  // ============================================
  // DASHBOARD & ANALYTICS
  // ============================================

  getDashboardStats: async (startDate?: string, endDate?: string): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/dashboard/stats?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    const json = await response.json();
    return json.data;
  },

  getAnalyticsBySource: async (startDate?: string, endDate?: string): Promise<AnalyticsBySource[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/analytics/by-source?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch analytics by source');
    const json = await response.json();
    return json.data || [];
  },

  getConversionAnalytics: async (startDate?: string, endDate?: string): Promise<{
    totalLeads: number;
    totalConversions: number;
    conversionRate: number;
    avgConversionValue: number;
    bySource: Array<{
      sourceId: string;
      sourceName: string;
      leads: number;
      conversions: number;
      conversionRate: number;
    }>;
  }> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/analytics/conversions?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch conversion analytics');
    const json = await response.json();
    return json.data;
  },

  // ============================================
  // BUDGETS
  // ============================================

  getBudgets: async (filters?: {
    month?: number;
    year?: number;
    sourceId?: string;
  }): Promise<MediaBuyingBudget[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/budgets?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch budgets');
    const json = await response.json();
    return json.data || [];
  },

  createBudget: async (data: {
    month: number;
    year: number;
    sourceId?: string;
    budgetUSD: number;
    exchangeRate: number;
    alertThreshold?: number;
    notes?: string;
  }): Promise<MediaBuyingBudget> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/budgets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create budget');
    const json = await response.json();
    return json.data;
  },

  updateBudget: async (id: string, data: Partial<{
    budgetUSD: number;
    exchangeRate: number;
    alertThreshold?: number;
    notes?: string;
  }>): Promise<MediaBuyingBudget> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/budgets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update budget');
    const json = await response.json();
    return json.data;
  },

  getBudgetStatus: async (month?: number, year?: number): Promise<BudgetStatus[]> => {
    const params = new URLSearchParams();
    if (month) params.append('month', String(month));
    if (year) params.append('year', String(year));
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/budgets/status?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch budget status');
    const json = await response.json();
    return json.data || [];
  },

  // ============================================
  // ALERTS
  // ============================================

  getAlerts: async (unreadOnly = false): Promise<BudgetAlert[]> => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/alerts?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    const json = await response.json();
    return json.data || [];
  },

  markAlertAsRead: async (id: string): Promise<BudgetAlert> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/alerts/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to mark alert as read');
    const json = await response.json();
    return json.data;
  },

  // ============================================
  // CONVERSIONS
  // ============================================

  linkLeadToOrder: async (data: {
    entryId: string;
    orderId: string;
    conversionValue?: number;
  }): Promise<LeadConversion> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/conversions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to link lead to order');
    const json = await response.json();
    return json.data;
  },

  unlinkLeadFromOrder: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/conversions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to unlink lead from order');
  },

  getConversions: async (entryId?: string): Promise<LeadConversion[]> => {
    const params = new URLSearchParams();
    if (entryId) params.append('entryId', entryId);
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/conversions?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch conversions');
    const json = await response.json();
    return json.data || [];
  },

  // ============================================
  // EXCHANGE RATES
  // ============================================

  getExchangeRates: async (): Promise<ExchangeRate[]> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/exchange-rates`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    const json = await response.json();
    return json.data || [];
  },

  getLatestExchangeRate: async (from = 'USD', to = 'DZD'): Promise<ExchangeRate | null> => {
    const params = new URLSearchParams({ from, to });
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/exchange-rates/latest?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch latest exchange rate');
    const json = await response.json();
    return json.data;
  },

  createExchangeRate: async (data: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveDate: string;
  }): Promise<ExchangeRate> => {
    const response = await fetch(`${API_URL}/api/v1/media-buying/exchange-rates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create exchange rate');
    const json = await response.json();
    return json.data;
  },

  // ============================================
  // EXPORT
  // ============================================

  exportData: async (format: 'json' | 'csv' = 'csv', filters?: {
    startDate?: string;
    endDate?: string;
    sourceId?: string;
    storeId?: string;
    productId?: string;
  }): Promise<Blob> => {
    const params = new URLSearchParams({ format });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    
    const response = await fetch(`${API_URL}/api/v1/media-buying/export?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export data');
    return response.blob();
  },
};

export default mediaBuyingService;