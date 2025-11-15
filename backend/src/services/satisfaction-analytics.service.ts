import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export class SatisfactionAnalyticsService {
  /**
   * Get system-wide satisfaction overview metrics
   */
  async getOverviewMetrics(dateRange?: DateRange) {
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true,
    };

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    // Get all surveys
    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where,
      select: {
        overallRating: true,
        deliverySpeedRating: true,
        productQualityRating: true,
        agentServiceRating: true,
        packagingRating: true,
        createdAt: true,
      },
    });

    const totalSurveys = surveys.length;

    if (totalSurveys === 0) {
      return {
        totalSurveys: 0,
        averageOverallRating: 0,
        averageByCategory: {
          deliverySpeed: 0,
          productQuality: 0,
          agentService: 0,
          packaging: 0,
        },
        ratingDistribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
        surveyResponseRate: 0,
      };
    }

    // Calculate averages
    const calculateAverage = (ratings: (number | null)[]) => {
      const validRatings = ratings.filter((r): r is number => r !== null);
      if (validRatings.length === 0) return 0;
      return Math.round((validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length) * 10) / 10;
    };

    const averageOverallRating = calculateAverage(surveys.map(s => s.overallRating));
    const averageByCategory = {
      deliverySpeed: calculateAverage(surveys.map(s => s.deliverySpeedRating)),
      productQuality: calculateAverage(surveys.map(s => s.productQualityRating)),
      agentService: calculateAverage(surveys.map(s => s.agentServiceRating)),
      packaging: calculateAverage(surveys.map(s => s.packagingRating)),
    };

    // Rating distribution
    const ratingDistribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    surveys.forEach(survey => {
      if (survey.overallRating) {
        const key = survey.overallRating.toString() as keyof typeof ratingDistribution;
        ratingDistribution[key]++;
      }
    });

    // Calculate response rate
    const deliveredOrdersWhere: Prisma.OrderWhereInput = {
      OR: [
        { status: 'DELIVERED' },
        { shippingStatus: 'LIVRÉ' },
      ],
    };

    if (dateRange?.from || dateRange?.to) {
      deliveredOrdersWhere.updatedAt = {};
      if (dateRange.from) deliveredOrdersWhere.updatedAt.gte = dateRange.from;
      if (dateRange.to) deliveredOrdersWhere.updatedAt.lte = dateRange.to;
    }

    const totalDeliveredOrders = await prisma.order.count({
      where: deliveredOrdersWhere,
    });

    const surveyResponseRate = totalDeliveredOrders > 0
      ? Math.round((totalSurveys / totalDeliveredOrders) * 100)
      : 0;

    return {
      totalSurveys,
      averageOverallRating,
      averageByCategory,
      ratingDistribution,
      surveyResponseRate,
    };
  }

  /**
   * Get trend data for satisfaction over time
   */
  async getTrendData(period: 'daily' | 'weekly' | 'monthly', dateRange?: DateRange) {
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true,
    };

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where,
      select: {
        overallRating: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const grouped = new Map<string, { sum: number; count: number }>();

    surveys.forEach(survey => {
      if (!survey.overallRating) return;

      const date = new Date(survey.createdAt);
      let key: string;

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = grouped.get(key) || { sum: 0, count: 0 };
      grouped.set(key, {
        sum: existing.sum + survey.overallRating,
        count: existing.count + 1,
      });
    });

    // Convert to array
    const trendData = Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      avgRating: Math.round((data.sum / data.count) * 10) / 10,
      count: data.count,
    }));

    return trendData;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(agentId?: string, dateRange?: DateRange) {
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true,
    };

    if (agentId) {
      where.order = {
        assignedAgentId: agentId,
      };
    }

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where,
      include: {
        order: {
          select: {
            assignedAgentId: true,
            assignedAgent: {
              select: {
                id: true,
                name: true,
                email: true,
                agentCode: true,
              },
            },
          },
        },
      },
    });

    // Group by agent
    const agentMap = new Map<string, {
      agent: any;
      surveys: any[];
      totalSurveys: number;
      ratings: number[];
      categoryRatings: {
        deliverySpeed: number[];
        productQuality: number[];
        agentService: number[];
        packaging: number[];
      };
    }>();

    surveys.forEach(survey => {
      const agentId = survey.order.assignedAgentId;
      if (!agentId) return;

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agent: survey.order.assignedAgent,
          surveys: [],
          totalSurveys: 0,
          ratings: [],
          categoryRatings: {
            deliverySpeed: [],
            productQuality: [],
            agentService: [],
            packaging: [],
          },
        });
      }

      const agentData = agentMap.get(agentId)!;
      agentData.surveys.push(survey);
      agentData.totalSurveys++;

      if (survey.overallRating) agentData.ratings.push(survey.overallRating);
      if (survey.deliverySpeedRating) agentData.categoryRatings.deliverySpeed.push(survey.deliverySpeedRating);
      if (survey.productQualityRating) agentData.categoryRatings.productQuality.push(survey.productQualityRating);
      if (survey.agentServiceRating) agentData.categoryRatings.agentService.push(survey.agentServiceRating);
      if (survey.packagingRating) agentData.categoryRatings.packaging.push(survey.packagingRating);
    });

    // Calculate metrics for each agent
    const calculateAvg = (arr: number[]) => 
      arr.length > 0 ? Math.round((arr.reduce((sum, n) => sum + n, 0) / arr.length) * 10) / 10 : 0;

    const agents = Array.from(agentMap.values()).map(data => ({
      agentId: data.agent.id,
      agentName: data.agent.name,
      agentCode: data.agent.agentCode,
      agentEmail: data.agent.email,
      totalSurveys: data.totalSurveys,
      averageRating: calculateAvg(data.ratings),
      categoryRatings: {
        deliverySpeed: calculateAvg(data.categoryRatings.deliverySpeed),
        productQuality: calculateAvg(data.categoryRatings.productQuality),
        agentService: calculateAvg(data.categoryRatings.agentService),
        packaging: calculateAvg(data.categoryRatings.packaging),
      },
      lowRatingsCount: data.ratings.filter(r => r < 3).length,
      highRatingsCount: data.ratings.filter(r => r >= 4).length,
    }));

    // Sort by average rating and add rank
    agents.sort((a, b) => b.averageRating - a.averageRating);
    agents.forEach((agent, index) => {
      (agent as any).rank = index + 1;
    });

    return agents;
  }

  /**
   * Get store performance metrics
   */
  async getStorePerformance(storeId?: string, dateRange?: DateRange) {
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true,
    };

    if (storeId) {
      where.order = {
        storeIdentifier: storeId,
      };
    }

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where,
      include: {
        order: {
          select: {
            storeIdentifier: true,
          },
        },
      },
    });

    // Group by store
    const storeMap = new Map<string, {
      totalSurveys: number;
      ratings: number[];
      categoryRatings: {
        deliverySpeed: number[];
        productQuality: number[];
        agentService: number[];
        packaging: number[];
      };
    }>();

    surveys.forEach(survey => {
      const store = survey.order.storeIdentifier || 'UNKNOWN';

      if (!storeMap.has(store)) {
        storeMap.set(store, {
          totalSurveys: 0,
          ratings: [],
          categoryRatings: {
            deliverySpeed: [],
            productQuality: [],
            agentService: [],
            packaging: [],
          },
        });
      }

      const storeData = storeMap.get(store)!;
      storeData.totalSurveys++;

      if (survey.overallRating) storeData.ratings.push(survey.overallRating);
      if (survey.deliverySpeedRating) storeData.categoryRatings.deliverySpeed.push(survey.deliverySpeedRating);
      if (survey.productQualityRating) storeData.categoryRatings.productQuality.push(survey.productQualityRating);
      if (survey.agentServiceRating) storeData.categoryRatings.agentService.push(survey.agentServiceRating);
      if (survey.packagingRating) storeData.categoryRatings.packaging.push(survey.packagingRating);
    });

    // Calculate metrics
    const calculateAvg = (arr: number[]) => 
      arr.length > 0 ? Math.round((arr.reduce((sum, n) => sum + n, 0) / arr.length) * 10) / 10 : 0;

    const stores = Array.from(storeMap.entries()).map(([storeIdentifier, data]) => ({
      storeIdentifier,
      totalSurveys: data.totalSurveys,
      averageRating: calculateAvg(data.ratings),
      categoryRatings: {
        deliverySpeed: calculateAvg(data.categoryRatings.deliverySpeed),
        productQuality: calculateAvg(data.categoryRatings.productQuality),
        agentService: calculateAvg(data.categoryRatings.agentService),
        packaging: calculateAvg(data.categoryRatings.packaging),
      },
      lowRatingsCount: data.ratings.filter(r => r < 3).length,
      highRatingsCount: data.ratings.filter(r => r >= 4).length,
    }));

    // Sort by average rating
    stores.sort((a, b) => b.averageRating - a.averageRating);

    return stores;
  }

  /**
   * Get product satisfaction metrics
   */
  async getProductSatisfaction(productName?: string, dateRange?: DateRange) {
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true,
    };

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where,
      include: {
        order: {
          include: {
            items: {
              select: {
                title: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    // Group by product
    const productMap = new Map<string, {
      totalSurveys: number;
      ratings: number[];
      productQualityRatings: number[];
    }>();

    surveys.forEach(survey => {
      survey.order.items.forEach(item => {
        const product = item.title;

        if (productName && product !== productName) return;

        if (!productMap.has(product)) {
          productMap.set(product, {
            totalSurveys: 0,
            ratings: [],
            productQualityRatings: [],
          });
        }

        const productData = productMap.get(product)!;
        productData.totalSurveys++;

        if (survey.overallRating) productData.ratings.push(survey.overallRating);
        if (survey.productQualityRating) productData.productQualityRatings.push(survey.productQualityRating);
      });
    });

    // Calculate metrics
    const calculateAvg = (arr: number[]) => 
      arr.length > 0 ? Math.round((arr.reduce((sum, n) => sum + n, 0) / arr.length) * 10) / 10 : 0;

    const products = Array.from(productMap.entries()).map(([productName, data]) => ({
      productName,
      totalSurveys: data.totalSurveys,
      averageRating: calculateAvg(data.ratings),
      averageProductQualityRating: calculateAvg(data.productQualityRatings),
      lowRatingsCount: data.ratings.filter(r => r < 3).length,
      highRatingsCount: data.ratings.filter(r => r >= 4).length,
    }));

    // Sort by average rating
    products.sort((a, b) => b.averageRating - a.averageRating);

    return products;
  }

  /**
   * Get wilaya satisfaction metrics
   */
  async getWilayaSatisfaction(wilaya?: string, dateRange?: DateRange) {
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true,
    };

    if (wilaya) {
      where.customer = {
        wilaya,
      };
    }

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where,
      include: {
        customer: {
          select: {
            wilaya: true,
          },
        },
      },
    });

    // Group by wilaya
    const wilayaMap = new Map<string, {
      totalSurveys: number;
      ratings: number[];
      deliverySpeedRatings: number[];
    }>();

    surveys.forEach(survey => {
      const wilaya = survey.customer.wilaya;

      if (!wilayaMap.has(wilaya)) {
        wilayaMap.set(wilaya, {
          totalSurveys: 0,
          ratings: [],
          deliverySpeedRatings: [],
        });
      }

      const wilayaData = wilayaMap.get(wilaya)!;
      wilayaData.totalSurveys++;

      if (survey.overallRating) wilayaData.ratings.push(survey.overallRating);
      if (survey.deliverySpeedRating) wilayaData.deliverySpeedRatings.push(survey.deliverySpeedRating);
    });

    // Calculate metrics
    const calculateAvg = (arr: number[]) => 
      arr.length > 0 ? Math.round((arr.reduce((sum, n) => sum + n, 0) / arr.length) * 10) / 10 : 0;

    const wilayas = Array.from(wilayaMap.entries()).map(([wilayaName, data]) => ({
      wilayaName,
      totalSurveys: data.totalSurveys,
      averageRating: calculateAvg(data.ratings),
      averageDeliverySpeedRating: calculateAvg(data.deliverySpeedRatings),
      lowRatingsCount: data.ratings.filter(r => r < 3).length,
      highRatingsCount: data.ratings.filter(r => r >= 4).length,
    }));

    // Sort by average rating
    wilayas.sort((a, b) => b.averageRating - a.averageRating);

    return wilayas;
  }

  /**
   * Get low ratings for alert system (no alerts per user request, but keep for future)
   */
  async getLowRatings(threshold: number = 3, limit: number = 50) {
    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where: {
        isLatest: true,
        overallRating: {
          lt: threshold,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
            shippingStatus: true,
            assignedAgent: {
              select: {
                id: true,
                name: true,
                agentCode: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            fullName: true,
            telephone: true,
            wilaya: true,
          },
        },
        collectedBy: {
          select: {
            id: true,
            name: true,
            agentCode: true,
          },
        },
      },
    });

    return surveys.map(survey => ({
      survey,
      order: survey.order,
      customer: survey.customer,
      agent: survey.order.assignedAgent,
      alertLevel: survey.overallRating && survey.overallRating <= 2 ? 'CRITICAL' : 'WARNING',
      requiresAction: true,
    }));
  }
}

export const satisfactionAnalyticsService = new SatisfactionAnalyticsService();