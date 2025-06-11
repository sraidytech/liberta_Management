import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { getMaystroService } from '@/services/maystro.service';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class MaystroWebhookController {
  /**
   * Handle incoming Maystro webhooks
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      console.log('🔔 Received Maystro webhook:', {
        headers: req.headers,
        body: req.body
      });

      // Maystro sends data encoded in base64, we need to decode it twice
      let webhookData: any;

      try {
        if (req.body.message && req.body.message.data) {
          // Decode base64 data twice as per Maystro documentation
          const decodedOnce = Buffer.from(req.body.message.data, 'base64').toString();
          webhookData = JSON.parse(decodedOnce);
        } else if (typeof req.body === 'string') {
          // If body is a string, try to parse it directly
          webhookData = JSON.parse(req.body);
        } else {
          // If body is already an object, use it directly
          webhookData = req.body;
        }
      } catch (parseError) {
        console.error('❌ Error parsing webhook data:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook data format'
        });
      }

      console.log('📦 Parsed webhook data:', webhookData);

      // Process the webhook using Maystro service
      const maystroService = getMaystroService(redis);
      const result = await maystroService.processWebhook(webhookData);

      if (result.success) {
        console.log('✅ Webhook processed successfully:', result.message);
        
        // Send success response
        res.status(200).json({
          success: true,
          message: result.message,
          orderId: result.orderId
        });
      } else {
        console.log('⚠️ Webhook processing failed:', result.message);
        
        // Still send 200 to prevent Maystro from retrying
        res.status(200).json({
          success: false,
          message: result.message
        });
      }

    } catch (error: any) {
      console.error('❌ Error handling Maystro webhook:', error);

      // Log the error but still return 200 to prevent retries
      await prisma.webhookEvent.create({
        data: {
          source: 'MAYSTRO',
          eventType: 'error',
          payload: {
            error: error.message,
            body: req.body,
            headers: req.headers
          },
          processed: false,
          error: error.message
        }
      }).catch(dbError => {
        console.error('❌ Error saving webhook error to database:', dbError);
      });

      res.status(200).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get webhook events history
   */
  async getWebhookEvents(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 25,
        source = 'MAYSTRO',
        processed,
        eventType
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = { source };

      if (processed !== undefined) {
        where.processed = processed === 'true';
      }

      if (eventType) {
        where.eventType = eventType;
      }

      const [events, totalCount] = await Promise.all([
        prisma.webhookEvent.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                reference: true,
                status: true,
                shippingStatus: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limitNum
        }),
        prisma.webhookEvent.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        success: true,
        data: {
          events,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCount,
            limit: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      console.error('Get webhook events error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch webhook events'
        }
      });
    }
  }

  /**
   * Retry failed webhook event
   */
  async retryWebhookEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const webhookEvent = await prisma.webhookEvent.findUnique({
        where: { id }
      });

      if (!webhookEvent) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Webhook event not found'
          }
        });
      }

      if (webhookEvent.processed) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Webhook event already processed'
          }
        });
      }

      // Process the webhook using Maystro service
      const maystroService = getMaystroService(redis);
      const result = await maystroService.processWebhook(webhookEvent.payload);

      // Update the webhook event
      await prisma.webhookEvent.update({
        where: { id },
        data: {
          processed: result.success,
          error: result.success ? null : result.message
        }
      });

      res.json({
        success: true,
        data: result,
        message: result.success ? 'Webhook event processed successfully' : 'Webhook event processing failed'
      });

    } catch (error) {
      console.error('Retry webhook event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retry webhook event'
        }
      });
    }
  }

  /**
   * Delete webhook event
   */
  async deleteWebhookEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deletedEvent = await prisma.webhookEvent.delete({
        where: { id }
      });

      res.json({
        success: true,
        data: deletedEvent,
        message: 'Webhook event deleted successfully'
      });

    } catch (error) {
      console.error('Delete webhook event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete webhook event'
        }
      });
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(req: Request, res: Response) {
    try {
      const { source = 'MAYSTRO', period = '7d' } = req.query;

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const whereClause: any = {
        source,
        createdAt: {
          gte: startDate
        }
      };

      const [
        totalEvents,
        processedEvents,
        failedEvents,
        eventsByType
      ] = await Promise.all([
        prisma.webhookEvent.count({ where: whereClause }),
        prisma.webhookEvent.count({ where: { ...whereClause, processed: true } }),
        prisma.webhookEvent.count({ where: { ...whereClause, processed: false } }),
        prisma.webhookEvent.groupBy({
          by: ['eventType'],
          where: whereClause,
          _count: {
            id: true
          }
        })
      ]);

      const stats = {
        totalEvents,
        processedEvents,
        failedEvents,
        successRate: totalEvents > 0 ? Math.round((processedEvents / totalEvents) * 100) : 0,
        eventsByType: eventsByType.map(item => ({
          eventType: item.eventType,
          count: item._count.id
        })),
        period
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get webhook stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch webhook statistics'
        }
      });
    }
  }
}