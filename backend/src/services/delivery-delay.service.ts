import { prisma } from '@/config/database';
import redis from '@/config/redis';

export interface WilayaDeliverySettings {
  id: string;
  wilayaName: string;
  maxDeliveryDays: number;
  isActive: boolean;
}

export interface OrderDelayInfo {
  orderId: string;
  wilaya: string;
  orderDate: Date;
  maxDeliveryDays: number;
  daysSinceOrder: number;
  delayDays: number;
  isDelayed: boolean;
  delayLevel: 'none' | 'warning' | 'critical';
  isDelivered: boolean;
}

export class DeliveryDelayService {
  private static readonly CACHE_KEY = 'wilaya:settings:map';
  private static readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Get wilaya settings map from cache or database
   */
  private async getWilayaSettingsMap(): Promise<Map<string, WilayaDeliverySettings>> {
    try {
      // Try to get from cache first
      const cached = await redis.get(DeliveryDelayService.CACHE_KEY);
      if (cached) {
        const settingsArray = JSON.parse(cached) as WilayaDeliverySettings[];
        return new Map(settingsArray.map(setting => [setting.wilayaName, setting]));
      }

      // Fetch from database
      const settings = await prisma.wilayaDeliverySettings.findMany({
        where: { isActive: true }
      });

      // Cache the results
      await redis.setex(
        DeliveryDelayService.CACHE_KEY,
        DeliveryDelayService.CACHE_TTL,
        JSON.stringify(settings)
      );

      return new Map(settings.map(setting => [setting.wilayaName, setting]));
    } catch (error) {
      console.error('Error fetching wilaya settings:', error);
      return new Map();
    }
  }

  /**
   * Check if an order is delivered based on shipping status
   */
  private isOrderDelivered(shippingStatus?: string): boolean {
    if (!shippingStatus) return false;
    
    const deliveredStatuses = ['LIVRÉ', 'DELIVERED'];
    return deliveredStatuses.includes(shippingStatus.toUpperCase());
  }

  /**
   * Calculate delay information for a single order
   */
  public async calculateOrderDelay(
    orderId: string,
    wilaya: string,
    orderDate: Date,
    shippingStatus?: string
  ): Promise<OrderDelayInfo> {
    const wilayaSettingsMap = await this.getWilayaSettingsMap();
    const wilayaSetting = wilayaSettingsMap.get(wilaya);
    const maxDeliveryDays = wilayaSetting?.maxDeliveryDays || 2; // Default 2 days

    const now = new Date();
    const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    const delayDays = Math.max(0, daysSinceOrder - maxDeliveryDays);
    const isDelivered = this.isOrderDelivered(shippingStatus);

    let delayLevel: 'none' | 'warning' | 'critical' = 'none';
    let isDelayed = false;

    // Only calculate delay if not delivered
    if (!isDelivered) {
      if (delayDays >= 2) {
        delayLevel = 'critical';
        isDelayed = true;
      } else if (delayDays >= 1) {
        delayLevel = 'warning';
        isDelayed = true;
      }
    }

    return {
      orderId,
      wilaya,
      orderDate,
      maxDeliveryDays,
      daysSinceOrder,
      delayDays,
      isDelayed,
      delayLevel,
      isDelivered
    };
  }

  /**
   * Calculate delay information for multiple orders
   */
  public async calculateOrdersDelay(orders: Array<{
    id: string;
    orderDate: Date;
    shippingStatus?: string | null;
    customer: { wilaya: string };
  }>): Promise<Map<string, OrderDelayInfo>> {
    const delayMap = new Map<string, OrderDelayInfo>();

    for (const order of orders) {
      const delayInfo = await this.calculateOrderDelay(
        order.id,
        order.customer.wilaya,
        order.orderDate,
        order.shippingStatus || undefined
      );
      delayMap.set(order.id, delayInfo);
    }

    return delayMap;
  }

  /**
   * Get delay statistics for dashboard
   */
  public async getDelayStatistics(): Promise<{
    totalDelayed: number;
    warningLevel: number;
    criticalLevel: number;
    delayedByWilaya: Array<{ wilaya: string; count: number; avgDelay: number }>;
  }> {
    try {
      // Get all non-delivered orders
      const orders = await prisma.order.findMany({
        where: {
          shippingStatus: {
            notIn: ['LIVRÉ', 'DELIVERED']
          }
        },
        include: {
          customer: {
            select: { wilaya: true }
          }
        }
      });

      const delayMap = await this.calculateOrdersDelay(orders);
      const delayedOrders = Array.from(delayMap.values()).filter(delay => delay.isDelayed);

      const warningLevel = delayedOrders.filter(delay => delay.delayLevel === 'warning').length;
      const criticalLevel = delayedOrders.filter(delay => delay.delayLevel === 'critical').length;

      // Group by wilaya
      const wilayaDelayMap = new Map<string, { count: number; totalDelay: number }>();
      
      delayedOrders.forEach(delay => {
        const existing = wilayaDelayMap.get(delay.wilaya) || { count: 0, totalDelay: 0 };
        wilayaDelayMap.set(delay.wilaya, {
          count: existing.count + 1,
          totalDelay: existing.totalDelay + delay.delayDays
        });
      });

      const delayedByWilaya = Array.from(wilayaDelayMap.entries()).map(([wilaya, data]) => ({
        wilaya,
        count: data.count,
        avgDelay: Math.round(data.totalDelay / data.count * 10) / 10
      }));

      return {
        totalDelayed: delayedOrders.length,
        warningLevel,
        criticalLevel,
        delayedByWilaya
      };
    } catch (error) {
      console.error('Error calculating delay statistics:', error);
      return {
        totalDelayed: 0,
        warningLevel: 0,
        criticalLevel: 0,
        delayedByWilaya: []
      };
    }
  }

  /**
   * Get orders that need deadline notifications for AGENT_SUIVI only
   */
  public async getOrdersNeedingDeadlineNotifications(): Promise<Array<{
    agentId: string;
    agentName: string;
    orders: Array<{
      id: string;
      reference: string;
      delayInfo: OrderDelayInfo;
      customer: { fullName: string; wilaya: string };
    }>;
  }>> {
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
        include: {
          assignedOrders: {
            where: {
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
            }
          }
        }
      });

      const agentNotificationData = [];

      for (const agent of agents) {
        const ordersWithDelays = [];

        for (const order of agent.assignedOrders) {
          const delayInfo = await this.calculateOrderDelay(
            order.id,
            order.customer.wilaya,
            order.orderDate,
            order.shippingStatus || undefined
          );

          // Only include orders that are delayed or approaching deadline (within 6 hours)
          if (delayInfo.isDelayed || (delayInfo.daysSinceOrder >= delayInfo.maxDeliveryDays - 0.25)) {
            ordersWithDelays.push({
              id: order.id,
              reference: order.reference,
              delayInfo,
              customer: order.customer
            });
          }
        }

        if (ordersWithDelays.length > 0) {
          agentNotificationData.push({
            agentId: agent.id,
            agentName: agent.name || agent.email,
            orders: ordersWithDelays
          });
        }
      }

      return agentNotificationData;
    } catch (error) {
      console.error('Error getting orders needing deadline notifications:', error);
      return [];
    }
  }

  /**
   * Get summary statistics for deadline notifications
   */
  public async getDeadlineNotificationSummary(): Promise<{
    totalAgentsWithDelayedOrders: number;
    totalDelayedOrders: number;
    criticalOrders: number;
    warningOrders: number;
    averageDelayDays: number;
  }> {
    try {
      const agentData = await this.getOrdersNeedingDeadlineNotifications();
      
      let totalDelayedOrders = 0;
      let criticalOrders = 0;
      let warningOrders = 0;
      let totalDelayDays = 0;

      agentData.forEach(agent => {
        agent.orders.forEach(order => {
          totalDelayedOrders++;
          totalDelayDays += order.delayInfo.delayDays;
          
          if (order.delayInfo.delayLevel === 'critical') {
            criticalOrders++;
          } else if (order.delayInfo.delayLevel === 'warning') {
            warningOrders++;
          }
        });
      });

      return {
        totalAgentsWithDelayedOrders: agentData.length,
        totalDelayedOrders,
        criticalOrders,
        warningOrders,
        averageDelayDays: totalDelayedOrders > 0 ? totalDelayDays / totalDelayedOrders : 0
      };
    } catch (error) {
      console.error('Error getting deadline notification summary:', error);
      return {
        totalAgentsWithDelayedOrders: 0,
        totalDelayedOrders: 0,
        criticalOrders: 0,
        warningOrders: 0,
        averageDelayDays: 0
      };
    }
  }

  /**
   * Clear wilaya settings cache
   */
  public async clearCache(): Promise<void> {
    await redis.del(DeliveryDelayService.CACHE_KEY);
  }
}

export const deliveryDelayService = new DeliveryDelayService();