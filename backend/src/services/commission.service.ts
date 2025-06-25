import { PrismaClient, User, Order, OrderItem, UserRole } from '@prisma/client';
import redis from '@/config/redis';
import { DefaultCommissionSettingsService, DefaultCommissionSettingsData } from './default-commission-settings.service';

const prisma = new PrismaClient();

interface CommissionCriteria {
  baseCommissions: {
    orders1500Plus: number;
  };
  confirmationTiers: {
    tier78Percent: number;
    tier80Percent: number;
    tier82Percent: number;
  };
  bonusCommissions: {
    upsell: {
      commission: number;
      minPercent: number;
    };
    pack2: {
      commission: number;
      minPercent: number;
    };
    pack4: {
      commission: number;
      minPercent: number;
    };
  };
  customCriteria?: {
    [key: string]: {
      commission: number;
      conditions: any;
    };
  };
}

interface ProductMetrics {
  totalOrders: number;
  pack2Percent: number;
  pack4Percent: number;
  upsellPercent: number;
}

interface CommissionBreakdown {
  product: string;
  total: number;
  details: {
    baseCommission?: number;
    tier78?: number;
    tier80?: number;
    tier82?: number;
    upsellBonus?: number;
    pack2Bonus?: number;
    pack4Bonus?: number;
    [key: string]: number | undefined;
  };
  metrics: ProductMetrics;
}

interface CommissionResult {
  totalCommission: number;
  breakdown: CommissionBreakdown[];
  agentInfo: {
    id: string;
    name: string;
    agentCode: string;
    confirmationRate: number;
    totalOrders: number;
  };
  period: {
    startDate: Date;
    endDate: Date;
    type: string;
  };
}

export class CommissionService {
  private defaultCommissionSettingsService = new DefaultCommissionSettingsService();

  /**
   * Get default commission criteria from database settings
   */
  private async getDefaultCommissionCriteria(): Promise<CommissionCriteria> {
    try {
      const settings = await this.defaultCommissionSettingsService.getDefaultSettings();
      
      return {
        baseCommissions: {
          orders1500Plus: settings.baseCommission
        },
        confirmationTiers: {
          tier78Percent: settings.tier78Bonus,
          tier80Percent: settings.tier80Bonus,
          tier82Percent: settings.tier82Bonus
        },
        bonusCommissions: {
          upsell: {
            commission: settings.upsellBonus,
            minPercent: settings.upsellMinPercent
          },
          pack2: {
            commission: settings.pack2Bonus,
            minPercent: settings.pack2MinPercent
          },
          pack4: {
            commission: settings.pack4Bonus,
            minPercent: settings.pack4MinPercent
          }
        }
      };
    } catch (error) {
      console.error('Error fetching default commission settings, using fallback:', error);
      // Fallback to hardcoded values if database fails
      return {
        baseCommissions: {
          orders1500Plus: 5000
        },
        confirmationTiers: {
          tier78Percent: 4000,
          tier80Percent: 4500,
          tier82Percent: 5000
        },
        bonusCommissions: {
          upsell: {
            commission: 1000,
            minPercent: 30
          },
          pack2: {
            commission: 500,
            minPercent: 50
          },
          pack4: {
            commission: 600,
            minPercent: 25
          }
        }
      };
    }
  }
  /**
   * Calculate agent commission for a specific period
   */
  async calculateAgentCommission(
    agentId: string,
    startDate: Date,
    endDate: Date,
    period: 'weekly' | 'monthly' = 'monthly',
    thresholdMode: 'product' | 'total' = 'product'
  ): Promise<CommissionResult> {
    try {
      // Get agent information
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          name: true,
          agentCode: true,
          role: true
        }
      });

      if (!agent || agent.role !== UserRole.AGENT_SUIVI) {
        throw new Error('Agent not found or not a Suivi agent');
      }

      console.log(`🔍 Calculating commission for ${agent.name} (${agent.agentCode})`);

      // Get agent's orders for the period
      const orders = await this.getAgentOrders(agentId, startDate, endDate);
      console.log(`📦 Found ${orders.length} orders for ${agent.agentCode}`);
      
      console.log(`📊 Using threshold mode: ${thresholdMode} (${thresholdMode === 'product' ? 'per-product 1500+' : 'total 1500+'})`);

      // Handle total mode: calculate one overall commission based on total orders
      if (thresholdMode === 'total') {
        if (orders.length < 1500) {
          console.log(`⚠️ Agent ${agent.agentCode} has only ${orders.length} total orders (< 1500), no commission`);
          return {
            totalCommission: 0,
            breakdown: [],
            agentInfo: {
              id: agent.id,
              name: agent.name || '',
              agentCode: agent.agentCode || '',
              confirmationRate: 0,
              totalOrders: orders.length
            },
            period: {
              startDate,
              endDate,
              type: period
            }
          };
        }

        console.log(`✅ Agent ${agent.agentCode} has ${orders.length} total orders (>= 1500), calculating overall commission`);
        
        // Calculate overall confirmation rate (weighted average)
        let totalConfirmationRate = 0;
        let totalProductQuantity = 0;

        // Group orders by product to get product-specific rates
        const productGroups = this.groupOrdersByProduct(orders);
        
        for (const [productName, productOrders] of productGroups) {
          const productConfirmationRate = await this.getAgentProductConfirmationRate(
            agentId,
            productName,
            startDate,
            endDate
          );
          
          const productQuantity = productOrders.reduce((sum, order) =>
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
          );
          
          totalConfirmationRate += productConfirmationRate * productQuantity;
          totalProductQuantity += productQuantity;
        }

        const overallConfirmationRate = totalProductQuantity > 0
          ? Math.round((totalConfirmationRate / totalProductQuantity) * 100) / 100
          : 0;

        console.log(`📊 Overall confirmation rate: ${overallConfirmationRate}%`);

        // Calculate one overall commission using configurable default criteria
        const defaultCriteria = await this.getDefaultCommissionCriteria();

        let totalCommission = 0;
        const details: any = {};

        // Base commission
        totalCommission += defaultCriteria.baseCommissions.orders1500Plus;
        details.baseCommission = defaultCriteria.baseCommissions.orders1500Plus;

        // Confirmation tier commissions (cumulative)
        if (overallConfirmationRate >= 78) {
          totalCommission += defaultCriteria.confirmationTiers.tier78Percent;
          details.tier78 = defaultCriteria.confirmationTiers.tier78Percent;
        }
        if (overallConfirmationRate >= 80) {
          totalCommission += defaultCriteria.confirmationTiers.tier80Percent;
          details.tier80 = defaultCriteria.confirmationTiers.tier80Percent;
        }
        if (overallConfirmationRate >= 82) {
          totalCommission += defaultCriteria.confirmationTiers.tier82Percent;
          details.tier82 = defaultCriteria.confirmationTiers.tier82Percent;
        }

        // Calculate overall metrics
        const overallMetrics = this.calculateProductMetrics(orders);

        // Bonus commissions
        if (overallMetrics.upsellPercent >= defaultCriteria.bonusCommissions.upsell.minPercent) {
          totalCommission += defaultCriteria.bonusCommissions.upsell.commission;
          details.upsellBonus = defaultCriteria.bonusCommissions.upsell.commission;
        }

        if (overallMetrics.pack2Percent >= defaultCriteria.bonusCommissions.pack2.minPercent) {
          totalCommission += defaultCriteria.bonusCommissions.pack2.commission;
          details.pack2Bonus = defaultCriteria.bonusCommissions.pack2.commission;
        }

        if (overallMetrics.pack4Percent >= defaultCriteria.bonusCommissions.pack4.minPercent) {
          totalCommission += defaultCriteria.bonusCommissions.pack4.commission;
          details.pack4Bonus = defaultCriteria.bonusCommissions.pack4.commission;
        }

        console.log(`💰 Total commission (total mode): ${totalCommission} DA`);

        return {
          totalCommission,
          breakdown: [{
            product: 'Overall Performance',
            total: totalCommission,
            details,
            metrics: {
              totalOrders: orders.length,
              pack2Percent: overallMetrics.pack2Percent,
              pack4Percent: overallMetrics.pack4Percent,
              upsellPercent: overallMetrics.upsellPercent
            }
          }],
          agentInfo: {
            id: agent.id,
            name: agent.name || '',
            agentCode: agent.agentCode || '',
            confirmationRate: overallConfirmationRate,
            totalOrders: orders.length
          },
          period: {
            startDate,
            endDate,
            type: period
          }
        };
      }

      // Group orders by product
      let productGroups;
      try {
        productGroups = this.groupOrdersByProduct(orders);
        console.log(`📊 Product groups for ${agent.agentCode}:`, productGroups.size);
      } catch (error) {
        console.error(`❌ Error grouping products for ${agent.agentCode}:`, error);
        throw error;
      }
      
      if (productGroups.size === 0) {
        console.log(`❌ No product groups found for ${agent.agentCode}! Checking first few orders...`);
        orders.slice(0, 3).forEach((order, i) => {
          console.log(`  Order ${i + 1}: ${order.reference}, Items: ${order.items.length}`);
          order.items.forEach((item, j) => {
            console.log(`    Item ${j + 1}: "${item.title}" (qty: ${item.quantity})`);
          });
        });
      }
      
      const commissionBreakdown: CommissionBreakdown[] = [];
      let totalCommission = 0;
      let totalConfirmationRate = 0;
      let totalProductQuantity = 0;

      // Calculate commission for each product with product-specific confirmation rates
      for (const [productName, productOrders] of productGroups) {
        console.log(`🎯 Processing product: ${productName} (${productOrders.length} orders)`);
        
        // Get product-specific confirmation rate
        const productConfirmationRate = await this.getAgentProductConfirmationRate(
          agentId,
          productName,
          startDate,
          endDate
        );
        
        console.log(`📊 Product rate for ${productName}: ${productConfirmationRate}%`);
        
        const productCommission = await this.calculateProductCommission(
          productName,
          productOrders,
          productConfirmationRate,
          thresholdMode
        );
        commissionBreakdown.push(productCommission);
        totalCommission += productCommission.total;
        
        // Calculate total quantity for this product (sum of quantities from all orders)
        const productQuantity = productOrders.reduce((sum, order) => {
          return sum + order.items
            .filter(item => this.extractProductName(item.title) === productName)
            .reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);
        
        // Calculate weighted average confirmation rate based on product quantities
        totalConfirmationRate += productConfirmationRate * productQuantity;
        totalProductQuantity += productQuantity;
      }

      // Calculate overall confirmation rate (weighted average by product quantity)
      const overallConfirmationRate = totalProductQuantity > 0
        ? Math.round((totalConfirmationRate / totalProductQuantity) * 100) / 100 // Round to 2 decimal places
        : 0;

      return {
        totalCommission,
        breakdown: commissionBreakdown,
        agentInfo: {
          id: agent.id,
          name: agent.name || '',
          agentCode: agent.agentCode || '',
          confirmationRate: overallConfirmationRate,
          totalOrders: orders.length
        },
        period: {
          startDate,
          endDate,
          type: period
        }
      };
    } catch (error) {
      console.error('Commission calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate commission for a specific product
   */
  private async calculateProductCommission(
    productName: string,
    orders: (Order & { items: OrderItem[] })[],
    confirmationRate: number,
    thresholdMode: 'product' | 'total' = 'product'
  ): Promise<CommissionBreakdown> {
    // Check minimum threshold only if using product-specific mode
    if (thresholdMode === 'product' && orders.length < 1500) {
      console.log(`⚠️ Product ${productName} has only ${orders.length} orders (< 1500), no commission (product mode)`);
      return {
        product: productName,
        total: 0,
        details: {},
        metrics: {
          totalOrders: orders.length,
          pack2Percent: 0,
          pack4Percent: 0,
          upsellPercent: 0
        }
      };
    }

    if (thresholdMode === 'product') {
      console.log(`✅ Product ${productName} has ${orders.length} orders (>= 1500), calculating commission (product mode)`);
    } else {
      console.log(`✅ Product ${productName} calculating commission (total mode - threshold already checked)`);
    }

    // Get product commission configuration
    const productConfig = await prisma.productCommission.findUnique({
      where: { productName }
    });

    if (!productConfig) {
      console.log(`⚠️ No commission config found for product: ${productName}, using default config`);
      // Use configurable default commission structure when no specific config exists
      const defaultCriteria = await this.getDefaultCommissionCriteria();
      
      // Calculate commission using default criteria
      let commission = 0;
      const details: any = {};

      // Base commission (product already has 1500+ orders)
      commission += defaultCriteria.baseCommissions.orders1500Plus;
      details.baseCommission = defaultCriteria.baseCommissions.orders1500Plus;

      // Confirmation tier commissions (cumulative)
      if (confirmationRate >= 78) {
        commission += defaultCriteria.confirmationTiers.tier78Percent;
        details.tier78 = defaultCriteria.confirmationTiers.tier78Percent;
      }
      if (confirmationRate >= 80) {
        commission += defaultCriteria.confirmationTiers.tier80Percent;
        details.tier80 = defaultCriteria.confirmationTiers.tier80Percent;
      }
      if (confirmationRate >= 82) {
        commission += defaultCriteria.confirmationTiers.tier82Percent;
        details.tier82 = defaultCriteria.confirmationTiers.tier82Percent;
      }

      // Calculate product metrics
      const metrics = this.calculateProductMetrics(orders);

      // Bonus commissions
      if (metrics.upsellPercent >= defaultCriteria.bonusCommissions.upsell.minPercent) {
        commission += defaultCriteria.bonusCommissions.upsell.commission;
        details.upsellBonus = defaultCriteria.bonusCommissions.upsell.commission;
      }

      if (metrics.pack2Percent >= defaultCriteria.bonusCommissions.pack2.minPercent) {
        commission += defaultCriteria.bonusCommissions.pack2.commission;
        details.pack2Bonus = defaultCriteria.bonusCommissions.pack2.commission;
      }

      if (metrics.pack4Percent >= defaultCriteria.bonusCommissions.pack4.minPercent) {
        commission += defaultCriteria.bonusCommissions.pack4.commission;
        details.pack4Bonus = defaultCriteria.bonusCommissions.pack4.commission;
      }

      return {
        product: productName,
        total: commission,
        details,
        metrics
      };
    }

    const criteria = productConfig.commissionCriteria as unknown as CommissionCriteria;
    let commission = 0;
    const details: any = {};

    // Base commission (product already has 1500+ orders)
    commission += criteria.baseCommissions.orders1500Plus;
    details.baseCommission = criteria.baseCommissions.orders1500Plus;

    // Confirmation tier commissions (cumulative)
    if (confirmationRate >= 78) {
      commission += criteria.confirmationTiers.tier78Percent;
      details.tier78 = criteria.confirmationTiers.tier78Percent;
    }
    if (confirmationRate >= 80) {
      commission += criteria.confirmationTiers.tier80Percent;
      details.tier80 = criteria.confirmationTiers.tier80Percent;
    }
    if (confirmationRate >= 82) {
      commission += criteria.confirmationTiers.tier82Percent;
      details.tier82 = criteria.confirmationTiers.tier82Percent;
    }

    // Calculate product metrics
    const metrics = this.calculateProductMetrics(orders);

    // Bonus commissions
    if (metrics.upsellPercent >= criteria.bonusCommissions.upsell.minPercent) {
      commission += criteria.bonusCommissions.upsell.commission;
      details.upsellBonus = criteria.bonusCommissions.upsell.commission;
    }

    if (metrics.pack2Percent >= criteria.bonusCommissions.pack2.minPercent) {
      commission += criteria.bonusCommissions.pack2.commission;
      details.pack2Bonus = criteria.bonusCommissions.pack2.commission;
    }

    if (metrics.pack4Percent >= criteria.bonusCommissions.pack4.minPercent) {
      commission += criteria.bonusCommissions.pack4.commission;
      details.pack4Bonus = criteria.bonusCommissions.pack4.commission;
    }

    // Custom criteria (extensible)
    if (criteria.customCriteria) {
      for (const [key, customRule] of Object.entries(criteria.customCriteria)) {
        if (this.evaluateCustomCriteria(customRule.conditions, orders, metrics)) {
          commission += customRule.commission;
          details[key] = customRule.commission;
        }
      }
    }

    return {
      product: productName,
      total: commission,
      details,
      metrics
    };
  }

  /**
   * Get agent's orders for a specific period
   */
  private async getAgentOrders(agentId: string, startDate: Date, endDate: Date) {
    return await prisma.order.findMany({
      where: {
        assignedAgentId: agentId,
        orderDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        items: true
      }
    });
  }

  /**
   * Get agent's confirmation rate for a specific product
   */
  private async getAgentProductConfirmationRate(
    agentId: string,
    productName: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // First try to get product-specific rate
    const productRate = await prisma.agentProductConfirmationRate.findFirst({
      where: {
        agentId,
        productName,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (productRate) {
      return productRate.confirmationRate;
    }

    // Fallback to general agent confirmation rate
    return await this.getAgentConfirmationRate(agentId, startDate, endDate);
  }

  /**
   * Get agent's general confirmation rate (manually set)
   */
  private async getAgentConfirmationRate(agentId: string, startDate: Date, endDate: Date): Promise<number> {
    const rate = await prisma.agentCommissionRate.findFirst({
      where: {
        agentId,
        startDate: { lte: startDate },
        endDate: { gte: endDate },
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return rate?.confirmationRate || 0;
  }

  /**
   * Group orders by product name
   */
  private groupOrdersByProduct(orders: (Order & { items: OrderItem[] })[]): Map<string, (Order & { items: OrderItem[] })[]> {
    const productGroups = new Map<string, (Order & { items: OrderItem[] })[]>();

    try {
      orders.forEach((order, orderIndex) => {
        if (!order.items || order.items.length === 0) {
          console.log(`⚠️ Order ${order.reference} has no items`);
          return;
        }
        
        order.items.forEach((item, itemIndex) => {
          try {
            if (!item.title) {
              console.log(`⚠️ Order ${order.reference}, item ${itemIndex} has no title`);
              return;
            }
            
            const productName = this.extractProductName(item.title);
            if (!productName || productName.trim() === '') {
              console.log(`⚠️ Order ${order.reference}, item "${item.title}" produced empty product name`);
              return;
            }
            
            if (!productGroups.has(productName)) {
              productGroups.set(productName, []);
            }
            productGroups.get(productName)!.push(order);
          } catch (itemError) {
            console.error(`❌ Error processing item ${itemIndex} in order ${order.reference}:`, itemError);
          }
        });
      });
    } catch (error) {
      console.error(`❌ Error in groupOrdersByProduct:`, error);
      throw error;
    }

    return productGroups;
  }

  /**
   * Extract product name from item title
   */
  private extractProductName(title: string): string {
    // Remove pack quantity indicators and normalize
    return title
      .toLowerCase()
      .replace(/\s*\(\d+\)\s*/, '') // Remove (4), (2), etc.
      .replace(/pack\s+/i, '') // Remove "pack" prefix
      .trim();
  }

  /**
   * Calculate product metrics (Pack 2%, Pack 4%, Upsell%)
   */
  private calculateProductMetrics(orders: (Order & { items: OrderItem[] })[]): ProductMetrics {
    const totalOrders = orders.length;
    let pack2Orders = 0;
    let pack4Orders = 0;
    let upsellOrders = 0;

    orders.forEach(order => {
      // Check for pack quantities
      const hasPack2 = order.items.some(item => this.getPackQuantity(item.title) === 2);
      const hasPack4 = order.items.some(item => this.getPackQuantity(item.title) === 4);
      
      if (hasPack2) pack2Orders++;
      if (hasPack4) pack4Orders++;
      
      // Check for upsell (multiple items in order)
      if (order.items.length > 1) {
        upsellOrders++;
      }
    });

    return {
      totalOrders,
      pack2Percent: totalOrders > 0 ? (pack2Orders / totalOrders) * 100 : 0,
      pack4Percent: totalOrders > 0 ? (pack4Orders / totalOrders) * 100 : 0,
      upsellPercent: totalOrders > 0 ? (upsellOrders / totalOrders) * 100 : 0
    };
  }

  /**
   * Extract pack quantity from product title
   */
  private getPackQuantity(title: string): number {
    const match = title.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Evaluate custom criteria conditions
   */
  private evaluateCustomCriteria(conditions: any, orders: (Order & { items: OrderItem[] })[], metrics: ProductMetrics): boolean {
    // Example: Seasonal bonus evaluation
    if (conditions.months) {
      const currentMonth = new Date().getMonth() + 1;
      if (!conditions.months.includes(currentMonth.toString())) return false;
    }

    if (conditions.minOrders && orders.length < conditions.minOrders) {
      return false;
    }

    if (conditions.minUpsellPercent && metrics.upsellPercent < conditions.minUpsellPercent) {
      return false;
    }

    return true;
  }

  /**
   * Get unique products from orders
   */
  async getProductsFromOrders() {
    const orderItems = await prisma.orderItem.findMany({
      select: {
        title: true,
        sku: true,
        quantity: true
      },
      distinct: ['title']
    });

    // Extract product names and pack quantities
    const products = orderItems.map(item => {
      const productName = this.extractProductName(item.title);
      const packQuantity = this.getPackQuantity(item.title);
      
      return {
        productName,
        packQuantity,
        originalTitle: item.title,
        sku: item.sku
      };
    });

    // Remove duplicates based on productName
    const uniqueProducts = products.filter((product, index, self) =>
      index === self.findIndex(p => p.productName === product.productName)
    );

    return uniqueProducts;
  }

  /**
   * Get all product commissions
   */
  async getAllProductCommissions() {
    return await prisma.productCommission.findMany({
      where: { isActive: true },
      orderBy: { productName: 'asc' }
    });
  }

  /**
   * Get products with commission status
   */
  async getProductsWithCommissionStatus() {
    const [productsFromOrders, existingCommissions] = await Promise.all([
      this.getProductsFromOrders(),
      this.getAllProductCommissions()
    ]);

    // Map products with their commission status
    const productsWithStatus = productsFromOrders.map(product => {
      const existingCommission = existingCommissions.find(
        comm => comm.productName === product.productName
      );

      return {
        ...product,
        hasCommission: !!existingCommission,
        commissionConfig: existingCommission || null
      };
    });

    return {
      products: productsWithStatus,
      existingCommissions
    };
  }

  /**
   * Create or update product commission
   */
  async upsertProductCommission(data: {
    productName: string;
    packQuantity: number;
    commissionCriteria: CommissionCriteria;
  }) {
    return await prisma.productCommission.upsert({
      where: { productName: data.productName },
      update: {
        packQuantity: data.packQuantity,
        commissionCriteria: data.commissionCriteria as any,
        updatedAt: new Date()
      },
      create: {
        productName: data.productName,
        packQuantity: data.packQuantity,
        commissionCriteria: data.commissionCriteria as any
      }
    });
  }

  /**
   * Set agent confirmation rate
   */
  async setAgentConfirmationRate(data: {
    agentId: string;
    confirmationRate: number;
    period: 'weekly' | 'monthly';
    startDate: Date;
    endDate: Date;
  }) {
    return await prisma.agentCommissionRate.upsert({
      where: {
        agentId_period_startDate: {
          agentId: data.agentId,
          period: data.period,
          startDate: data.startDate
        }
      },
      update: {
        confirmationRate: data.confirmationRate,
        endDate: data.endDate,
        updatedAt: new Date()
      },
      create: {
        agentId: data.agentId,
        confirmationRate: data.confirmationRate,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate
      }
    });
  }

  /**
   * Delete product commission
   */
  async deleteProductCommission(id: string) {
    return await prisma.productCommission.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get agent confirmation rates
   */
  async getAgentConfirmationRates(
    agentId: string,
    period?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {
      agentId,
      isActive: true
    };

    if (period) {
      where.period = period;
    }

    if (startDate && endDate) {
      where.startDate = { gte: startDate };
      where.endDate = { lte: endDate };
    }

    return await prisma.agentCommissionRate.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        agent: {
          select: {
            name: true,
            agentCode: true
          }
        }
      }
    });
  }

  /**
   * Get agents with their actual performance data
   */
  async getAgentsWithPerformanceData(startDate?: Date, endDate?: Date) {
    // Default to last 30 days if no dates provided
    if (!startDate || !endDate) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // Get unique agent IDs from AgentProductConfirmationRate table
    const agentConfirmationRates = await prisma.agentProductConfirmationRate.findMany({
      where: {
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      select: {
        agentId: true,
        agent: {
          select: {
            id: true,
            name: true,
            agentCode: true
          }
        }
      },
      distinct: ['agentId']
    });

    console.log(`🔍 Found ${agentConfirmationRates.length} agents with confirmation rates`);

    // Get agents with their orders
    const agentsWithMetrics = await Promise.all(
      agentConfirmationRates.map(async (rateRecord) => {
        const agentId = rateRecord.agentId;
        const agent = rateRecord.agent;
        
        // If agent record doesn't exist, create a placeholder
        const agentInfo = agent || {
          id: agentId,
          name: `Agent ${agentId.substring(0, 8)}`,
          agentCode: agentId.substring(0, 8)
        };

        // Get orders for this agent
        const orders = await prisma.order.findMany({
          where: {
            assignedAgentId: agentId,
            orderDate: {
              gte: startDate,
              lte: endDate
            }
          },
          select: {
            status: true,
            orderDate: true
          }
        });

        const totalOrders = orders.length;
        const confirmedOrders = orders.filter(
          order => order.status === 'CONFIRMED' || order.status === 'DELIVERED'
        ).length;
        
        const actualConfirmationRate = totalOrders > 0
          ? Math.round((confirmedOrders / totalOrders) * 100 * 100) / 100 // Round to 2 decimals
          : 0;

        console.log(`📊 Agent ${agentInfo.name}: ${totalOrders} orders, ${confirmedOrders} confirmed, ${actualConfirmationRate}% rate`);

        return {
          id: agentInfo.id,
          name: agentInfo.name,
          agentCode: agentInfo.agentCode,
          totalOrders,
          confirmedOrders,
          actualConfirmationRate,
          isEligible: totalOrders >= 1500
        };
      })
    );

    return agentsWithMetrics;
  }

  /**
   * Get commission summary for all agents
   */
  async getCommissionSummary(startDate: Date, endDate: Date, period: 'weekly' | 'monthly' = 'monthly', thresholdMode: 'product' | 'total' = 'product') {
    // Get unique agent IDs from AgentProductConfirmationRate table
    const agentConfirmationRates = await prisma.agentProductConfirmationRate.findMany({
      where: {
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      select: {
        agentId: true,
        agent: {
          select: {
            id: true,
            name: true,
            agentCode: true
          }
        }
      },
      distinct: ['agentId']
    });

    console.log(`🔍 Commission summary for ${agentConfirmationRates.length} agents`);

    const summaries = await Promise.all(
      agentConfirmationRates.map(async (rateRecord) => {
        const agentId = rateRecord.agentId;
        const agent = rateRecord.agent;
        
        // If agent record doesn't exist, create a placeholder
        const agentInfo = agent || {
          id: agentId,
          name: `Agent ${agentId.substring(0, 8)}`,
          agentCode: agentId.substring(0, 8)
        };

        try {
          const commission = await this.calculateAgentCommission(
            agentId,
            startDate,
            endDate,
            period,
            thresholdMode
          );
          return commission;
        } catch (error) {
          console.error(`❌ Error calculating commission for agent ${agentInfo.name} (${agentInfo.agentCode}):`, error);
          console.error(`❌ Agent ID: ${agentId}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
          return {
            totalCommission: 0,
            breakdown: [],
            agentInfo: {
              id: agentId,
              name: agentInfo.name || '',
              agentCode: agentInfo.agentCode || '',
              confirmationRate: 0,
              totalOrders: 0
            },
            period: {
              startDate,
              endDate,
              type: period
            }
          };
        }
      })
    );

    return summaries;
  }

  /**
   * Get all agent confirmation rates
   */
  async getAllAgentRates() {
    return await prisma.agentCommissionRate.findMany({
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            agentCode: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Set agent-product confirmation rate
   */
  async setAgentProductConfirmationRate(data: {
    agentId: string;
    productName: string;
    confirmationRate: number;
    startDate: Date;
    endDate: Date;
    metadata?: any;
  }) {
    return await prisma.agentProductConfirmationRate.upsert({
      where: {
        agentId_productName_startDate: {
          agentId: data.agentId,
          productName: data.productName,
          startDate: data.startDate
        }
      },
      update: {
        confirmationRate: data.confirmationRate,
        endDate: data.endDate,
        metadata: data.metadata,
        updatedAt: new Date()
      },
      create: {
        agentId: data.agentId,
        productName: data.productName,
        confirmationRate: data.confirmationRate,
        startDate: data.startDate,
        endDate: data.endDate,
        metadata: data.metadata
      }
    });
  }

  /**
   * Get agent-product confirmation rates
   */
  async getAgentProductConfirmationRates(
    agentId?: string,
    productName?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = { isActive: true };
    
    if (agentId) where.agentId = agentId;
    if (productName) where.productName = productName;
    if (startDate && endDate) {
      where.startDate = { lte: endDate };
      where.endDate = { gte: startDate };
    }

    return await prisma.agentProductConfirmationRate.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            agentCode: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Update agent-product confirmation rate
   */
  async updateAgentProductConfirmationRate(id: string, data: {
    confirmationRate: number;
    startDate: Date;
    endDate: Date;
    metadata?: any;
  }) {
    return await prisma.agentProductConfirmationRate.update({
      where: { id },
      data: {
        confirmationRate: data.confirmationRate,
        startDate: data.startDate,
        endDate: data.endDate,
        metadata: data.metadata,
        updatedAt: new Date()
      },
      include: {
        agent: {
          select: {
            name: true,
            agentCode: true
          }
        }
      }
    });
  }

  /**
   * Delete agent-product confirmation rate
   */
  async deleteAgentProductConfirmationRate(id: string) {
    return await prisma.agentProductConfirmationRate.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Bulk create agent-product confirmation rates
   */
  async bulkCreateAgentProductConfirmationRates(rates: Array<{
    agentId: string;
    productName: string;
    confirmationRate: number;
    startDate: Date;
    endDate: Date;
    metadata?: any;
  }>) {
    const createdRates = [];
    
    for (const rate of rates) {
      const created = await this.setAgentProductConfirmationRate(rate);
      createdRates.push(created);
    }
    
    return createdRates;
  }

  /**
   * Bulk update agent-product confirmation rates
   */
  async bulkUpdateAgentProductConfirmationRates(updates: Array<{
    id: string;
    confirmationRate: number;
    startDate: Date;
    endDate: Date;
    metadata?: any;
  }>) {
    const updatedRates = [];
    
    for (const update of updates) {
      const updated = await this.updateAgentProductConfirmationRate(update.id, {
        confirmationRate: update.confirmationRate,
        startDate: update.startDate,
        endDate: update.endDate,
        metadata: update.metadata
      });
      updatedRates.push(updated);
    }
    
    return updatedRates;
  }

  /**
   * Bulk delete agent-product confirmation rates
   */
  async bulkDeleteAgentProductConfirmationRates(ids: string[]) {
    return await prisma.agentProductConfirmationRate.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }
}

export const commissionService = new CommissionService();