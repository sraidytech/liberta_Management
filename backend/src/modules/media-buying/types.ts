// Media Buying Module Types

export interface CreateEntryDto {
  date: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  sourceId: string;
  totalSpend: number;
  totalLeads: number;
  currency: 'USD' | 'DZD';
  exchangeRate?: number;
  storeId?: string;
  productId?: string;
  metadata?: MediaBuyingMetadata;
}

export interface UpdateEntryDto {
  date?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  sourceId?: string;
  totalSpend?: number;
  totalLeads?: number;
  currency?: 'USD' | 'DZD';
  exchangeRate?: number;
  storeId?: string;
  productId?: string;
  metadata?: MediaBuyingMetadata;
}

export interface MediaBuyingMetadata {
  ctr?: number;           // Click-Through Rate (%)
  cpm?: number;           // Cost Per Mille
  cpa?: number;           // Cost Per Acquisition
  roas?: number;          // Return on Ad Spend
  impressions?: number;
  clicks?: number;
  conversions?: number;
  campaignName?: string;
  adSetName?: string;
  adCreativeId?: string;
  notes?: string;
  [key: string]: any;     // Allow custom fields
}

export interface CreateBudgetDto {
  month: number;
  year: number;
  sourceId?: string;
  budgetAmount: number;
  currency?: string;
  alertThreshold?: number;
  alertEnabled?: boolean;
}

export interface UpdateBudgetDto {
  budgetAmount?: number;
  currency?: string;
  alertThreshold?: number;
  alertEnabled?: boolean;
}

export interface CreateSourceDto {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateSourceDto {
  name?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateExchangeRateDto {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
}

export interface CreateConversionDto {
  entryId: string;
  orderId: string;
  attributionType?: string;
}

export interface EntryFilters {
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  storeId?: string;
  productId?: string;
  page?: number;
  limit?: number;
}

export interface BudgetFilters {
  month?: number;
  year?: number;
  sourceId?: string;
}

export interface DashboardStats {
  totalSpendToday: number;
  totalSpendWeek: number;
  totalSpendMonth: number;
  totalSpendInDZD: number;
  totalLeadsToday: number;
  totalLeadsWeek: number;
  totalLeadsMonth: number;
  averageCPL: number;
  bestPerformingSource: {
    id: string;
    name: string;
    leads: number;
    spend: number;
    cpl: number;
  } | null;
  spendBySource: Array<{
    sourceId: string;
    sourceName: string;
    sourceColor: string;
    spend: number;
    spendInDZD: number;
    leads: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    spend: number;
    spendInDZD: number;
    leads: number;
    cpl: number;
  }>;
  conversionRate: number;
  totalConversions: number;
  recentEntries: Array<{
    id: string;
    date: string;
    sourceName: string;
    sourceColor: string;
    totalSpend: number;
    totalLeads: number;
    currency: string;
  }>;
}

export interface BudgetStatus {
  budgetId: string;
  month: number;
  year: number;
  sourceId: string | null;
  sourceName: string | null;
  budgetAmount: number;
  currentSpend: number;
  spendPercentage: number;
  remaining: number;
  alertThreshold: number;
  isOverBudget: boolean;
  isNearThreshold: boolean;
}

export interface AnalyticsBySource {
  sourceId: string;
  sourceName: string;
  sourceColor: string;
  totalSpend: number;
  totalSpendInDZD: number;
  totalLeads: number;
  averageCPL: number;
  conversions: number;
  conversionRate: number;
  entries: number;
  trend: Array<{
    date: string;
    spend: number;
    leads: number;
  }>;
}

export interface ConversionAnalytics {
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  totalOrderValue: number;
  averageOrderValue: number;
  revenuePerLead: number;
  bySource: Array<{
    sourceId: string;
    sourceName: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    orderValue: number;
  }>;
}