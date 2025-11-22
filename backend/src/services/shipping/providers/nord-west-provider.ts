/**
 * Nord West (NOEST) Shipping Provider
 * 
 * Implementation based on NOEST ECOTRACK API documentation
 * Base URL: https://app.noest-dz.com/api/public
 * Authentication: api_token and user_guid parameters
 */

import axios from 'axios';
import { Redis } from 'ioredis';
import { IShippingProvider } from '../shipping-provider.interface';

export class NordWestProvider implements IShippingProvider {
  private axiosInstance: any;
  private redis: Redis;
  private apiToken: string;
  private userGuid: string;
  private readonly RATE_LIMIT_DELAY = 100; // 100ms between requests

  // NOEST event status mapping based on API documentation
  private readonly STATUS_MAPPING: { [key: string]: string } = {
    'upload': 'UPLOADÉ SUR LE SYSTÈME',
    'customer_validation': 'VALIDÉ',
    'validation_collect_colis': 'COLIS RAMASSÉ',
    'validation_reception_admin': 'RECEPTION VALIDÉ',
    'validation_reception': 'ENLEVÉ PAR LE LIVREUR',
    'fdr_activated': 'EN LIVRAISON',
    'sent_to_redispatch': 'EN LIVRAISON',
    'nouvel_tentative_asked_by_customer': 'NOUVELLE TENTATIVE DEMANDÉE',
    'return_asked_by_customer': 'RETOUR DEMANDÉ PAR LE PARTENAIRE',
    'return_asked_by_hub': 'RETOUR EN TRANSIT',
    'retour_dispatched_to_partenaires': 'RETOUR TRANSMIS AU PARTENAIRE',
    'return_dispatched_to_partenaire': 'RETOUR TRANSMIS AU PARTENAIRE',
    'colis_retour_transmit_to_partner': 'RETOUR TRANSMIS AU PARTENAIRE',
    'colis_pickup_transmit_to_partner': 'PICK-UP TRANSMIS AU PARTENAIRE',
    'annulation_dispatch_retour': 'TRANSMISSION DU RETOUR ANNULÉE',
    'cancel_return_dispatched_to_partenaire': 'TRANSMISSION DU RETOUR ANNULÉE',
    'livraison_echoue_recu': 'RETOUR REÇU PAR LE PARTENAIRE',
    'return_validated_by_partener': 'RETOUR VALIDÉ PAR LE PARTENAIRE',
    'return_redispatched_to_livraison': 'RETOUR REMIS EN LIVRAISON',
    'return_dispatched_to_warehouse': 'RETOUR TRANSMIS VERS ENTREPÔT',
    'pickedup': 'PICK-UP COLLECTÉ',
    'valid_return_pickup': 'PICK-UP VALIDÉ',
    'pickup_picked_recu': 'PICK-UP REÇU PAR LE PARTENAIRE',
    'colis_suspendu': 'SUSPENDU',
    'livre': 'LIVRÉ',
    'livred': 'LIVRÉ',
    'verssement_admin_cust': 'MONTANT TRANSMIS AU PARTENAIRE',
    'verssement_admin_cust_canceled': 'VERSEMENT ANNULÉ',
    'verssement_hub_cust_canceled': 'VERSEMENT ANNULÉ',
    'validation_reception_cash_by_partener': 'MONTANT REÇU PAR LE PARTENAIRE',
    'echange_valide': 'ÉCHANGE VALIDÉ',
    'echange_valid_by_hub': 'ÉCHANGE VALIDÉ',
    'ask_to_delete_by_admin': 'DEMANDE DE SUPPRESSION',
    'ask_to_delete_by_hub': 'DEMANDE DE SUPPRESSION',
    'edited_informations': 'INFORMATIONS MODIFIÉES',
    'edit_price': 'PRIX MODIFIÉ',
    'edit_wilaya': 'CHANGEMENT DE WILAYA',
    'extra_fee': 'SURFACTURATION DU COLIS',
    'mise_a_jour': 'TENTATIVE DE LIVRAISON'
  };

  constructor(
    credentials: Record<string, any>,
    redis: Redis,
    baseUrl?: string
  ) {
    this.redis = redis;
    
    this.apiToken = credentials.apiToken || credentials.api_token;
    this.userGuid = credentials.userGuid || credentials.user_guid;

    if (!this.apiToken || !this.userGuid) {
      throw new Error('NOEST/Nord West credentials must include api_token and user_guid');
    }

    this.axiosInstance = axios.create({
      baseURL: baseUrl || credentials.baseUrl || 'https://app.noest-dz.com/api/public',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    // Rate limiting interceptor
    this.axiosInstance.interceptors.request.use(async (config: any) => {
      const lastRequestKey = 'noest:last_request';
      const lastRequest = await this.redis.get(lastRequestKey);
      
      if (lastRequest) {
        const timeSinceLastRequest = Date.now() - parseInt(lastRequest);
        if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
          await new Promise(resolve =>
            setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest)
          );
        }
      }
      
      await this.redis.set(lastRequestKey, Date.now().toString(), 'EX', 60);
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 429) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY * 2));
          return this.axiosInstance.request(error.config);
        }
        throw error;
      }
    );
  }

  async createOrder(orderData: any): Promise<any> {
    try {
      // POST /create/order
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        ...orderData
      };
      
      const response = await this.axiosInstance.post('/create/order', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ NOEST createOrder error:', error.message);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      // POST /update/order
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        tracking: orderId,
        // Add other fields as needed
      };
      
      const response = await this.axiosInstance.post('/update/order', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ NOEST updateOrderStatus error:', error.message);
      throw error;
    }
  }

  async getOrderStatus(orderId: string): Promise<any> {
    try {
      // Use get/trackings/info endpoint
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        trackings: [orderId]
      };
      
      const response = await this.axiosInstance.post('/get/trackings/info', data);
      
      if (response.data && response.data[orderId]) {
        return response.data[orderId];
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ NOEST getOrderStatus error:', error.message);
      throw error;
    }
  }

  async getOrderByReference(reference: string): Promise<any> {
    try {
      // NOEST uses tracking numbers, but we can search by reference
      // This would need to be implemented based on how NOEST handles references
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        trackings: [reference]
      };
      
      const response = await this.axiosInstance.post('/get/trackings/info', data);
      
      if (response.data && response.data[reference]) {
        return response.data[reference];
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ NOEST getOrderByReference error:', error.message);
      return null;
    }
  }

  async syncOrderStatuses(orderIds: string[]): Promise<{
    updated: number;
    errors: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }> {
    const results = {
      updated: 0,
      errors: 0,
      details: [] as Array<{ reference: string; status: string; error?: string }>
    };

    try {
      // NOEST supports batch tracking query
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        trackings: orderIds
      };
      
      const response = await this.axiosInstance.post('/get/trackings/info', data);

      if (response.data) {
        orderIds.forEach(orderId => {
          const orderInfo = response.data[orderId];
          if (orderInfo && orderInfo.activity && orderInfo.activity.length > 0) {
            const latestActivity = orderInfo.activity[0];
            const status = this.mapStatus(latestActivity.event_key || latestActivity.event);
            results.details.push({ reference: orderId, status });
            results.updated++;
          } else {
            results.details.push({ 
              reference: orderId, 
              status: 'NOT_FOUND',
              error: 'Order not found in NOEST'
            });
            results.errors++;
          }
        });
      }
    } catch (error: any) {
      console.error('❌ NOEST syncOrderStatuses error:', error.message);
      orderIds.forEach(id => {
        results.details.push({ 
          reference: id, 
          status: 'ERROR',
          error: error.message
        });
        results.errors++;
      });
    }

    return results;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by creating a minimal request
      // Since NOEST doesn't have a dedicated test endpoint, we'll try to get info for a dummy tracking
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        trackings: ['TEST']
      };
      
      const response = await this.axiosInstance.post('/get/trackings/info', data);
      // If we get a response (even if empty), the connection works
      return response.status === 200;
    } catch (error: any) {
      // If it's a 401/403, credentials are wrong
      // If it's 404, endpoint might be wrong
      // Otherwise, connection might be OK but test data is invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('❌ NOEST connection test failed: Invalid credentials');
        return false;
      }
      // For other errors, we'll consider the connection as potentially working
      console.warn('⚠️ NOEST connection test inconclusive:', error.message);
      return true;
    }
  }

  async getOrderHistory(orderId: string): Promise<any[]> {
    try {
      const orderInfo = await this.getOrderStatus(orderId);
      return orderInfo?.activity || [];
    } catch (error: any) {
      console.error('❌ NOEST getOrderHistory error:', error.message);
      return [];
    }
  }

  mapStatus(statusCode: number | string): string {
    const statusStr = String(statusCode);
    return this.STATUS_MAPPING[statusStr] || statusStr.toUpperCase();
  }

  /**
   * Validate an order (make it visible to NOEST)
   */
  async validateOrder(tracking: string): Promise<any> {
    try {
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        tracking
      };
      
      const response = await this.axiosInstance.post('/valid/order', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ NOEST validateOrder error:', error.message);
      throw error;
    }
  }

  /**
   * Delete an order (only before validation)
   */
  async deleteOrder(tracking: string): Promise<any> {
    try {
      const data = {
        api_token: this.apiToken,
        user_guid: this.userGuid,
        tracking
      };
      
      const response = await this.axiosInstance.post('/delete/order', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ NOEST deleteOrder error:', error.message);
      throw error;
    }
  }

  /**
   * Get order label/bordereau
   */
  async getOrderLabel(tracking: string): Promise<string> {
    try {
      const url = `${this.axiosInstance.defaults.baseURL}/get/order/label?api_token=${this.apiToken}&tracking=${tracking}`;
      return url;
    } catch (error: any) {
      console.error('❌ NOEST getOrderLabel error:', error.message);
      throw error;
    }
  }
}