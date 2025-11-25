import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { analyticsCache } from '@/services/analytics-cache.service';
import { parseDateFromQuery } from '@/utils/timezone';
import { OrderStatus } from '@prisma/client';

interface ProductAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  productName?: string;
  wilaya?: string;
  shippingCompany?: string;
}

export class ProductAnalyticsController {
  /**
   * Get comprehensive product analytics
   * Implements all 42 analyses (except #42)
   */
  async getProductAnalytics(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        storeId,
        productName,
        wilaya,
        shippingCompany
      } = req.query as ProductAnalyticsQuery;

      // Parse dates
      const start = startDate ? parseDateFromQuery(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? parseDateFromQuery(endDate) : new Date();

      // Build cache key
      const cacheKey = `product-analytics:${start.toISOString()}:${end.toISOString()}:${storeId || 'all'}:${productName || 'all'}:${wilaya || 'all'}:${shippingCompany || 'all'}`;
      
      // Check cache
      const cached = await analyticsCache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true
        });
      }

      // Build where clause
      const whereClause: any = {
        orderDate: {
          gte: start,
          lte: end
        }
      };

      if (storeId) {
        whereClause.storeIdentifier = storeId;
      }

      if (wilaya) {
        whereClause.customer = {
          wilaya: wilaya
        };
      }

      // OPTIMIZED: Use raw SQL for better performance with large datasets
      // This avoids Prisma's N+1 query problem and memory overhead
      const params: any[] = [start, end];
      let paramIndex = 3;
      
      let additionalWhere = '';
      if (storeId) {
        additionalWhere += ` AND o."storeIdentifier" = $${paramIndex}`;
        params.push(storeId);
        paramIndex++;
      }
      if (wilaya) {
        additionalWhere += ` AND c.wilaya = $${paramIndex}`;
        params.push(wilaya);
        paramIndex++;
      }

      const query = `
        SELECT
          oi.id as item_id,
          oi.title,
          oi.sku,
          oi.quantity,
          oi."unitPrice" as unit_price,
          oi."totalPrice" as item_total_price,
          o.id as order_id,
          o.total as order_total,
          o."shippingStatus" as shipping_status,
          o.status as order_status,
          o."orderDate" as order_date,
          o."storeIdentifier" as store_identifier,
          c.wilaya,
          c.commune,
          c."fullName" as customer_name,
          u.name as agent_name,
          u."agentCode" as agent_code,
          sc.name as shipping_company
        FROM order_items oi
        INNER JOIN orders o ON oi."orderId" = o.id
        LEFT JOIN customers c ON o."customerId" = c.id
        LEFT JOIN users u ON o."assignedAgentId" = u.id
        LEFT JOIN shipping_accounts sa ON o."shippingAccountId" = sa.id
        LEFT JOIN shipping_companies sc ON sa."companyId" = sc.id
        WHERE o."orderDate" >= $1 AND o."orderDate" <= $2
        ${additionalWhere}
        ORDER BY o."orderDate" DESC
      `;

      const rawResults: any[] = await prisma.$queryRawUnsafe(query, ...params);
      
      console.log(`Fetched ${rawResults.length} order items via raw SQL`);

      // Transform raw results into structured format
      const orderItems = rawResults.map(row => {
        const orderTotal = Number(row.order_total) || 0;
        const itemTotalPrice = Number(row.item_total_price) || 0;
        
        // Calculate revenue: Use order.total for delivered orders (matching Sales Reports logic)
        // For product analytics, we attribute the full order revenue to each item
        // This matches how Sales Reports calculates revenue
        const itemRevenue = row.shipping_status === 'LIVRÉ' ? orderTotal : 0;
        
        return {
          id: row.item_id,
          title: row.title,
          sku: row.sku,
          quantity: Number(row.quantity),
          unitPrice: Number(row.unit_price),
          totalPrice: itemTotalPrice,
          calculatedRevenue: itemRevenue,
          order: {
            id: row.order_id,
            total: orderTotal,
            shippingStatus: row.shipping_status,
            status: row.order_status,
            orderDate: row.order_date,
            storeIdentifier: row.store_identifier,
            customer: {
              wilaya: row.wilaya,
              commune: row.commune,
              fullName: row.customer_name
            },
            assignedAgent: row.agent_name ? {
              name: row.agent_name,
              agentCode: row.agent_code
            } : null,
            shippingAccount: row.shipping_company ? {
              company: {
                name: row.shipping_company
              }
            } : null
          }
        };
      });

      if (orderItems.length > 0) {
        console.log('Sample item:', {
          title: orderItems[0].title,
          calculatedRevenue: orderItems[0].calculatedRevenue,
          orderTotal: orderItems[0].order.total,
          shippingStatus: orderItems[0].order.shippingStatus
        });
      }

      // Group by order for combination analysis
      const orderMap = new Map();
      orderItems.forEach(item => {
        if (!orderMap.has(item.order.id)) {
          orderMap.set(item.order.id, {
            id: item.order.id,
            total: item.order.total,
            shippingStatus: item.order.shippingStatus,
            status: item.order.status,
            orderDate: item.order.orderDate,
            storeIdentifier: item.order.storeIdentifier,
            customer: item.order.customer,
            assignedAgent: item.order.assignedAgent,
            shippingAccount: item.order.shippingAccount,
            items: []
          });
        }
        orderMap.get(item.order.id).items.push(item);
      });
      const orders = Array.from(orderMap.values());

      // Filter by product name if specified
      let filteredItems = orderItems;
      if (productName) {
        filteredItems = orderItems.filter(item => 
          item.title.toLowerCase().includes(productName.toLowerCase())
        );
      }

      // Filter by shipping company if specified
      if (shippingCompany) {
        filteredItems = filteredItems.filter(item =>
          item.order.shippingAccount?.company?.name === shippingCompany
        );
      }

      // Process all analyses with timing
      console.time('Total Analysis Time');
      
      console.time('Summary');
      const summary = this.calculateSummary(filteredItems);
      console.timeEnd('Summary');
      
      console.time('Products');
      const allProducts = this.analyzeProducts(filteredItems);
      // Limit to top 100 products by revenue to avoid frontend freeze
      const products = allProducts
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 100);
      console.timeEnd('Products');
      console.log(`Returning top ${products.length} of ${allProducts.length} products`);
      
      console.time('Pack Analysis');
      const packAnalysis = this.analyzePackPerformance(filteredItems);
      console.timeEnd('Pack Analysis');
      
      console.time('Product Combinations');
      const frequentlyBoughtTogether = this.analyzeProductCombinations(orderItems);
      console.timeEnd('Product Combinations');
      
      console.time('Products by Wilaya');
      const productsByWilaya = this.analyzeProductsByWilaya(filteredItems);
      console.timeEnd('Products by Wilaya');
      
      console.time('Seasonal Trends');
      const seasonalTrends = this.analyzeSeasonalTrends(filteredItems);
      console.timeEnd('Seasonal Trends');
      
      console.time('Products by Store');
      const productsByStore = this.analyzeProductsByStore(filteredItems);
      console.timeEnd('Products by Store');
      
      console.time('Products by Agent');
      const productsByAgent = this.analyzeProductsByAgent(filteredItems);
      console.timeEnd('Products by Agent');
      
      console.time('Products by Shipping');
      const productsByShipping = this.analyzeProductsByShipping(filteredItems);
      console.timeEnd('Products by Shipping');
      
      console.time('Alerts');
      const alerts = this.detectProductAlerts(filteredItems);
      console.timeEnd('Alerts');
      
      console.time('Revenue Contribution');
      const revenueContribution = this.analyzeRevenueContribution(filteredItems);
      console.timeEnd('Revenue Contribution');
      
      console.time('First Purchase Products');
      const firstPurchaseProducts = this.analyzeFirstPurchaseProducts(orders);
      console.timeEnd('First Purchase Products');
      
      console.time('Repeat Purchase Products');
      const repeatPurchaseProducts = this.analyzeRepeatPurchaseProducts(orders);
      console.timeEnd('Repeat Purchase Products');
      
      const data = {
        summary,
        products,
        packAnalysis,
        frequentlyBoughtTogether,
        productsByWilaya,
        seasonalTrends,
        productsByStore,
        productsByAgent,
        productsByShipping,
        alerts,
        revenueContribution,
        firstPurchaseProducts,
        repeatPurchaseProducts
      };
      
      console.timeEnd('Total Analysis Time');

      // Cache for 10 minutes
      await analyticsCache.set(cacheKey, data, { ttl: 600 });

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Product analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product analytics'
      });
    }
  }

  /**
   * Calculate summary KPIs (Analyses #1-5)
   */
  private calculateSummary(items: any[]) {
    const uniqueProducts = new Set(items.map(i => i.sku || i.title)).size;
    const totalOrders = new Set(items.map(i => i.order.id)).size;
    
    const deliveredItems = items.filter(i => i.order.shippingStatus === 'LIVRÉ');
    const totalRevenue = deliveredItems.reduce((sum, i) => sum + (Number(i.calculatedRevenue) || 0), 0);
    const averageProductValue = totalRevenue / (deliveredItems.length || 1);

    // Find best seller by orders
    const productOrders = new Map<string, { name: string; sku: string; orders: number }>();
    items.forEach(item => {
      const key = item.sku || item.title;
      if (!productOrders.has(key)) {
        productOrders.set(key, { name: item.title, sku: item.sku || '', orders: 0 });
      }
      productOrders.get(key)!.orders++;
    });
    const bestSeller = Array.from(productOrders.values())
      .sort((a, b) => b.orders - a.orders)[0] || null;

    // Find worst performer by delivery rate
    const productStats = new Map<string, { name: string; sku: string; total: number; delivered: number }>();
    items.forEach(item => {
      const key = item.sku || item.title;
      if (!productStats.has(key)) {
        productStats.set(key, { name: item.title, sku: item.sku || '', total: 0, delivered: 0 });
      }
      const stats = productStats.get(key)!;
      stats.total++;
      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.delivered++;
      }
    });
    const worstPerformer = Array.from(productStats.values())
      .map(s => ({ ...s, deliveryRate: (s.delivered / s.total) * 100 }))
      .filter(s => s.total >= 5) // Only products with at least 5 orders
      .sort((a, b) => a.deliveryRate - b.deliveryRate)[0] || null;

    return {
      totalProducts: uniqueProducts,
      totalOrders,
      totalRevenue,
      averageProductValue,
      bestSeller,
      worstPerformer
    };
  }

  /**
   * Analyze all products (Analyses #1-5, #31-35)
   */
  private analyzeProducts(items: any[]) {
    const productMap = new Map<string, any>();

    items.forEach(item => {
      const key = item.sku || item.title;
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: item.title,
          sku: item.sku || '',
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          quantitySold: 0,
          orderIds: new Set()
        });
      }

      const product = productMap.get(key)!;
      product.orderIds.add(item.order.id);
      product.quantitySold += item.quantity;

      if (item.order.shippingStatus === 'LIVRÉ') {
        product.deliveredOrders++;
        product.totalRevenue += (Number(item.calculatedRevenue) || 0);
      }

      if (item.order.status === 'CANCELLED') {
        product.cancelledOrders++;
      }
    });

    // Extract pack information and calculate metrics
    return Array.from(productMap.values()).map(product => {
      product.totalOrders = product.orderIds.size;
      delete product.orderIds;

      const deliveryRate = product.totalOrders > 0 
        ? (product.deliveredOrders / product.totalOrders) * 100 
        : 0;
      
      const averageOrderValue = product.deliveredOrders > 0
        ? product.totalRevenue / product.deliveredOrders
        : 0;

      // Extract pack size from product name
      const packMatch = product.name.match(/pack\s+(.+?)\s+\((\d+)\)/i);
      let packSize = null;
      let baseProductName = product.name;

      if (packMatch) {
        baseProductName = packMatch[1].trim();
        packSize = parseInt(packMatch[2]);
      }

      return {
        ...product,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        packSize,
        baseProductName
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);
  }

  /**
   * Analyze pack performance (Analyses #6-10)
   */
  private analyzePackPerformance(items: any[]) {
    const packSizes = new Map<number, { orders: number; revenue: number; delivered: number; total: number }>();
    let packOrders = 0;
    let singleOrders = 0;
    let packRevenue = 0;
    let singleRevenue = 0;

    items.forEach(item => {
      const packMatch = item.title.match(/pack\s+(.+?)\s+\((\d+)\)/i);
      const isPack = !!packMatch;
      const packSize = packMatch ? parseInt(packMatch[2]) : 1;

      if (isPack) {
        packOrders++;
        if (item.order.shippingStatus === 'LIVRÉ') {
          packRevenue += (Number(item.calculatedRevenue) || 0);
        }

        if (!packSizes.has(packSize)) {
          packSizes.set(packSize, { orders: 0, revenue: 0, delivered: 0, total: 0 });
        }
        const stats = packSizes.get(packSize)!;
        stats.orders++;
        stats.total++;
        if (item.order.shippingStatus === 'LIVRÉ') {
          stats.revenue += (Number(item.calculatedRevenue) || 0);
          stats.delivered++;
        }
      } else {
        singleOrders++;
        if (item.order.shippingStatus === 'LIVRÉ') {
          singleRevenue += (Number(item.calculatedRevenue) || 0);
        }
      }
    });

    // Calculate optimal pack size
    const packSizeArray = Array.from(packSizes.entries()).map(([size, stats]) => ({
      size,
      orders: stats.orders,
      revenue: stats.revenue,
      deliveryRate: (stats.delivered / stats.total) * 100,
      revenuePerOrder: stats.revenue / stats.orders
    }));

    const optimalPackSize = packSizeArray.length > 0
      ? packSizeArray.reduce((best, current) => 
          current.revenuePerOrder > best.revenuePerOrder ? current : best
        )
      : null;

    return {
      bySize: packSizeArray.sort((a, b) => b.orders - a.orders),
      packVsSingle: {
        packOrders,
        singleOrders,
        packRevenue: Math.round(packRevenue * 100) / 100,
        singleRevenue: Math.round(singleRevenue * 100) / 100
      },
      optimalPackSize: optimalPackSize ? {
        size: optimalPackSize.size,
        reason: `Highest revenue per order (${Math.round(optimalPackSize.revenuePerOrder * 100) / 100} DA) with ${Math.round(optimalPackSize.deliveryRate)}% delivery rate`
      } : null
    };
  }

  /**
   * Analyze product combinations (Analyses #11-14)
   */
  private analyzeProductCombinations(items: any[]) {
    // OPTIMIZED: Pre-calculate order revenues to avoid O(n³) complexity
    const orderRevenues = new Map<string, number>();
    const orderProducts = new Map<string, string[]>();

    // Single pass to group products and calculate revenues
    items.forEach(item => {
      const orderId = item.order.id;
      
      if (!orderProducts.has(orderId)) {
        orderProducts.set(orderId, []);
        orderRevenues.set(orderId, 0);
      }
      
      orderProducts.get(orderId)!.push(item.title);
      
      if (item.order.shippingStatus === 'LIVRÉ') {
        orderRevenues.set(orderId, orderRevenues.get(orderId)! + (Number(item.calculatedRevenue) || 0));
      }
    });

    // Find combinations - now O(n²) instead of O(n³)
    const combinations = new Map<string, { product1: string; product2: string; frequency: number; revenue: number }>();

    orderProducts.forEach((products, orderId) => {
      if (products.length < 2) return;

      const orderRevenue = orderRevenues.get(orderId) || 0;

      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const [p1, p2] = [products[i], products[j]].sort();
          const key = `${p1}|||${p2}`;

          if (!combinations.has(key)) {
            combinations.set(key, { product1: p1, product2: p2, frequency: 0, revenue: 0 });
          }

          const combo = combinations.get(key)!;
          combo.frequency++;
          combo.revenue += orderRevenue;
        }
      }
    });

    return Array.from(combinations.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)
      .map(combo => ({
        ...combo,
        combinedRevenue: Math.round(combo.revenue * 100) / 100
      }));
  }

  /**
   * Analyze products by wilaya (Analyses #15-18)
   */
  private analyzeProductsByWilaya(items: any[]) {
    const wilayaMap = new Map<string, Map<string, { orders: number; revenue: number; delivered: number; total: number }>>();

    items.forEach(item => {
      const wilaya = item.order.customer?.wilaya || 'Unknown';
      
      if (!wilayaMap.has(wilaya)) {
        wilayaMap.set(wilaya, new Map());
      }

      const productMap = wilayaMap.get(wilaya)!;
      const productName = item.title;

      if (!productMap.has(productName)) {
        productMap.set(productName, { orders: 0, revenue: 0, delivered: 0, total: 0 });
      }

      const stats = productMap.get(productName)!;
      stats.orders++;
      stats.total++;

      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.revenue += (Number(item.calculatedRevenue) || 0);
        stats.delivered++;
      }
    });

    return Array.from(wilayaMap.entries()).map(([wilaya, productMap]) => ({
      wilaya,
      products: Array.from(productMap.entries())
        .map(([name, stats]) => ({
          name,
          orders: stats.orders,
          revenue: Math.round(stats.revenue * 100) / 100,
          deliveryRate: Math.round((stats.delivered / stats.total) * 100 * 100) / 100
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10)
    })).sort((a, b) => {
      const aTotal = a.products.reduce((sum, p) => sum + p.orders, 0);
      const bTotal = b.products.reduce((sum, p) => sum + p.orders, 0);
      return bTotal - aTotal;
    });
  }

  /**
   * Analyze seasonal trends (Analyses #19-22)
   */
  private analyzeSeasonalTrends(items: any[]) {
    const monthMap = new Map<string, Map<string, { orders: number; revenue: number }>>();

    items.forEach(item => {
      const date = new Date(item.order.orderDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map());
      }

      const productMap = monthMap.get(monthKey)!;
      const productName = item.title;

      if (!productMap.has(productName)) {
        productMap.set(productName, { orders: 0, revenue: 0 });
      }

      const stats = productMap.get(productName)!;
      stats.orders++;

      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.revenue += (Number(item.calculatedRevenue) || 0);
      }
    });

    return Array.from(monthMap.entries())
      .map(([month, productMap]) => ({
        month,
        products: Array.from(productMap.entries())
          .map(([name, stats]) => ({
            name,
            orders: stats.orders,
            revenue: Math.round(stats.revenue * 100) / 100
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Analyze products by store (Analyses #23-24)
   */
  private analyzeProductsByStore(items: any[]) {
    const storeMap = new Map<string, Map<string, { orders: number; revenue: number }>>();

    items.forEach(item => {
      const store = item.order.storeIdentifier || 'Unknown';

      if (!storeMap.has(store)) {
        storeMap.set(store, new Map());
      }

      const productMap = storeMap.get(store)!;
      const productName = item.title;

      if (!productMap.has(productName)) {
        productMap.set(productName, { orders: 0, revenue: 0 });
      }

      const stats = productMap.get(productName)!;
      stats.orders++;

      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.revenue += (Number(item.calculatedRevenue) || 0);
      }
    });

    return Array.from(storeMap.entries()).map(([store, productMap]) => ({
      store,
      products: Array.from(productMap.entries())
        .map(([name, stats]) => ({
          name,
          orders: stats.orders,
          revenue: Math.round(stats.revenue * 100) / 100
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10)
    }));
  }

  /**
   * Analyze products by agent (Analyses #25-26)
   */
  private analyzeProductsByAgent(items: any[]) {
    const agentMap = new Map<string, Map<string, { orders: number; delivered: number; total: number }>>();

    items.forEach(item => {
      const agentName = item.order.assignedAgent?.name || 'Unassigned';
      const agentCode = item.order.assignedAgent?.agentCode || '';

      const agentKey = `${agentName}|||${agentCode}`;

      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, new Map());
      }

      const productMap = agentMap.get(agentKey)!;
      const productName = item.title;

      if (!productMap.has(productName)) {
        productMap.set(productName, { orders: 0, delivered: 0, total: 0 });
      }

      const stats = productMap.get(productName)!;
      stats.orders++;
      stats.total++;

      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.delivered++;
      }
    });

    return Array.from(agentMap.entries()).map(([agentKey, productMap]) => {
      const [agentName, agentCode] = agentKey.split('|||');
      return {
        agentName,
        agentCode,
        products: Array.from(productMap.entries())
          .map(([name, stats]) => ({
            name,
            orders: stats.orders,
            deliveryRate: Math.round((stats.delivered / stats.total) * 100 * 100) / 100
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 10)
      };
    });
  }

  /**
   * Analyze products by shipping company (Analyses #27-30)
   */
  private analyzeProductsByShipping(items: any[]) {
    const shippingMap = new Map<string, Map<string, { orders: number; delivered: number; total: number; deliveryTimes: number[] }>>();

    items.forEach(item => {
      const shippingCompany = item.order.shippingAccount?.company?.name || 'Unknown';

      if (!shippingMap.has(shippingCompany)) {
        shippingMap.set(shippingCompany, new Map());
      }

      const productMap = shippingMap.get(shippingCompany)!;
      const productName = item.title;

      if (!productMap.has(productName)) {
        productMap.set(productName, { orders: 0, delivered: 0, total: 0, deliveryTimes: [] });
      }

      const stats = productMap.get(productName)!;
      stats.orders++;
      stats.total++;

      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.delivered++;
        
        // Calculate delivery time if available
        const orderDate = new Date(item.order.orderDate);
        const deliveryDate = new Date(item.order.updatedAt);
        const deliveryTime = Math.floor((deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        if (deliveryTime > 0 && deliveryTime < 30) {
          stats.deliveryTimes.push(deliveryTime);
        }
      }
    });

    return Array.from(shippingMap.entries()).map(([shippingCompany, productMap]) => ({
      shippingCompany,
      products: Array.from(productMap.entries())
        .map(([name, stats]) => ({
          name,
          orders: stats.orders,
          deliveryRate: Math.round((stats.delivered / stats.total) * 100 * 100) / 100,
          avgDeliveryTime: stats.deliveryTimes.length > 0
            ? Math.round(stats.deliveryTimes.reduce((a, b) => a + b, 0) / stats.deliveryTimes.length * 10) / 10
            : null
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10)
    }));
  }

  /**
   * Detect product alerts (Analyses #31-35)
   */
  private detectProductAlerts(items: any[]) {
    const productStats = new Map<string, {
      name: string;
      total: number;
      delivered: number;
      cancelled: number;
      returned: number;
    }>();

    items.forEach(item => {
      const key = item.sku || item.title;
      if (!productStats.has(key)) {
        productStats.set(key, {
          name: item.title,
          total: 0,
          delivered: 0,
          cancelled: 0,
          returned: 0
        });
      }

      const stats = productStats.get(key)!;
      stats.total++;

      if (item.order.shippingStatus === 'LIVRÉ') {
        stats.delivered++;
      }
      if (item.order.status === 'CANCELLED') {
        stats.cancelled++;
      }
      if (item.order.shippingStatus === 'RETOUR') {
        stats.returned++;
      }
    });

    const underperforming: any[] = [];
    const highCancellation: any[] = [];
    const lowVolume: any[] = [];
    const returnProne: any[] = [];

    productStats.forEach((stats, key) => {
      const deliveryRate = (stats.delivered / stats.total) * 100;
      const cancellationRate = (stats.cancelled / stats.total) * 100;
      const returnRate = (stats.returned / stats.total) * 100;

      // Underperforming: delivery rate < 50%
      if (stats.total >= 10 && deliveryRate < 50) {
        underperforming.push({
          name: stats.name,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          reason: `Low delivery rate with ${stats.total} orders`
        });
      }

      // High cancellation: > 30%
      if (stats.total >= 10 && cancellationRate > 30) {
        highCancellation.push({
          name: stats.name,
          cancellationRate: Math.round(cancellationRate * 100) / 100
        });
      }

      // Low volume: < 5 orders in period
      if (stats.total < 5) {
        lowVolume.push({
          name: stats.name,
          orders: stats.total
        });
      }

      // Return prone: > 20%
      if (stats.total >= 10 && returnRate > 20) {
        returnProne.push({
          name: stats.name,
          returnRate: Math.round(returnRate * 100) / 100
        });
      }
    });

    return {
      underperforming: underperforming.sort((a, b) => a.deliveryRate - b.deliveryRate).slice(0, 10),
      highCancellation: highCancellation.sort((a, b) => b.cancellationRate - a.cancellationRate).slice(0, 10),
      lowVolume: lowVolume.sort((a, b) => a.orders - b.orders).slice(0, 10),
      returnProne: returnProne.sort((a, b) => b.returnRate - a.returnRate).slice(0, 10)
    };
  }

  /**
   * Analyze revenue contribution (Analyses #36-39)
   */
  private analyzeRevenueContribution(items: any[]) {
    const productRevenue = new Map<string, number>();
    let totalRevenue = 0;

    items.forEach(item => {
      if (item.order.shippingStatus === 'LIVRÉ') {
        const key = item.title;
        const revenue = Number(item.calculatedRevenue) || 0;
        productRevenue.set(key, (productRevenue.get(key) || 0) + revenue);
        totalRevenue += revenue;
      }
    });

    return Array.from(productRevenue.entries())
      .map(([name, revenue]) => ({
        name,
        revenue: Math.round(revenue * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100 * 100) / 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }

  /**
   * Analyze first purchase products (Analyses #40-41)
   */
  private analyzeFirstPurchaseProducts(orders: any[]) {
    const customerFirstOrders = new Map<string, string>();
    const firstPurchaseProducts = new Map<string, number>();

    // Sort orders by date
    const sortedOrders = orders.sort((a, b) => 
      new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
    );

    sortedOrders.forEach(order => {
      const customerId = order.customerId;
      
      if (!customerFirstOrders.has(customerId)) {
        customerFirstOrders.set(customerId, order.id);
        
        // Count products in first order
        order.items?.forEach((item: any) => {
          const productName = item.title;
          firstPurchaseProducts.set(productName, (firstPurchaseProducts.get(productName) || 0) + 1);
        });
      }
    });

    return Array.from(firstPurchaseProducts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Analyze repeat purchase products (Analysis #43)
   */
  private analyzeRepeatPurchaseProducts(orders: any[]) {
    const customerProducts = new Map<string, Map<string, number>>();

    orders.forEach(order => {
      const customerId = order.customerId;
      
      if (!customerProducts.has(customerId)) {
        customerProducts.set(customerId, new Map());
      }

      const productMap = customerProducts.get(customerId)!;

      order.items?.forEach((item: any) => {
        const productName = item.title;
        productMap.set(productName, (productMap.get(productName) || 0) + 1);
      });
    });

    const productRepeatCounts = new Map<string, { total: number; repeat: number }>();

    customerProducts.forEach((productMap) => {
      productMap.forEach((count, productName) => {
        if (!productRepeatCounts.has(productName)) {
          productRepeatCounts.set(productName, { total: 0, repeat: 0 });
        }
        const stats = productRepeatCounts.get(productName)!;
        stats.total++;
        if (count > 1) {
          stats.repeat++;
        }
      });
    });

    return Array.from(productRepeatCounts.entries())
      .map(([name, stats]) => ({
        name,
        repeatRate: Math.round((stats.repeat / stats.total) * 100 * 100) / 100
      }))
      .filter(p => p.repeatRate > 0)
      .sort((a, b) => b.repeatRate - a.repeatRate)
      .slice(0, 10);
  }
}

export const productAnalyticsController = new ProductAnalyticsController();