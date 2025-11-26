const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Stock Service
export const stockService = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await fetch(`${API_URL}/api/v1/stock/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    const json = await response.json();
    return json.data;
  },

  // Products
  getProducts: async (filters?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/products?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch products');
    const json = await response.json();
    return json.data.products || json.data || [];
  },

  getProduct: async (id: string) => {
    const response = await fetch(`${API_URL}/api/v1/stock/products/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  createProduct: async (data: {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    unit: string;
    minStockLevel: number;
    maxStockLevel?: number;
    reorderPoint?: number;
  }) => {
    const response = await fetch(`${API_URL}/api/v1/stock/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  updateProduct: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/api/v1/stock/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },

  deleteProduct: async (id: string) => {
    const response = await fetch(`${API_URL}/api/v1/stock/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return response.json();
  },

  // Warehouses
  getWarehouses: async () => {
    const response = await fetch(`${API_URL}/api/v1/stock/warehouses`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch warehouses');
    return response.json();
  },

  createWarehouse: async (data: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    country?: string;
  }) => {
    const response = await fetch(`${API_URL}/api/v1/stock/warehouses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create warehouse');
    return response.json();
  },

  // Lots
  getLots: async (filters?: {
    productId?: string;
    warehouseId?: string;
    status?: string;
    expiryBefore?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/lots?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lots');
    const json = await response.json();
    return json.data.lots || json.data || [];
  },

  getLot: async (id: string) => {
    const response = await fetch(`${API_URL}/api/v1/stock/lots/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lot');
    return response.json();
  },

  createLot: async (data: {
    productId: string;
    warehouseId: string;
    lotNumber: string;
    quantity: number;
    costPerUnit?: number;
    expiryDate?: string;
    manufacturingDate?: string;
  }) => {
    const response = await fetch(`${API_URL}/api/v1/stock/lots`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create lot');
    return response.json();
  },

  updateLot: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/api/v1/stock/lots/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update lot');
    return response.json();
  },

  // Stock Levels
  getStockLevels: async (filters?: {
    productId?: string;
    warehouseId?: string;
    lowStock?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/levels?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stock levels');
    return response.json();
  },

  getStockLevel: async (productId: string, warehouseId: string) => {
    const response = await fetch(`${API_URL}/api/v1/stock/levels/${productId}/${warehouseId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stock level');
    return response.json();
  },

  // Movements
  getMovements: async (filters?: {
    productId?: string;
    warehouseId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/movements?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch movements');
    const json = await response.json();
    return json.data.movements || json.data || [];
  },

  getMovement: async (id: string) => {
    const response = await fetch(`${API_URL}/api/v1/stock/movements/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch movement');
    return response.json();
  },

  createMovement: async (data: {
    productId: string;
    warehouseId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
    quantity: number;
    reason?: string;
    reference?: string;
    lotId?: string;
  }) => {
    const response = await fetch(`${API_URL}/api/v1/stock/movements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create movement');
    return response.json();
  },

  // Alerts
  getAlerts: async (filters?: {
    severity?: string;
    resolved?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/alerts?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    const json = await response.json();
    return json.data.alerts || json.data || [];
  },

  resolveAlert: async (id: string, notes?: string) => {
    const response = await fetch(`${API_URL}/api/v1/stock/alerts/${id}/resolve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) throw new Error('Failed to resolve alert');
    return response.json();
  },

  // Reports
  getStockLevelReport: async (filters?: {
    warehouseId?: string;
    category?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/reports/stock-levels?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stock level report');
    return response.json();
  },

  getMovementReport: async (filters: {
    startDate: string;
    endDate: string;
    productId?: string;
    warehouseId?: string;
    type?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await fetch(`${API_URL}/api/v1/stock/reports/movements?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch movement report');
    return response.json();
  },

  getValuationReport: async (filters?: {
    warehouseId?: string;
    date?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/reports/valuation?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch valuation report');
    return response.json();
  },

  getExpiryReport: async (filters?: {
    warehouseId?: string;
    daysAhead?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/reports/expiry?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch expiry report');
    return response.json();
  },

  getLowStockReport: async (filters?: {
    warehouseId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await fetch(`${API_URL}/api/v1/stock/reports/low-stock?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch low stock report');
    return response.json();
  },

  getTurnoverReport: async (filters: {
    startDate: string;
    endDate: string;
    productId?: string;
    warehouseId?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await fetch(`${API_URL}/api/v1/stock/reports/turnover?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch turnover report');
    return response.json();
  },

  exportReport: async (reportType: string, filters: any) => {
    const response = await fetch(`${API_URL}/api/v1/stock/reports/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reportType, ...filters }),
    });
    if (!response.ok) throw new Error('Failed to export report');
    return response.blob();
  },
};

export default stockService;