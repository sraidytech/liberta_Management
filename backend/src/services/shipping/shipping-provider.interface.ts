/**
 * Shipping Provider Interface
 * 
 * This interface defines the contract that all shipping providers must implement.
 * It ensures consistent behavior across different shipping companies (Maystro, Guepex, Nord West).
 */

export interface IShippingProvider {
  /**
   * Create a new order in the shipping system
   * @param orderData - Order data to create
   * @returns Created order information
   */
  createOrder(orderData: any): Promise<any>;

  /**
   * Update the status of an existing order
   * @param orderId - The shipping company's order ID
   * @param status - New status to set
   * @returns Updated order information
   */
  updateOrderStatus(orderId: string, status: string): Promise<any>;

  /**
   * Get the current status of an order
   * @param orderId - The shipping company's order ID or tracking number
   * @returns Current order status and details
   */
  getOrderStatus(orderId: string): Promise<any>;

  /**
   * Get order by external reference (our system's order reference)
   * @param reference - Our system's order reference
   * @returns Order information from shipping provider
   */
  getOrderByReference(reference: string): Promise<any>;

  /**
   * Sync shipping statuses for multiple orders
   * @param orderIds - Array of order IDs or references to sync
   * @returns Sync results with updated statuses
   */
  syncOrderStatuses(orderIds: string[]): Promise<{
    updated: number;
    errors: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }>;

  /**
   * Test the connection to the shipping provider's API
   * @returns True if connection is successful, false otherwise
   */
  testConnection(): Promise<boolean>;

  /**
   * Get order history/tracking information
   * @param orderId - The shipping company's order ID
   * @returns Array of tracking events
   */
  getOrderHistory(orderId: string): Promise<any[]>;

  /**
   * Map shipping provider's status code to a readable status
   * @param statusCode - Status code from the provider
   * @returns Human-readable status string
   */
  mapStatus(statusCode: number | string): string;
}

/**
 * Shipping Provider Configuration
 */
export interface ShippingProviderConfig {
  id: string;
  name: string;
  companySlug: string;
  credentials: Record<string, any>;
  baseUrl?: string;
  isPrimary?: boolean;
}

/**
 * Order data structure for creating orders
 */
export interface CreateOrderData {
  reference: string;
  customerName: string;
  customerPhone: string;
  wilaya: string;
  commune: string;
  address: string;
  productName: string;
  productPrice: number;
  shippingCost?: number;
  notes?: string;
}