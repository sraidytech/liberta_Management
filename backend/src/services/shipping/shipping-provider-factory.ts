/**
 * Shipping Provider Factory
 * 
 * This factory creates the appropriate shipping provider instance based on the company slug.
 * It supports multiple shipping companies: Maystro, Guepex, and Nord West.
 */

import { IShippingProvider, ShippingProviderConfig } from './shipping-provider.interface';
import { MaystroProvider } from './providers/maystro-provider';
import { GuepexProvider } from './providers/guepex-provider';
import { NordWestProvider } from './providers/nord-west-provider';
import { Redis } from 'ioredis';

export class ShippingProviderFactory {
  /**
   * Create a shipping provider instance based on the company slug
   * 
   * @param companySlug - The shipping company slug (maystro, guepex, nord_west)
   * @param credentials - API credentials for the shipping provider
   * @param baseUrl - Optional custom base URL
   * @param redis - Redis instance for caching and rate limiting
   * @returns An instance of the appropriate shipping provider
   * @throws Error if the company slug is not recognized
   */
  static createProvider(
    companySlug: string,
    credentials: Record<string, any>,
    redis: Redis,
    baseUrl?: string
  ): IShippingProvider {
    switch (companySlug.toLowerCase()) {
      case 'maystro':
        return new MaystroProvider(credentials, redis, baseUrl);
      
      case 'guepex':
        return new GuepexProvider(credentials, redis, baseUrl);
      
      case 'nord_west':
      case 'nordwest':
        return new NordWestProvider(credentials, redis, baseUrl);
      
      default:
        throw new Error(`Unknown shipping company: ${companySlug}. Supported companies: maystro, guepex, nord_west`);
    }
  }

  /**
   * Create a provider from a ShippingProviderConfig object
   * 
   * @param config - Complete provider configuration
   * @param redis - Redis instance for caching and rate limiting
   * @returns An instance of the appropriate shipping provider
   */
  static createProviderFromConfig(
    config: ShippingProviderConfig,
    redis: Redis
  ): IShippingProvider {
    return this.createProvider(
      config.companySlug,
      config.credentials,
      redis,
      config.baseUrl
    );
  }

  /**
   * Get list of supported shipping companies
   * 
   * @returns Array of supported company slugs
   */
  static getSupportedCompanies(): string[] {
    return ['maystro', 'guepex', 'nord_west'];
  }

  /**
   * Check if a company slug is supported
   * 
   * @param companySlug - The company slug to check
   * @returns True if the company is supported, false otherwise
   */
  static isSupported(companySlug: string): boolean {
    return this.getSupportedCompanies().includes(companySlug.toLowerCase());
  }
}