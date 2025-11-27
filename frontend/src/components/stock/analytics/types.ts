// Analytics Types and Interfaces

export interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  warehouseId: string;
  categoryId: string;
  productId: string;
}

export interface OverviewData {
  totalValue: number;
  totalProducts: number;
  totalLots: number;
  avgTurnoverRate: number;
  valueHistory: { date: string; value: number }[];
  categoryDistribution: { name: string; value: number }[];
  topProducts: { name: string; value: number; quantity: number }[];
}

export interface MovementData {
  trend: { date: string; in: number; out: number; adjustment: number; transfer: number; return: number }[];
  typeDistribution: { type: string; count: number; quantity: number }[];
  topProducts: { name: string; inQuantity: number; outQuantity: number; netChange: number }[];
  summary: { period: string; in: number; out: number; net: number }[];
}

export interface HealthData {
  levelDistribution: { status: string; count: number; percentage: number }[];
  expiryAnalysis: { range: string; count: number; value: number; products: { name: string; quantity: number; expiryDate: string }[] }[];
  agingAnalysis: { range: string; count: number; value: number }[];
  reorderList: { productId: string; productName: string; sku: string; current: number; reorderPoint: number; toOrder: number; warehouseName: string }[];
}

export interface WarehouseData {
  stats: { id: string; name: string; code: string; totalValue: number; totalQuantity: number; productCount: number; utilization: number }[];
  comparison: { warehouseId: string; warehouseName: string; inMovements: number; outMovements: number; netChange: number }[];
}

export type TabType = 'overview' | 'movements' | 'health' | 'warehouses';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
}