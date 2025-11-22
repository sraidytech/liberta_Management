/**
 * Maystro Shipping Provider
 * 
 * Adapter that wraps the existing MaystroService to implement IShippingProvider interface.
 * This maintains backward compatibility while enabling the multi-shipping architecture.
 */

import { Redis } from 'ioredis';
import { IShippingProvider } from '../shipping-provider.interface';
import { MaystroService, MaystroOrder } from '../../maystro.service';

export class MaystroProvider implements IShippingProvider {
  private maystroService: MaystroService;

  constructor(
    credentials: Record<string, any>,
    redis: Redis,
    baseUrl?: string
  ) {
    // Create MaystroService instance with the provided credentials
    const config = {
      id: credentials.id || 'maystro-account',
      name: credentials.name || 'Maystro Account',
      apiKey: credentials.apiKey,
      baseUrl: baseUrl || credentials.baseUrl || 'https://backend.maystro-delivery.com',
      isPrimary: credentials.isPrimary !== undefined ? credentials.isPrimary : true
    };

    this.maystroService = new MaystroService(config, redis);
  }

  async createOrder(orderData: any): Promise<any> {
    // Maystro order creation would be implemented here
    // For now, this is a placeholder as the existing service doesn't have this method
    throw new Error('createOrder not yet implemented for Maystro');
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    // Maystro order status update would be implemented here
    throw new Error('updateOrderStatus not yet implemented for Maystro');
  }

  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const order = await this.maystroService.getOrderByReference(orderId);
      return order;
    } catch (error: any) {
      console.error('❌ Maystro getOrderStatus error:', error.message);
      throw error;
    }
  }

  async getOrderByReference(reference: string): Promise<any> {
    return await this.maystroService.getOrderByReference(reference);
  }

  async syncOrderStatuses(orderIds: string[]): Promise<{
    updated: number;
    errors: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }> {
    return await this.maystroService.syncShippingStatus(orderIds);
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by fetching a single order
      const result = await this.maystroService.fetchOrders(1);
      return result.orders !== undefined;
    } catch (error: any) {
      console.error('❌ Maystro connection test failed:', error.message);
      return false;
    }
  }

  async getOrderHistory(orderId: string): Promise<any[]> {
    return await this.maystroService.getOrderHistory(orderId);
  }

  mapStatus(statusCode: number | string): string {
    const code = typeof statusCode === 'string' ? parseInt(statusCode) : statusCode;
    return this.maystroService.mapStatus(code);
  }

  /**
   * Get the underlying MaystroService instance for advanced operations
   */
  getService(): MaystroService {
    return this.maystroService;
  }
}