/**
 * Guepex (Yalidine) Shipping Provider
 * 
 * Implementation based on Yalidine API v1 documentation
 * Base URL: https://api.yalidine.app/v1/
 * Authentication: X-API-ID and X-API-TOKEN headers
 */

import axios from 'axios';
import { Redis } from 'ioredis';
import { IShippingProvider } from '../shipping-provider.interface';

export class GuepexProvider implements IShippingProvider {
  private axiosInstance: any;
  private redis: Redis;
  private readonly RATE_LIMIT_DELAY = 200; // 200ms to respect 5 requests/second limit

  // Yalidine status mapping based on API documentation
  private readonly STATUS_MAPPING: { [key: string]: string } = {
    'Pas encore expédié': 'PAS ENCORE EXPÉDIÉ',
    'A vérifier': 'À VÉRIFIER',
    'En préparation': 'EN PRÉPARATION',
    'Pas encore ramassé': 'PAS ENCORE RAMASSÉ',
    'Prêt à expédier': 'PRÊT À EXPÉDIER',
    'Ramassé': 'RAMASSÉ',
    'Bloqué': 'BLOQUÉ',
    'Débloqué': 'DÉBLOQUÉ',
    'Transfert': 'TRANSFERT',
    'Expédié': 'EXPÉDIÉ',
    'Centre': 'CENTRE',
    'En localisation': 'EN LOCALISATION',
    'Vers Wilaya': 'VERS WILAYA',
    'Reçu à Wilaya': 'REÇU À WILAYA',
    'En attente du client': 'EN ATTENTE DU CLIENT',
    'Sorti en livraison': 'SORTI EN LIVRAISON',
    'En attente': 'EN ATTENTE',
    'En alerte': 'EN ALERTE',
    'Tentative échouée': 'TENTATIVE ÉCHOUÉE',
    'Livré': 'LIVRÉ',
    'Echèc livraison': 'ÉCHEC LIVRAISON',
    'Retour vers centre': 'RETOUR VERS CENTRE',
    'Retourné au centre': 'RETOURNÉ AU CENTRE',
    'Retour transfert': 'RETOUR TRANSFERT',
    'Retour groupé': 'RETOUR GROUPÉ',
    'Retour à retirer': 'RETOUR À RETIRER',
    'Retour vers vendeur': 'RETOUR VERS VENDEUR',
    'Retourné au vendeur': 'RETOURNÉ AU VENDEUR',
    'Echange échoué': 'ÉCHANGE ÉCHOUÉ'
  };

  constructor(
    credentials: Record<string, any>,
    redis: Redis,
    baseUrl?: string
  ) {
    this.redis = redis;
    
    const apiId = credentials.apiId || credentials.api_id || credentials['X-API-ID'];
    const apiToken = credentials.apiToken || credentials.api_token || credentials['X-API-TOKEN'];

    if (!apiId || !apiToken) {
      throw new Error('Yalidine/Guepex credentials must include apiId (X-API-ID) and apiToken (X-API-TOKEN)');
    }

    this.axiosInstance = axios.create({
      baseURL: baseUrl || credentials.baseUrl || 'https://api.yalidine.app/v1',
      headers: {
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    // Rate limiting interceptor (5 requests/second max)
    this.axiosInstance.interceptors.request.use(async (config: any) => {
      const lastRequestKey = 'yalidine:last_request';
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

    // Handle 429 rate limit errors
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        // Log remaining quotas from headers
        const secondQuota = response.headers['x-second-quota-left'];
        const minuteQuota = response.headers['x-minute-quota-left'];
        if (secondQuota && parseInt(secondQuota) < 2) {
          console.warn(`⚠️ Yalidine: Low quota - ${secondQuota} requests left this second`);
        }
        return response;
      },
      async (error: any) => {
        if (error.response?.status === 429) {
          console.warn('⚠️ Yalidine: Rate limit exceeded, waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return this.axiosInstance.request(error.config);
        }
        throw error;
      }
    );
  }

  async createOrder(orderData: any): Promise<any> {
    try {
      // POST /v1/parcels - Create parcel
      const response = await this.axiosInstance.post('/parcels', orderData);
      return response.data;
    } catch (error: any) {
      console.error('❌ Yalidine createOrder error:', error.message);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      // PATCH /v1/parcels/:tracking
      const response = await this.axiosInstance.patch(`/parcels/${orderId}`, {
        last_status: status
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Yalidine updateOrderStatus error:', error.message);
      throw error;
    }
  }

  async getOrderStatus(orderId: string): Promise<any> {
    try {
      // GET /v1/parcels/:tracking
      const response = await this.axiosInstance.get(`/parcels/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Yalidine getOrderStatus error:', error.message);
      throw error;
    }
  }

  async getOrderByReference(reference: string): Promise<any> {
    try {
      // GET /v1/parcels/?order_id=reference
      const response = await this.axiosInstance.get(`/parcels`, {
        params: { order_id: reference }
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Yalidine getOrderByReference error:', error.message);
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

    // Yalidine supports batch tracking query
    try {
      const trackingParam = orderIds.join(',');
      const response = await this.axiosInstance.get(`/parcels`, {
        params: { tracking: trackingParam }
      });

      if (response.data && response.data.data) {
        response.data.data.forEach((parcel: any) => {
          const status = this.mapStatus(parcel.last_status);
          results.details.push({ 
            reference: parcel.order_id || parcel.tracking, 
            status 
          });
          results.updated++;
        });
      }
    } catch (error: any) {
      console.error('❌ Yalidine syncOrderStatuses error:', error.message);
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
      // Test by getting wilayas list
      const response = await this.axiosInstance.get('/wilayas');
      return response.status === 200 && response.data;
    } catch (error: any) {
      console.error('❌ Yalidine connection test failed:', error.message);
      return false;
    }
  }

  async getOrderHistory(orderId: string): Promise<any[]> {
    try {
      // Yalidine doesn't have a separate history endpoint
      // History is included in the parcel details
      const parcel = await this.getOrderStatus(orderId);
      return parcel?.history || [];
    } catch (error: any) {
      console.error('❌ Yalidine getOrderHistory error:', error.message);
      return [];
    }
  }

  mapStatus(statusCode: number | string): string {
    const statusStr = String(statusCode);
    return this.STATUS_MAPPING[statusStr] || statusStr;
  }
}