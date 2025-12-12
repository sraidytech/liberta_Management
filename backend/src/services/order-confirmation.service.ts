import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

interface EcoManagerOrderData {
  id: number;
  reference: string;
  full_name: string;
  order_state_name: string;
  confirmation_state_name?: string;
  confirmator?: {
    id: number;
    name: string;
  };
  created_at: string;
  confirmed_at?: string;
}

export class OrderConfirmationService {
  
  /**
   * Handle OrderCreated webhook event
   * Creates new confirmation record if it doesn't exist
   */
  async handleOrderCreated(
    orderData: EcoManagerOrderData,
    storeIdentifier: string
  ): Promise<void> {
    console.log(`📦 OrderCreated: ${orderData.reference} (${storeIdentifier})`);
    
    try {
      // Check if confirmation record already exists
      const existing = await prisma.orderConfirmation.findUnique({
        where: { ecoManagerOrderId: orderData.id }
      });
      
      if (existing) {
        console.log(`⚠️ Order confirmation already exists: ${orderData.reference}`);
        return;
      }
      
      // Find linked order in our system (if exists)
      const linkedOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { ecoManagerId: `${storeIdentifier}${orderData.id}` },
            { ecoManagerId: orderData.id.toString() }
          ],
          storeIdentifier
        }
      });
      
      // Create confirmation record
      await prisma.orderConfirmation.create({
        data: {
          ecoManagerOrderId: orderData.id,
          orderReference: orderData.reference,
          storeIdentifier,
          orderId: linkedOrder?.id,
          confirmatorId: orderData.confirmator?.id,
          confirmatorName: orderData.confirmator?.name,
          confirmationState: orderData.confirmation_state_name,
          orderState: orderData.order_state_name,
          confirmedAt: orderData.confirmed_at ? new Date(orderData.confirmed_at) : null
        }
      });
      
      console.log(`✅ Created confirmation record for ${orderData.reference}`);
    } catch (error) {
      console.error(`❌ Error creating confirmation for ${orderData.reference}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle OrderConfirmationStatusChanged webhook event
   * Updates existing confirmation record (NO history tracking)
   */
  async handleConfirmationChanged(
    orderData: EcoManagerOrderData,
    storeIdentifier: string
  ): Promise<void> {
    console.log(`🔄 Confirmation changed: ${orderData.reference} (${storeIdentifier})`);
    
    try {
      // Find existing confirmation record
      let confirmation = await prisma.orderConfirmation.findUnique({
        where: { ecoManagerOrderId: orderData.id }
      });
      
      // If not found, create it (webhook might arrive before OrderCreated)
      if (!confirmation) {
        console.log(`⚠️ Creating missing confirmation record for ${orderData.reference}`);
        await this.handleOrderCreated(orderData, storeIdentifier);
        return;
      }
      
      // Update confirmation record (overwrites previous state - no history)
      await prisma.orderConfirmation.update({
        where: { id: confirmation.id },
        data: {
          confirmatorId: orderData.confirmator?.id,
          confirmatorName: orderData.confirmator?.name,
          confirmationState: orderData.confirmation_state_name,
          orderState: orderData.order_state_name,
          confirmedAt: orderData.confirmed_at ? new Date(orderData.confirmed_at) : confirmation.confirmedAt
        }
      });
      
      console.log(`✅ Updated confirmation: ${orderData.confirmation_state_name} by ${orderData.confirmator?.name || 'N/A'}`);
    } catch (error) {
      console.error(`❌ Error updating confirmation for ${orderData.reference}:`, error);
      throw error;
    }
  }
  
  /**
   * Get webhook configuration by webhook ID
   */
  async getWebhookConfig(webhookId: string): Promise<any> {
    try {
      return await prisma.webhookConfiguration.findFirst({
        where: { ecoManagerWebhookId: parseInt(webhookId) }
      });
    } catch (error) {
      console.error(`Error fetching webhook config for ID ${webhookId}:`, error);
      return null;
    }
  }
  
  /**
   * Update webhook last triggered time
   */
  async updateWebhookLastTriggered(configId: string): Promise<void> {
    try {
      await prisma.webhookConfiguration.update({
        where: { id: configId },
        data: { lastTriggered: new Date() }
      });
    } catch (error) {
      console.error(`Error updating webhook last triggered for ${configId}:`, error);
    }
  }
  
  /**
   * Link confirmation to order (called when order is synced)
   * This is useful when webhook arrives before order sync
   */
  async linkConfirmationToOrder(
    ecoManagerOrderId: number,
    orderId: string
  ): Promise<void> {
    try {
      const confirmation = await prisma.orderConfirmation.findUnique({
        where: { ecoManagerOrderId }
      });
      
      if (confirmation && !confirmation.orderId) {
        await prisma.orderConfirmation.update({
          where: { id: confirmation.id },
          data: { orderId }
        });
        console.log(`🔗 Linked confirmation to order: ${orderId}`);
      }
    } catch (error) {
      console.error(`Error linking confirmation to order:`, error);
    }
  }
  
  /**
   * Get confirmation by order ID
   */
  async getConfirmationByOrderId(orderId: string): Promise<any> {
    try {
      return await prisma.orderConfirmation.findUnique({
        where: { orderId }
      });
    } catch (error) {
      console.error(`Error fetching confirmation for order ${orderId}:`, error);
      return null;
    }
  }
  
  /**
   * Get confirmation by EcoManager order ID
   */
  async getConfirmationByEcoManagerId(ecoManagerOrderId: number): Promise<any> {
    try {
      return await prisma.orderConfirmation.findUnique({
        where: { ecoManagerOrderId }
      });
    } catch (error) {
      console.error(`Error fetching confirmation for EcoManager order ${ecoManagerOrderId}:`, error);
      return null;
    }
  }
}