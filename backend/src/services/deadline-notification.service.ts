import { prisma } from '@/config/database';
import redis from '@/config/redis';
import { notificationService } from './notification.service';
import { deliveryDelayService } from './delivery-delay.service';
import { NotificationType } from '@prisma/client';

export interface DeadlineOrderInfo {
  id: string;
  reference: string;
  delayDays: number;
  delayLevel: 'warning' | 'critical';
  wilaya: string;
  customerName: string;
  orderDate: Date;
}

export interface AgentDeadlineStats {
  agentId: string;
  agentName: string;
  criticalOrders: DeadlineOrderInfo[];
  warningOrders: DeadlineOrderInfo[];
  totalOrders: number;
  avgDelayDays: number;
}

export class DeadlineNotificationService {
  private readonly MAX_NOTIFICATIONS_PER_15MIN = 10;
  private readonly RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
  private readonly BATCH_SIZE = 100; // Process orders in batches
  private readonly CACHE_TTL = 3600; // 1 hour cache

  /**
   * Check if agent can receive more notifications (rate limiting)
   */
  private async checkRateLimit(agentId: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = `notification_rate_limit:${agentId}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, this.RATE_LIMIT_WINDOW);
      }
      
      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= this.MAX_NOTIFICATIONS_PER_15MIN,
        remaining: Math.max(0, this.MAX_NOTIFICATIONS_PER_15MIN - current),
        resetTime
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Allow notification if Redis fails
      return { allowed: true, remaining: this.MAX_NOTIFICATIONS_PER_15MIN, resetTime: Date.now() + (this.RATE_LIMIT_WINDOW * 1000) };
    }
  }

  /**
   * Get orders approaching or past deadline for a specific agent
   */
  private async getDeadlineOrdersForAgent(agentId: string): Promise<DeadlineOrderInfo[]> {
    try {
      // Get orders assigned to agent that are not delivered or cancelled
      const orders = await prisma.order.findMany({
        where: {
          assignedAgentId: agentId,
          shippingStatus: {
            notIn: ['LIVRÉ', 'DELIVERED', 'ANNULÉ'] // Exclude delivered and cancelled orders
          },
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS', 'CONFIRMED']
          }
        },
        include: {
          customer: {
            select: {
              fullName: true,
              wilaya: true
            }
          }
        },
        orderBy: {
          orderDate: 'asc'
        }
      });

      const deadlineOrders: DeadlineOrderInfo[] = [];

      for (const order of orders) {
        const delayInfo = await deliveryDelayService.calculateOrderDelay(
          order.id,
          order.customer.wilaya,
          order.orderDate,
          order.shippingStatus || undefined
        );

        // Only include orders that are delayed or approaching deadline (within 6 hours)
        if (delayInfo.isDelayed || (delayInfo.daysSinceOrder >= delayInfo.maxDeliveryDays - 0.25)) {
          deadlineOrders.push({
            id: order.id,
            reference: order.reference,
            delayDays: delayInfo.delayDays,
            delayLevel: delayInfo.delayLevel as 'warning' | 'critical',
            wilaya: order.customer.wilaya,
            customerName: order.customer.fullName,
            orderDate: order.orderDate
          });
        }
      }

      return deadlineOrders;
    } catch (error) {
      console.error(`Error getting deadline orders for agent ${agentId}:`, error);
      return [];
    }
  }

  /**
   * Create aggregated notification message
   */
  private createBatchedNotificationMessage(stats: AgentDeadlineStats): { title: string; message: string } {
    const { criticalOrders, warningOrders, totalOrders, avgDelayDays } = stats;
    
    let title = '';
    let message = '';
    
    if (criticalOrders.length > 0 && warningOrders.length > 0) {
      // Both critical and warning orders
      title = `🚨 URGENT: ${totalOrders} orders need attention`;
      message = `${criticalOrders.length} CRITICAL orders overdue (avg ${avgDelayDays.toFixed(1)} days), ${warningOrders.length} WARNING orders approaching deadline. `;
    } else if (criticalOrders.length > 0) {
      // Only critical orders
      title = `🚨 CRITICAL: ${criticalOrders.length} orders overdue`;
      message = `${criticalOrders.length} orders are overdue by an average of ${avgDelayDays.toFixed(1)} days. `;
    } else if (warningOrders.length > 0) {
      // Only warning orders
      title = `⚠️ WARNING: ${warningOrders.length} orders approaching deadline`;
      message = `${warningOrders.length} orders are approaching their delivery deadline. `;
    }

    // Add top 3 most urgent orders to message
    const topOrders = [...criticalOrders, ...warningOrders]
      .sort((a, b) => b.delayDays - a.delayDays)
      .slice(0, 3);
    
    if (topOrders.length > 0) {
      message += `Most urgent: ${topOrders.map(o => `#${o.reference} (${o.delayDays > 0 ? `+${o.delayDays}d` : 'due soon'})`).join(', ')}`;
    }

    return { title, message };
  }

  /**
   * Send batched deadline notification to agent
   */
  private async sendBatchedNotification(stats: AgentDeadlineStats): Promise<boolean> {
    try {
      // Check rate limit
      const rateLimit = await this.checkRateLimit(stats.agentId);
      if (!rateLimit.allowed) {
        console.log(`📊 Rate limit exceeded for agent ${stats.agentName} (${stats.agentId}). ${rateLimit.remaining} notifications remaining. Reset at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`);
        return false;
      }

      // Create notification message
      const { title, message } = this.createBatchedNotificationMessage(stats);

      // Send single batched notification using the simplified method
      await notificationService.createBatchedDeadlineNotification(
        stats.agentId,
        title,
        message,
        [...stats.criticalOrders, ...stats.warningOrders].map(o => o.id)
      );

      console.log(`✅ Batched deadline notification sent to ${stats.agentName}: ${stats.totalOrders} orders (${stats.criticalOrders.length} critical, ${stats.warningOrders.length} warning)`);
      return true;
    } catch (error) {
      console.error(`Error sending batched notification to agent ${stats.agentId}:`, error);
      return false;
    }
  }

  /**
   * Process deadline notifications for a single agent
   */
  private async processAgentDeadlines(agentId: string, agentName: string): Promise<boolean> {
    try {
      const deadlineOrders = await this.getDeadlineOrdersForAgent(agentId);
      
      if (deadlineOrders.length === 0) {
        return false; // No orders need attention
      }

      // Categorize orders
      const criticalOrders = deadlineOrders.filter(o => o.delayLevel === 'critical');
      const warningOrders = deadlineOrders.filter(o => o.delayLevel === 'warning');
      
      // Calculate average delay
      const totalDelayDays = deadlineOrders.reduce((sum, order) => sum + order.delayDays, 0);
      const avgDelayDays = totalDelayDays / deadlineOrders.length;

      const stats: AgentDeadlineStats = {
        agentId,
        agentName,
        criticalOrders,
        warningOrders,
        totalOrders: deadlineOrders.length,
        avgDelayDays
      };

      return await this.sendBatchedNotification(stats);
    } catch (error) {
      console.error(`Error processing deadlines for agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Process deadline notifications for all active agents
   */
  public async processAllAgentDeadlines(): Promise<{
    processedAgents: number;
    notificationsSent: number;
    rateLimitedAgents: number;
    totalOrdersProcessed: number;
  }> {
    const startTime = Date.now();
    console.log('🚀 Starting deadline notification processing...');

    try {
      // Get all active AGENT_SUIVI with assigned orders
      const agents = await prisma.user.findMany({
        where: {
          role: 'AGENT_SUIVI', // Only AGENT_SUIVI
          isActive: true,
          assignedOrders: {
            some: {
              shippingStatus: {
                notIn: ['LIVRÉ', 'DELIVERED', 'ANNULÉ'] // Exclude delivered and cancelled orders
              },
              status: {
                in: ['ASSIGNED', 'IN_PROGRESS', 'CONFIRMED']
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              assignedOrders: {
                where: {
                  shippingStatus: {
                    notIn: ['LIVRÉ', 'DELIVERED', 'ANNULÉ'] // Exclude delivered and cancelled orders
                  },
                  status: {
                    in: ['ASSIGNED', 'IN_PROGRESS', 'CONFIRMED']
                  }
                }
              }
            }
          }
        }
      });

      let processedAgents = 0;
      let notificationsSent = 0;
      let rateLimitedAgents = 0;
      let totalOrdersProcessed = 0;

      // Process agents in batches to avoid overwhelming the system
      for (let i = 0; i < agents.length; i += this.BATCH_SIZE) {
        const batch = agents.slice(i, i + this.BATCH_SIZE);
        
        const batchPromises = batch.map(async (agent) => {
          const agentName = agent.name || agent.email;
          const success = await this.processAgentDeadlines(agent.id, agentName);
          
          processedAgents++;
          totalOrdersProcessed += agent._count.assignedOrders;
          
          if (success) {
            notificationsSent++;
          } else {
            // Check if it was due to rate limiting
            const rateLimit = await this.checkRateLimit(agent.id);
            if (!rateLimit.allowed) {
              rateLimitedAgents++;
            }
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (i + this.BATCH_SIZE < agents.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const duration = Date.now() - startTime;
      const stats = {
        processedAgents,
        notificationsSent,
        rateLimitedAgents,
        totalOrdersProcessed
      };

      console.log('✅ Deadline notification processing completed:');
      console.log(`   📊 Processed: ${processedAgents} agents in ${duration}ms`);
      console.log(`   📨 Notifications sent: ${notificationsSent}`);
      console.log(`   🚫 Rate limited agents: ${rateLimitedAgents}`);
      console.log(`   📦 Total orders processed: ${totalOrdersProcessed}`);

      // Cache processing stats
      await redis.setex('deadline_notification_stats', this.CACHE_TTL, JSON.stringify({
        ...stats,
        lastRun: new Date().toISOString(),
        duration
      }));

      return stats;
    } catch (error) {
      console.error('Error processing agent deadlines:', error);
      return {
        processedAgents: 0,
        notificationsSent: 0,
        rateLimitedAgents: 0,
        totalOrdersProcessed: 0
      };
    }
  }

  /**
   * Get deadline notification statistics
   */
  public async getDeadlineStats(): Promise<any> {
    try {
      const cached = await redis.get('deadline_notification_stats');
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting deadline stats:', error);
      return null;
    }
  }

  /**
   * Clear rate limits for all agents (admin function)
   */
  public async clearAllRateLimits(): Promise<number> {
    try {
      const keys = await redis.keys('notification_rate_limit:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🧹 Cleared rate limits for ${keys.length} agents`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error('Error clearing rate limits:', error);
      return 0;
    }
  }

  /**
   * Get rate limit status for specific agent
   */
  public async getAgentRateLimit(agentId: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    return await this.checkRateLimit(agentId);
  }

  /**
   * Manual trigger for testing (bypasses rate limiting)
   */
  public async testDeadlineNotification(agentId: string): Promise<boolean> {
    try {
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        select: { name: true, email: true }
      });

      if (!agent) {
        console.error(`Agent ${agentId} not found`);
        return false;
      }

      const agentName = agent.name || agent.email;
      console.log(`🧪 Testing deadline notification for agent: ${agentName}`);
      
      return await this.processAgentDeadlines(agentId, agentName);
    } catch (error) {
      console.error(`Error testing deadline notification for agent ${agentId}:`, error);
      return false;
    }
  }
}

export const deadlineNotificationService = new DeadlineNotificationService();