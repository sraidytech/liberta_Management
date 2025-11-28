import { prisma } from '@/config/database';
import {
  CreateEntryDto,
  UpdateEntryDto,
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateSourceDto,
  UpdateSourceDto,
  CreateExchangeRateDto,
  CreateConversionDto,
  EntryFilters,
  BudgetFilters,
  DashboardStats,
  BudgetStatus,
  AnalyticsBySource,
  ConversionAnalytics,
} from './types';

class MediaBuyingService {
  // ============================================
  // AD SOURCES
  // ============================================

  async getSources(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return prisma.adSource.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getSourceById(id: string) {
    return prisma.adSource.findUnique({
      where: { id },
    });
  }

  async createSource(data: CreateSourceDto) {
    return prisma.adSource.create({
      data: {
        name: data.name,
        slug: data.slug,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async updateSource(id: string, data: UpdateSourceDto) {
    return prisma.adSource.update({
      where: { id },
      data,
    });
  }

  // ============================================
  // ENTRIES
  // ============================================

  async getEntries(filters: EntryFilters) {
    const { startDate, endDate, sourceId, storeId, productId, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = { gte: new Date(startDate) };
    } else if (endDate) {
      where.date = { lte: new Date(endDate) };
    }

    if (sourceId) where.sourceId = sourceId;
    if (storeId) where.storeId = storeId;
    if (productId) where.productId = productId;

    const [entries, total] = await Promise.all([
      prisma.mediaBuyingEntry.findMany({
        where,
        include: {
          source: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mediaBuyingEntry.count({ where }),
    ]);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEntryById(id: string) {
    return prisma.mediaBuyingEntry.findUnique({
      where: { id },
      include: {
        source: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        leadConversions: {
          include: {
            order: {
              select: { id: true, reference: true, total: true, status: true },
            },
          },
        },
      },
    });
  }

  async createEntry(data: CreateEntryDto, userId: string) {
    // Calculate spendInDZD if currency is USD and exchangeRate is provided
    let spendInDZD: number | null = null;
    if (data.currency === 'USD' && data.exchangeRate) {
      spendInDZD = data.totalSpend * data.exchangeRate;
    } else if (data.currency === 'DZD') {
      spendInDZD = data.totalSpend;
    }

    const entry = await prisma.mediaBuyingEntry.create({
      data: {
        date: new Date(data.date),
        dateRangeStart: data.dateRangeStart ? new Date(data.dateRangeStart) : null,
        dateRangeEnd: data.dateRangeEnd ? new Date(data.dateRangeEnd) : null,
        sourceId: data.sourceId,
        totalSpend: data.totalSpend,
        totalLeads: data.totalLeads,
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        spendInDZD,
        storeId: data.storeId,
        productId: data.productId,
        metadata: data.metadata as any,
        createdById: userId,
      },
      include: {
        source: true,
      },
    });

    // Check budget alerts
    await this.checkBudgetAlerts(entry.sourceId, entry.date);

    return entry;
  }

  async updateEntry(id: string, data: UpdateEntryDto) {
    // Calculate spendInDZD if needed
    let spendInDZD: number | undefined;
    if (data.totalSpend !== undefined) {
      if (data.currency === 'USD' && data.exchangeRate) {
        spendInDZD = data.totalSpend * data.exchangeRate;
      } else if (data.currency === 'DZD') {
        spendInDZD = data.totalSpend;
      }
    }

    return prisma.mediaBuyingEntry.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        dateRangeStart: data.dateRangeStart ? new Date(data.dateRangeStart) : undefined,
        dateRangeEnd: data.dateRangeEnd ? new Date(data.dateRangeEnd) : undefined,
        sourceId: data.sourceId,
        totalSpend: data.totalSpend,
        totalLeads: data.totalLeads,
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        spendInDZD,
        storeId: data.storeId,
        productId: data.productId,
        metadata: data.metadata as any,
      },
      include: {
        source: true,
      },
    });
  }

  async deleteEntry(id: string) {
    return prisma.mediaBuyingEntry.delete({
      where: { id },
    });
  }

  // ============================================
  // BUDGETS
  // ============================================

  async getBudgets(filters: BudgetFilters) {
    const where: any = {};
    if (filters.month) where.month = filters.month;
    if (filters.year) where.year = filters.year;
    if (filters.sourceId !== undefined) where.sourceId = filters.sourceId;

    const budgets = await prisma.mediaBuyingBudget.findMany({
      where,
      include: {
        source: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Transform budgets to include USD and DZD fields
    // Get the actual spend to calculate the real exchange rate used
    const startOfMonth = (month: number, year: number) => new Date(year, month - 1, 1);
    const endOfMonth = (month: number, year: number) => new Date(year, month, 0, 23, 59, 59);
    
    const transformedBudgets = await Promise.all(budgets.map(async (budget) => {
      // Get entries for this budget period to find the actual exchange rate used
      const entries = await prisma.mediaBuyingEntry.findMany({
        where: {
          date: {
            gte: startOfMonth(budget.month, budget.year),
            lte: endOfMonth(budget.month, budget.year),
          },
          ...(budget.sourceId && { sourceId: budget.sourceId }),
        },
        select: { totalSpend: true, spendInDZD: true, exchangeRate: true },
        take: 1, // Just need one to get the exchange rate
      });

      // Calculate exchange rate from entries, or use a reasonable default
      let exchangeRate = 140; // Default
      if (entries.length > 0 && entries[0].exchangeRate) {
        exchangeRate = entries[0].exchangeRate;
      } else if (entries.length > 0 && entries[0].spendInDZD && entries[0].totalSpend) {
        exchangeRate = entries[0].spendInDZD / entries[0].totalSpend;
      }

      return {
        ...budget,
        budgetDZD: budget.budgetAmount,
        budgetUSD: budget.budgetAmount / exchangeRate,
      };
    }));
    
    return transformedBudgets;
  }

  async getBudgetById(id: string) {
    return prisma.mediaBuyingBudget.findUnique({
      where: { id },
      include: {
        source: true,
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async createBudget(data: CreateBudgetDto, userId: string) {
    // Calculate budgetAmount based on currency
    // If budgetUSD and exchangeRate are provided, calculate DZD amount
    let budgetAmount = data.budgetAmount;
    let budgetUSD = 0;
    let exchangeRate = 135; // Default
    
    if (!budgetAmount && (data as any).budgetUSD && (data as any).exchangeRate) {
      // Frontend sends budgetUSD and exchangeRate
      budgetUSD = (data as any).budgetUSD;
      exchangeRate = (data as any).exchangeRate;
      budgetAmount = budgetUSD * exchangeRate;
    } else if (budgetAmount) {
      // If only budgetAmount provided, calculate USD
      budgetUSD = budgetAmount / exchangeRate;
    }
    
    if (!budgetAmount) {
      throw new Error('Budget amount is required. Provide either budgetAmount or budgetUSD with exchangeRate.');
    }

    const budget = await prisma.mediaBuyingBudget.create({
      data: {
        month: data.month,
        year: data.year,
        sourceId: data.sourceId,
        budgetAmount,
        currency: data.currency || 'DZD',
        alertThreshold: data.alertThreshold || 80,
        alertEnabled: data.alertEnabled ?? true,
        createdById: userId,
      },
      include: {
        source: true,
      },
    });

    // Return with USD and DZD fields
    return {
      ...budget,
      budgetUSD,
      budgetDZD: budgetAmount,
    };
  }

  async updateBudget(id: string, data: UpdateBudgetDto) {
    // Handle budgetUSD and exchangeRate from frontend
    let updateData: any = { ...data };
    
    if ((data as any).budgetUSD && (data as any).exchangeRate) {
      const budgetUSD = (data as any).budgetUSD;
      const exchangeRate = (data as any).exchangeRate;
      updateData.budgetAmount = budgetUSD * exchangeRate;
      delete updateData.budgetUSD;
      delete updateData.exchangeRate;
    }

    const budget = await prisma.mediaBuyingBudget.update({
      where: { id },
      data: updateData,
      include: {
        source: true,
      },
    });

    // Return with USD and DZD fields
    const exchangeRate = (data as any).exchangeRate || 135;
    return {
      ...budget,
      budgetUSD: budget.budgetAmount / exchangeRate,
      budgetDZD: budget.budgetAmount,
    };
  }

  async getBudgetStatus(month?: number, year?: number): Promise<BudgetStatus[]> {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const budgets = await prisma.mediaBuyingBudget.findMany({
      where: {
        month: targetMonth,
        year: targetYear,
      },
      include: {
        source: true,
      },
    });

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const statuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      const where: any = {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      };

      if (budget.sourceId) {
        where.sourceId = budget.sourceId;
      }

      const entries = await prisma.mediaBuyingEntry.findMany({
        where,
        select: { spendInDZD: true, totalSpend: true, currency: true, exchangeRate: true },
      });

      // Calculate spend in both USD and DZD
      const currentSpendDZD = entries.reduce((sum, e) => {
        return sum + (e.spendInDZD || e.totalSpend);
      }, 0);

      const currentSpendUSD = entries.reduce((sum, e) => {
        if (e.currency === 'USD') {
          return sum + e.totalSpend;
        } else if (e.currency === 'DZD' && e.exchangeRate) {
          return sum + (e.totalSpend / e.exchangeRate);
        }
        return sum + e.totalSpend; // Fallback
      }, 0);

      // Assume budget is in DZD, convert to USD for display
      const avgExchangeRate = entries.length > 0
        ? entries.reduce((sum, e) => sum + (e.exchangeRate || 135), 0) / entries.length
        : 135;
      const budgetUSD = budget.budgetAmount / avgExchangeRate;

      const spendPercentage = (currentSpendDZD / budget.budgetAmount) * 100;
      const percentageUsed = spendPercentage;

      statuses.push({
        budgetId: budget.id,
        month: budget.month,
        year: budget.year,
        sourceId: budget.sourceId,
        sourceName: budget.source?.name || null,
        budgetUSD,
        budgetAmount: budget.budgetAmount,
        spentUSD: currentSpendUSD,
        currentSpend: currentSpendDZD,
        remainingUSD: budgetUSD - currentSpendUSD,
        remaining: budget.budgetAmount - currentSpendDZD,
        percentageUsed,
        spendPercentage,
        alertThreshold: budget.alertThreshold,
        isOverBudget: currentSpendDZD > budget.budgetAmount,
        isNearThreshold: spendPercentage >= budget.alertThreshold,
      });
    }

    return statuses;
  }

  private async checkBudgetAlerts(sourceId: string, date: Date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Check source-specific budget
    const sourceBudget = await prisma.mediaBuyingBudget.findFirst({
      where: { month, year, sourceId, alertEnabled: true },
    });

    // Check global budget
    const globalBudget = await prisma.mediaBuyingBudget.findFirst({
      where: { month, year, sourceId: null, alertEnabled: true },
    });

    const budgetsToCheck = [sourceBudget, globalBudget].filter(Boolean);

    for (const budget of budgetsToCheck) {
      if (!budget) continue;

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const where: any = {
        date: { gte: startOfMonth, lte: endOfMonth },
      };
      if (budget.sourceId) where.sourceId = budget.sourceId;

      const entries = await prisma.mediaBuyingEntry.findMany({
        where,
        select: { spendInDZD: true, totalSpend: true },
      });

      const currentSpend = entries.reduce((sum, e) => sum + (e.spendInDZD || e.totalSpend), 0);
      const spendPercentage = (currentSpend / budget.budgetAmount) * 100;

      // Check if we need to create an alert
      if (spendPercentage >= 100) {
        // Budget exceeded
        const existingAlert = await prisma.budgetAlert.findFirst({
          where: {
            budgetId: budget.id,
            alertType: 'BUDGET_EXCEEDED',
            createdAt: { gte: startOfMonth },
          },
        });

        if (!existingAlert) {
          await prisma.budgetAlert.create({
            data: {
              budgetId: budget.id,
              alertType: 'BUDGET_EXCEEDED',
              threshold: 100,
              currentSpend,
              budgetAmount: budget.budgetAmount,
            },
          });
        }
      } else if (spendPercentage >= budget.alertThreshold) {
        // Threshold warning
        const existingAlert = await prisma.budgetAlert.findFirst({
          where: {
            budgetId: budget.id,
            alertType: 'THRESHOLD_WARNING',
            createdAt: { gte: startOfMonth },
          },
        });

        if (!existingAlert) {
          await prisma.budgetAlert.create({
            data: {
              budgetId: budget.id,
              alertType: 'THRESHOLD_WARNING',
              threshold: budget.alertThreshold,
              currentSpend,
              budgetAmount: budget.budgetAmount,
            },
          });
        }
      }
    }
  }

  // ============================================
  // ALERTS
  // ============================================

  async getAlerts(unreadOnly = false) {
    const where = unreadOnly ? { isRead: false } : {};

    return prisma.budgetAlert.findMany({
      where,
      include: {
        budget: {
          include: {
            source: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAlertAsRead(id: string, userId: string) {
    return prisma.budgetAlert.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
        readById: userId,
      },
    });
  }

  // ============================================
  // CONVERSIONS
  // ============================================

  async linkLeadToOrder(data: CreateConversionDto) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { total: true },
    });

    return prisma.leadConversion.create({
      data: {
        entryId: data.entryId,
        orderId: data.orderId,
        orderValue: order?.total,
        attributionType: data.attributionType || 'direct',
      },
      include: {
        entry: {
          include: { source: true },
        },
        order: {
          select: { id: true, reference: true, total: true, status: true },
        },
      },
    });
  }

  async unlinkLeadFromOrder(id: string) {
    return prisma.leadConversion.delete({
      where: { id },
    });
  }

  async getConversions(entryId?: string) {
    const where = entryId ? { entryId } : {};

    return prisma.leadConversion.findMany({
      where,
      include: {
        entry: {
          include: { source: true },
        },
        order: {
          select: { id: true, reference: true, total: true, status: true, orderDate: true },
        },
      },
      orderBy: { conversionDate: 'desc' },
    });
  }

  // ============================================
  // EXCHANGE RATES
  // ============================================

  async getExchangeRates() {
    return prisma.exchangeRate.findMany({
      orderBy: { effectiveDate: 'desc' },
      take: 30,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getLatestExchangeRate(fromCurrency = 'USD', toCurrency = 'DZD') {
    return prisma.exchangeRate.findFirst({
      where: { fromCurrency, toCurrency },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async createExchangeRate(data: CreateExchangeRateDto, userId: string) {
    return prisma.exchangeRate.create({
      data: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveDate: new Date(data.effectiveDate),
        createdById: userId,
      },
    });
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Use custom date range if provided
    const rangeStart = startDate ? new Date(startDate) : monthStart;
    const rangeEnd = endDate ? new Date(endDate) : now;

    // Get all entries for the period
    const entries = await prisma.mediaBuyingEntry.findMany({
      where: {
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        source: true,
      },
      orderBy: { date: 'desc' },
    });

    // Calculate totals
    const todayEntries = entries.filter(e => e.date >= todayStart);
    const weekEntries = entries.filter(e => e.date >= weekStart);

    const totalSpendToday = todayEntries.reduce((sum, e) => sum + e.totalSpend, 0);
    const totalSpendWeek = weekEntries.reduce((sum, e) => sum + e.totalSpend, 0);
    const totalSpendMonth = entries.reduce((sum, e) => sum + e.totalSpend, 0);
    const totalSpendInDZD = entries.reduce((sum, e) => sum + (e.spendInDZD || e.totalSpend), 0);

    const totalLeadsToday = todayEntries.reduce((sum, e) => sum + e.totalLeads, 0);
    const totalLeadsWeek = weekEntries.reduce((sum, e) => sum + e.totalLeads, 0);
    const totalLeadsMonth = entries.reduce((sum, e) => sum + e.totalLeads, 0);

    // Calculate CPL in USD (not DZD!)
    const averageCPL = totalLeadsMonth > 0 ? totalSpendMonth / totalLeadsMonth : 0;
    const averageCPLInDZD = totalLeadsMonth > 0 ? totalSpendInDZD / totalLeadsMonth : 0;

    // Spend by source
    const sourceMap = new Map<string, { source: any; spend: number; spendInDZD: number; leads: number }>();
    for (const entry of entries) {
      const existing = sourceMap.get(entry.sourceId) || {
        source: entry.source,
        spend: 0,
        spendInDZD: 0,
        leads: 0,
      };
      existing.spend += entry.totalSpend;
      existing.spendInDZD += entry.spendInDZD || entry.totalSpend;
      existing.leads += entry.totalLeads;
      sourceMap.set(entry.sourceId, existing);
    }

    const spendBySource = Array.from(sourceMap.entries()).map(([sourceId, data]) => ({
      sourceId,
      sourceName: data.source.name,
      sourceColor: data.source.color || '#6B7280',
      spend: data.spend,
      spendInDZD: data.spendInDZD,
      leads: data.leads,
      percentage: totalSpendInDZD > 0 ? (data.spendInDZD / totalSpendInDZD) * 100 : 0,
    }));

    // Best performing source (lowest CPL with at least some leads)
    const sourcesWithLeads = spendBySource.filter(s => s.leads > 0);
    const bestPerformingSource = sourcesWithLeads.length > 0
      ? sourcesWithLeads.reduce((best, current) => {
        const currentCPL = current.spendInDZD / current.leads;
        const bestCPL = best.spendInDZD / best.leads;
        return currentCPL < bestCPL ? current : best;
      })
      : null;

    // Daily trend (last 30 days)
    const dailyMap = new Map<string, { spend: number; spendInDZD: number; leads: number }>();
    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { spend: 0, spendInDZD: 0, leads: 0 };
      existing.spend += entry.totalSpend;
      existing.spendInDZD += entry.spendInDZD || entry.totalSpend;
      existing.leads += entry.totalLeads;
      dailyMap.set(dateKey, existing);
    }

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        spend: data.spend,
        spendInDZD: data.spendInDZD,
        leads: data.leads,
        cpl: data.leads > 0 ? data.spendInDZD / data.leads : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Conversions
    const conversions = await prisma.leadConversion.count({
      where: {
        entry: {
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
      },
    });

    const conversionRate = totalLeadsMonth > 0 ? (conversions / totalLeadsMonth) * 100 : 0;

    // Recent entries
    const recentEntries = entries.slice(0, 5).map(e => ({
      id: e.id,
      date: e.date.toISOString(),
      sourceName: e.source.name,
      sourceColor: e.source.color || '#6B7280',
      totalSpend: e.totalSpend,
      totalLeads: e.totalLeads,
      currency: e.currency,
    }));

    // Calculate period comparison (compare with previous period)
    const periodLength = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const prevRangeEnd = new Date(rangeStart);
    prevRangeEnd.setDate(prevRangeEnd.getDate() - 1);
    const prevRangeStart = new Date(prevRangeEnd);
    prevRangeStart.setDate(prevRangeStart.getDate() - periodLength);

    const prevEntries = await prisma.mediaBuyingEntry.findMany({
      where: {
        date: {
          gte: prevRangeStart,
          lte: prevRangeEnd,
        },
      },
    });

    const prevTotalSpend = prevEntries.reduce((sum, e) => sum + e.totalSpend, 0);
    const prevTotalLeads = prevEntries.reduce((sum, e) => sum + e.totalLeads, 0);
    const prevAvgCPL = prevTotalLeads > 0 ? prevTotalSpend / prevTotalLeads : 0;

    const spendChange = prevTotalSpend > 0 ? ((totalSpendMonth - prevTotalSpend) / prevTotalSpend) * 100 : 0;
    const leadsChange = prevTotalLeads > 0 ? ((totalLeadsMonth - prevTotalLeads) / prevTotalLeads) * 100 : 0;
    const cplChange = prevAvgCPL > 0 ? ((averageCPL - prevAvgCPL) / prevAvgCPL) * 100 : 0;

    return {
      totalSpendUSD: totalSpendMonth,
      totalSpendDZD: totalSpendInDZD,
      totalLeads: totalLeadsMonth,
      avgCostPerLead: averageCPL,
      totalConversions: conversions,
      conversionRate: conversionRate / 100, // Convert to decimal (0.05 instead of 5%)
      avgROAS: 0, // TODO: Calculate ROAS when revenue data is available
      periodComparison: {
        spendChange,
        leadsChange,
        cplChange,
      },
      // Legacy fields for backward compatibility
      totalSpendToday,
      totalSpendWeek,
      totalSpendMonth,
      totalSpendInDZD,
      totalLeadsToday,
      totalLeadsWeek,
      totalLeadsMonth,
      averageCPL,
      bestPerformingSource: bestPerformingSource ? {
        id: bestPerformingSource.sourceId,
        name: bestPerformingSource.sourceName,
        leads: bestPerformingSource.leads,
        spend: bestPerformingSource.spendInDZD,
        cpl: bestPerformingSource.spendInDZD / bestPerformingSource.leads,
      } : null,
      spendBySource,
      dailyTrend,
      recentEntries,
    };
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getAnalyticsBySource(startDate?: string, endDate?: string): Promise<AnalyticsBySource[]> {
    const now = new Date();
    const rangeStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeEnd = endDate ? new Date(endDate) : now;

    const sources = await prisma.adSource.findMany({
      where: { isActive: true },
    });

    const analytics: AnalyticsBySource[] = [];

    for (const source of sources) {
      const entries = await prisma.mediaBuyingEntry.findMany({
        where: {
          sourceId: source.id,
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        orderBy: { date: 'asc' },
      });

      const conversions = await prisma.leadConversion.count({
        where: {
          entry: {
            sourceId: source.id,
            date: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
        },
      });

      const totalSpend = entries.reduce((sum, e) => sum + e.totalSpend, 0);
      const totalSpendInDZD = entries.reduce((sum, e) => sum + (e.spendInDZD || e.totalSpend), 0);
      const totalLeads = entries.reduce((sum, e) => sum + e.totalLeads, 0);

      // Daily trend for this source
      const dailyMap = new Map<string, { spend: number; leads: number }>();
      for (const entry of entries) {
        const dateKey = entry.date.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { spend: 0, leads: 0 };
        existing.spend += entry.spendInDZD || entry.totalSpend;
        existing.leads += entry.totalLeads;
        dailyMap.set(dateKey, existing);
      }

      const trend = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, spend: data.spend, leads: data.leads }))
        .sort((a, b) => a.date.localeCompare(b.date));

      analytics.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceColor: source.color || '#6B7280',
        totalSpendUSD: totalSpend,
        totalSpendDZD: totalSpendInDZD,
        totalLeads,
        avgCostPerLead: totalLeads > 0 ? totalSpend / totalLeads : 0, // Use USD, not DZD!
        percentageOfTotal: 0, // Will be calculated after all sources are processed
        conversions,
        conversionRate: totalLeads > 0 ? (conversions / totalLeads) * 100 : 0,
        entries: entries.length,
        trend,
      });
    }

    // Calculate percentage of total for each source
    const totalSpendAllSources = analytics.reduce((sum, a) => sum + a.totalSpendDZD, 0);
    analytics.forEach(a => {
      a.percentageOfTotal = totalSpendAllSources > 0 ? (a.totalSpendDZD / totalSpendAllSources) * 100 : 0;
    });

    return analytics.sort((a, b) => b.totalSpendDZD - a.totalSpendDZD);
  }

  async getConversionAnalytics(startDate?: string, endDate?: string): Promise<ConversionAnalytics> {
    const now = new Date();
    const rangeStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeEnd = endDate ? new Date(endDate) : now;

    const entries = await prisma.mediaBuyingEntry.findMany({
      where: {
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        source: true,
        leadConversions: {
          include: {
            order: {
              select: { total: true },
            },
          },
        },
      },
    });

    const totalLeads = entries.reduce((sum, e) => sum + e.totalLeads, 0);
    const allConversions = entries.flatMap(e => e.leadConversions);
    const totalConversions = allConversions.length;
    const totalOrderValue = allConversions.reduce((sum, c) => sum + (c.orderValue || 0), 0);

    // By source
    const sourceMap = new Map<string, { source: any; leads: number; conversions: number; orderValue: number }>();
    for (const entry of entries) {
      const existing = sourceMap.get(entry.sourceId) || {
        source: entry.source,
        leads: 0,
        conversions: 0,
        orderValue: 0,
      };
      existing.leads += entry.totalLeads;
      existing.conversions += entry.leadConversions.length;
      existing.orderValue += entry.leadConversions.reduce((sum, c) => sum + (c.orderValue || 0), 0);
      sourceMap.set(entry.sourceId, existing);
    }

    const bySource = Array.from(sourceMap.entries()).map(([sourceId, data]) => ({
      sourceId,
      sourceName: data.source.name,
      leads: data.leads,
      conversions: data.conversions,
      conversionRate: data.leads > 0 ? (data.conversions / data.leads) * 100 : 0,
      orderValue: data.orderValue,
    }));

    return {
      totalLeads,
      totalConversions,
      conversionRate: totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0,
      totalOrderValue,
      averageOrderValue: totalConversions > 0 ? totalOrderValue / totalConversions : 0,
      revenuePerLead: totalLeads > 0 ? totalOrderValue / totalLeads : 0,
      bySource,
    };
  }

  // ============================================
  // EXPORT
  // ============================================

  async exportData(format: 'json' | 'csv', filters: EntryFilters) {
    const { entries } = await this.getEntries({ ...filters, limit: 10000 });

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    // CSV format
    const headers = [
      'Date',
      'Source',
      'Total Spend',
      'Currency',
      'Spend in DZD',
      'Total Leads',
      'CPL',
      'CTR',
      'CPM',
      'CPA',
      'ROAS',
      'Impressions',
      'Clicks',
      'Conversions',
      'Campaign Name',
    ];

    const rows = entries.map((e: any) => {
      const metadata = e.metadata || {};
      return [
        e.date.toISOString().split('T')[0],
        e.source.name,
        e.totalSpend,
        e.currency,
        e.spendInDZD || e.totalSpend,
        e.totalLeads,
        e.totalLeads > 0 ? ((e.spendInDZD || e.totalSpend) / e.totalLeads).toFixed(2) : '0',
        metadata.ctr || '',
        metadata.cpm || '',
        metadata.cpa || '',
        metadata.roas || '',
        metadata.impressions || '',
        metadata.clicks || '',
        metadata.conversions || '',
        metadata.campaignName || '',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const mediaBuyingService = new MediaBuyingService();