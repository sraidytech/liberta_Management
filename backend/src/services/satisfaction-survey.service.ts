import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

export interface CreateSurveyData {
  orderId: string;
  overallRating?: number;
  deliverySpeedRating?: number;
  productQualityRating?: number;
  agentServiceRating?: number;
  packagingRating?: number;
  customerComments?: string;
  internalNotes?: string;
}

export interface SurveyFilters {
  orderId?: string;
  customerId?: string;
  collectedById?: string;
  minRating?: number;
  maxRating?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export class SatisfactionSurveyService {
  /**
   * Validate rating value (1-5 stars)
   */
  private validateRating(rating: number | undefined, fieldName: string): void {
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error(`${fieldName} must be between 1 and 5 stars`);
    }
  }

  /**
   * Validate all ratings in survey data
   */
  private validateSurveyData(data: CreateSurveyData): void {
    this.validateRating(data.overallRating, 'Overall rating');
    this.validateRating(data.deliverySpeedRating, 'Delivery speed rating');
    this.validateRating(data.productQualityRating, 'Product quality rating');
    this.validateRating(data.agentServiceRating, 'Agent service rating');
    this.validateRating(data.packagingRating, 'Packaging rating');
  }

  /**
   * Check if order is eligible for survey (must be delivered)
   */
  async validateOrderEligibility(orderId: string): Promise<{ eligible: boolean; reason?: string; order?: any }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            agentCode: true,
          },
        },
      },
    });

    if (!order) {
      return { eligible: false, reason: 'Order not found' };
    }

    // Check if order is delivered (either status DELIVERED or shippingStatus LIVRÉ)
    const isDelivered = order.status === 'DELIVERED' || order.shippingStatus === 'LIVRÉ';
    
    if (!isDelivered) {
      return { 
        eligible: false, 
        reason: 'Order must be delivered before collecting satisfaction survey',
        order 
      };
    }

    return { eligible: true, order };
  }

  /**
   * Create a new satisfaction survey
   */
  async createSurvey(data: CreateSurveyData, collectedById: string) {
    // Validate ratings
    this.validateSurveyData(data);

    // Validate order eligibility
    const eligibility = await this.validateOrderEligibility(data.orderId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Order is not eligible for survey');
    }

    const order = eligibility.order;

    // Check if a survey already exists for this order
    const existingSurvey = await prisma.customerSatisfactionSurvey.findFirst({
      where: {
        orderId: data.orderId,
        isLatest: true,
      },
    });

    if (existingSurvey) {
      throw new Error('A survey already exists for this order. Use update/re-survey instead.');
    }

    // Create the survey
    const survey = await prisma.customerSatisfactionSurvey.create({
      data: {
        orderId: data.orderId,
        customerId: order.customerId,
        collectedById,
        overallRating: data.overallRating,
        deliverySpeedRating: data.deliverySpeedRating,
        productQualityRating: data.productQualityRating,
        agentServiceRating: data.agentServiceRating,
        packagingRating: data.packagingRating,
        customerComments: data.customerComments,
        internalNotes: data.internalNotes,
        surveyVersion: 1,
        isLatest: true,
      },
      include: {
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
            shippingStatus: true,
          },
        },
        customer: {
          select: {
            id: true,
            fullName: true,
            telephone: true,
            wilaya: true,
            commune: true,
          },
        },
        collectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            agentCode: true,
          },
        },
      },
    });

    console.log(`✅ Satisfaction survey created for order ${order.reference} by ${survey.collectedBy.name}`);

    return survey;
  }

  /**
   * Update existing survey (re-survey)
   */
  async updateSurvey(orderId: string, data: CreateSurveyData, collectedById: string) {
    // Validate ratings
    this.validateSurveyData(data);

    // Validate order eligibility
    const eligibility = await this.validateOrderEligibility(orderId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Order is not eligible for survey');
    }

    const order = eligibility.order;

    // Find existing survey
    const existingSurvey = await prisma.customerSatisfactionSurvey.findFirst({
      where: {
        orderId,
        isLatest: true,
      },
    });

    if (!existingSurvey) {
      throw new Error('No existing survey found for this order. Create a new survey instead.');
    }

    // Use transaction to mark old survey as not latest and create new one
    const result = await prisma.$transaction(async (tx) => {
      // Mark existing survey as not latest
      await tx.customerSatisfactionSurvey.update({
        where: { id: existingSurvey.id },
        data: { isLatest: false },
      });

      // Create new survey with incremented version
      const newSurvey = await tx.customerSatisfactionSurvey.create({
        data: {
          orderId,
          customerId: order.customerId,
          collectedById,
          overallRating: data.overallRating,
          deliverySpeedRating: data.deliverySpeedRating,
          productQualityRating: data.productQualityRating,
          agentServiceRating: data.agentServiceRating,
          packagingRating: data.packagingRating,
          customerComments: data.customerComments,
          internalNotes: data.internalNotes,
          surveyVersion: existingSurvey.surveyVersion + 1,
          isLatest: true,
        },
        include: {
          order: {
            select: {
              id: true,
              reference: true,
              status: true,
              shippingStatus: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
              telephone: true,
              wilaya: true,
              commune: true,
            },
          },
          collectedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              agentCode: true,
            },
          },
        },
      });

      return newSurvey;
    });

    console.log(`✅ Satisfaction survey updated for order ${order.reference} (version ${result.surveyVersion})`);

    return result;
  }

  /**
   * Get survey by order ID (latest version)
   */
  async getSurveyByOrderId(orderId: string) {
    const survey = await prisma.customerSatisfactionSurvey.findFirst({
      where: {
        orderId,
        isLatest: true,
      },
      include: {
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
            shippingStatus: true,
            total: true,
            orderDate: true,
          },
        },
        customer: {
          select: {
            id: true,
            fullName: true,
            telephone: true,
            email: true,
            wilaya: true,
            commune: true,
          },
        },
        collectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            agentCode: true,
          },
        },
      },
    });

    return survey;
  }

  /**
   * Get survey history for an order (all versions)
   */
  async getSurveyHistory(orderId: string) {
    const surveys = await prisma.customerSatisfactionSurvey.findMany({
      where: { orderId },
      orderBy: { surveyVersion: 'desc' },
      include: {
        collectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            agentCode: true,
          },
        },
      },
    });

    return surveys;
  }

  /**
   * List surveys with filters and pagination
   */
  async listSurveys(
    filters: SurveyFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: 'date' | 'rating' = 'date'
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CustomerSatisfactionSurveyWhereInput = {
      isLatest: true, // Only show latest versions
    };

    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.collectedById) {
      where.collectedById = filters.collectedById;
    }

    if (filters.minRating !== undefined || filters.maxRating !== undefined) {
      where.overallRating = {};
      if (filters.minRating !== undefined) {
        where.overallRating.gte = filters.minRating;
      }
      if (filters.maxRating !== undefined) {
        where.overallRating.lte = filters.maxRating;
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    // Build order by clause
    const orderBy: Prisma.CustomerSatisfactionSurveyOrderByWithRelationInput = 
      sortBy === 'rating' 
        ? { overallRating: 'desc' }
        : { createdAt: 'desc' };

    // Execute queries
    const [surveys, total] = await Promise.all([
      prisma.customerSatisfactionSurvey.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          order: {
            select: {
              id: true,
              reference: true,
              status: true,
              shippingStatus: true,
              total: true,
              orderDate: true,
              storeIdentifier: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
              telephone: true,
              wilaya: true,
              commune: true,
            },
          },
          collectedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              agentCode: true,
            },
          },
        },
      }),
      prisma.customerSatisfactionSurvey.count({ where }),
    ]);

    return {
      surveys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate average rating for a survey
   */
  calculateAverageRating(survey: any): number | null {
    const ratings = [
      survey.overallRating,
      survey.deliverySpeedRating,
      survey.productQualityRating,
      survey.agentServiceRating,
      survey.packagingRating,
    ].filter((r): r is number => r !== null && r !== undefined);

    if (ratings.length === 0) return null;

    const sum = ratings.reduce((acc, r) => acc + r, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Delete survey (admin only)
   */
  async deleteSurvey(surveyId: string) {
    const survey = await prisma.customerSatisfactionSurvey.delete({
      where: { id: surveyId },
    });

    console.log(`🗑️ Satisfaction survey deleted: ${surveyId}`);

    return survey;
  }

  /**
   * Get orders without surveys (for reminder system)
   */
  async getOrdersWithoutSurveys(limit: number = 50) {
    const deliveredOrders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'DELIVERED' },
          { shippingStatus: 'LIVRÉ' },
        ],
        satisfactionSurveys: {
          none: {},
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: {
          select: {
            fullName: true,
            telephone: true,
            wilaya: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            agentCode: true,
          },
        },
      },
    });

    return deliveredOrders;
  }
}

export const satisfactionSurveyService = new SatisfactionSurveyService();