const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export interface OrderConfirmation {
  id: string;
  orderId?: string;
  ecoManagerOrderId: number;
  orderReference: string;
  storeIdentifier: string;
  confirmatorId?: number;
  confirmatorName?: string;
  confirmationState?: string;
  orderState?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    reference: string;
    status: string;
    customer: {
      fullName: string;
      telephone: string;
    };
  };
}

export interface ConfirmationStats {
  total: number;
  withConfirmator: number;
  withoutConfirmator: number;
  confirmatorStats: Array<{
    confirmatorName: string;
    storeIdentifier: string;
    _count: number;
  }>;
  stateStats: Array<{
    confirmationState: string;
    storeIdentifier: string;
    _count: number;
  }>;
}

export interface PaginatedConfirmations {
  data: OrderConfirmation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ConfirmatorPerformance {
  confirmatorId: number;
  confirmatorName: string;
  storeIdentifier: string;
  stores?: string[]; // List of stores (for aggregated view)
  totalOrders: number;
  totalConfirmed: number;
  confirmationRate: number;
}

export interface PerformanceResponse {
  data: ConfirmatorPerformance[];
  summary: {
    totalConfirmators: number;
    averageRate: string;
  };
}

export const confirmationsService = {
  /**
   * Get confirmation for a specific order
   */
  getOrderConfirmation: async (orderId: string): Promise<OrderConfirmation> => {
    const response = await fetch(`${API_URL}/api/v1/confirmations/order/${orderId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch order confirmation');
    return response.json();
  },

  /**
   * Get confirmations by confirmator
   */
  getConfirmationsByConfirmator: async (
    confirmatorId: number,
    params?: {
      storeIdentifier?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedConfirmations> => {
    const queryParams = new URLSearchParams();
    if (params?.storeIdentifier) queryParams.append('storeIdentifier', params.storeIdentifier);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${API_URL}/api/v1/confirmations/confirmator/${confirmatorId}?${queryParams}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch confirmations by confirmator');
    return response.json();
  },

  /**
   * Get confirmation statistics
   */
  getConfirmationStats: async (params?: {
    storeIdentifier?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ConfirmationStats> => {
    const queryParams = new URLSearchParams();
    if (params?.storeIdentifier) queryParams.append('storeIdentifier', params.storeIdentifier);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(
      `${API_URL}/api/v1/confirmations/stats?${queryParams}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch confirmation stats');
    return response.json();
  },

  /**
   * Get paginated list of confirmations
   */
  getConfirmationsList: async (params?: {
    storeIdentifier?: string;
    confirmationState?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedConfirmations> => {
    const queryParams = new URLSearchParams();
    if (params?.storeIdentifier) queryParams.append('storeIdentifier', params.storeIdentifier);
    if (params?.confirmationState) queryParams.append('confirmationState', params.confirmationState);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${API_URL}/api/v1/confirmations/list?${queryParams}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch confirmations list');
    return response.json();
  },

  /**
   * Get confirmator performance with confirmation rates
   */
  getConfirmatorPerformance: async (params?: {
    storeIdentifier?: string;
    aggregated?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<PerformanceResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.storeIdentifier) queryParams.append('storeIdentifier', params.storeIdentifier);
    if (params?.aggregated !== undefined) queryParams.append('aggregated', params.aggregated.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(
      `${API_URL}/api/v1/confirmations/performance?${queryParams}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch confirmator performance');
    return response.json();
  },

  /**
   * Get list of all stores
   */
  getStores: async (): Promise<Array<{ identifier: string; count: number }>> => {
    const response = await fetch(`${API_URL}/api/v1/confirmations/stores`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stores');
    const data = await response.json();
    return data.data || [];
  },
};