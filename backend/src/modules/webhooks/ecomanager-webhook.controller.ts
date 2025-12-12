import { Request, Response } from 'express';
import crypto from 'crypto';
import { OrderConfirmationService } from '../../services/order-confirmation.service';

export class EcoManagerWebhookController {
  private confirmationService: OrderConfirmationService;

  constructor() {
    this.confirmationService = new OrderConfirmationService();
  }

  /**
   * Verify HMAC signature from EcoManager
   * CRITICAL: Uses timing-safe comparison to prevent timing attacks
   */
  private verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const calculatedSignature = hmac.digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle webhook validation (GET request)
   * EcoManager sends GET request to validate webhook URL is reachable
   */
  async handleValidation(req: Request, res: Response): Promise<Response> {
    console.log('✅ EcoManager webhook validation request received');
    return res.status(200).send('OK');
  }

  /**
   * Handle webhook events (POST request)
   * Must respond within 5 seconds (EcoManager requirement)
   */
  async handleWebhook(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // Extract headers
      const signature = req.headers['x-ecomanager-signature'] as string;
      const source = req.headers['x-ecomanager-source'] as string;
      const eventType = req.headers['x-ecomanager-event'] as string;
      const webhookId = req.headers['x-ecomanager-webhook-id'] as string;

      console.log(`📥 Webhook received: ${eventType} from ${source} (ID: ${webhookId})`);

      // Validate required headers
      if (!signature || !eventType || !webhookId) {
        console.error('❌ Missing required headers');
        return res.status(400).json({ error: 'Missing required headers' });
      }

      // Get raw body for signature verification
      const rawBody = JSON.stringify(req.body);

      // Find webhook configuration
      const webhookConfig = await this.confirmationService.getWebhookConfig(webhookId);
      
      if (!webhookConfig) {
        console.error(`❌ Webhook configuration not found for ID: ${webhookId}`);
        return res.status(404).json({ error: 'Webhook not configured' });
      }

      // Verify signature (CRITICAL for security)
      if (!this.verifySignature(rawBody, signature, webhookConfig.webhookSecret)) {
        console.error('❌ Invalid webhook signature - possible security breach attempt');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('✅ Signature verified');

      // Process webhook based on event type
      const orderData = req.body;
      
      switch (eventType) {
        case 'OrderCreated':
          await this.confirmationService.handleOrderCreated(
            orderData, 
            webhookConfig.storeIdentifier
          );
          break;
          
        case 'OrderConfirmationStatusChanged':
          await this.confirmationService.handleConfirmationChanged(
            orderData, 
            webhookConfig.storeIdentifier
          );
          break;
          
        default:
          console.log(`⚠️ Unhandled event type: ${eventType}`);
      }

      // Update last triggered time
      await this.confirmationService.updateWebhookLastTriggered(webhookConfig.id);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Webhook processed in ${processingTime}ms`);

      // Respond within 5 seconds (EcoManager requirement)
      return res.status(200).json({
        success: true,
        processingTime: `${processingTime}ms`
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Webhook processing error (${processingTime}ms):`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}