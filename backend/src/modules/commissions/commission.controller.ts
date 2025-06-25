import { Request, Response } from 'express';
import { commissionService } from '@/services/commission.service';

export class CommissionController {
  /**
   * Calculate commission for a specific agent
   */
  async calculateAgentCommission(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { startDate, endDate, period = 'monthly' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'startDate and endDate are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const commission = await commissionService.calculateAgentCommission(
        agentId,
        new Date(startDate as string),
        new Date(endDate as string),
        period as 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: commission
      });
    } catch (error) {
      console.error('Calculate commission error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to calculate commission',
          code: 'COMMISSION_CALCULATION_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get commission summary for all agents
   */
  async getCommissionSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, period = 'monthly', thresholdMode = 'product' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'startDate and endDate are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const summary = await commissionService.getCommissionSummary(
        new Date(startDate as string),
        new Date(endDate as string),
        period as 'weekly' | 'monthly',
        thresholdMode as 'product' | 'total'
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Commission summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get commission summary',
          code: 'COMMISSION_SUMMARY_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get products from orders
   */
  async getProductsFromOrders(req: Request, res: Response) {
    try {
      const products = await commissionService.getProductsWithCommissionStatus();

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Get products from orders error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get products from orders',
          code: 'GET_PRODUCTS_FROM_ORDERS_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get all product commissions
   */
  async getProductCommissions(req: Request, res: Response) {
    try {
      const products = await commissionService.getAllProductCommissions();

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Get product commissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get product commissions',
          code: 'GET_PRODUCTS_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get agents with performance data
   */
  async getAgentsWithPerformance(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const agents = await commissionService.getAgentsWithPerformanceData(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error('Get agents with performance error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get agents with performance data',
          code: 'GET_AGENTS_PERFORMANCE_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Create or update product commission
   */
  async upsertProductCommission(req: Request, res: Response) {
    try {
      const { productName, packQuantity, commissionCriteria } = req.body;

      if (!productName || !packQuantity || !commissionCriteria) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'productName, packQuantity, and commissionCriteria are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const product = await commissionService.upsertProductCommission({
        productName,
        packQuantity: parseInt(packQuantity),
        commissionCriteria
      });

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Upsert product commission error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to save product commission',
          code: 'UPSERT_PRODUCT_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Delete product commission
   */
  async deleteProductCommission(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await commissionService.deleteProductCommission(id);

      res.json({
        success: true,
        message: 'Product commission deleted successfully'
      });
    } catch (error) {
      console.error('Delete product commission error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete product commission',
          code: 'DELETE_PRODUCT_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Set agent confirmation rate
   */
  async setAgentConfirmationRate(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { confirmationRate, period, startDate, endDate } = req.body;

      if (!confirmationRate || !period || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'confirmationRate, period, startDate, and endDate are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const rate = await commissionService.setAgentConfirmationRate({
        agentId,
        confirmationRate: parseFloat(confirmationRate),
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Set agent rate error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to set agent confirmation rate',
          code: 'SET_AGENT_RATE_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get agent confirmation rates
   */
  async getAgentConfirmationRates(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { period, startDate, endDate } = req.query;

      const rates = await commissionService.getAgentConfirmationRates(
        agentId,
        period as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Get agent rates error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get agent confirmation rates',
          code: 'GET_AGENT_RATES_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get all agent rates
   */
  async getAllAgentRates(req: Request, res: Response) {
    try {
      const rates = await commissionService.getAllAgentRates();

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Get all agent rates error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get all agent rates',
          code: 'GET_ALL_AGENT_RATES_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Set agent-product confirmation rate
   */
  async setAgentProductConfirmationRate(req: Request, res: Response) {
    try {
      const { agentId, productName } = req.params;
      const { confirmationRate, startDate, endDate, metadata } = req.body;

      if (!confirmationRate || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'confirmationRate, startDate, and endDate are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const rate = await commissionService.setAgentProductConfirmationRate({
        agentId,
        productName,
        confirmationRate: parseFloat(confirmationRate),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metadata
      });

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Set agent-product confirmation rate error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to set agent-product confirmation rate',
          code: 'SET_AGENT_PRODUCT_RATE_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get agent-product confirmation rates
   */
  async getAgentProductConfirmationRates(req: Request, res: Response) {
    try {
      const { agentId, productName } = req.query;
      const { startDate, endDate } = req.query;

      const rates = await commissionService.getAgentProductConfirmationRates(
        agentId as string,
        productName as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Get agent-product confirmation rates error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get agent-product confirmation rates',
          code: 'GET_AGENT_PRODUCT_RATES_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Delete agent-product confirmation rate
   */
  async deleteAgentProductConfirmationRate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await commissionService.deleteAgentProductConfirmationRate(id);

      res.json({
        success: true,
        message: 'Agent-product confirmation rate deleted successfully'
      });
    } catch (error) {
      console.error('Delete agent-product confirmation rate error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete agent-product confirmation rate',
          code: 'DELETE_AGENT_PRODUCT_RATE_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Update agent-product confirmation rate
   */
  async updateAgentProductConfirmationRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { confirmationRate, startDate, endDate, metadata } = req.body;

      if (!confirmationRate || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'confirmationRate, startDate, and endDate are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const rate = await commissionService.updateAgentProductConfirmationRate(id, {
        confirmationRate: parseFloat(confirmationRate),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metadata
      });

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Update agent-product confirmation rate error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update agent-product confirmation rate',
          code: 'UPDATE_AGENT_PRODUCT_RATE_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Bulk create agent-product confirmation rates
   */
  async bulkCreateAgentProductConfirmationRates(req: Request, res: Response) {
    try {
      const { rates } = req.body;

      if (!rates || !Array.isArray(rates) || rates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'rates array is required and must not be empty',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const createdRates = await commissionService.bulkCreateAgentProductConfirmationRates(rates);

      res.json({
        success: true,
        data: createdRates
      });
    } catch (error) {
      console.error('Bulk create agent-product confirmation rates error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to bulk create agent-product confirmation rates',
          code: 'BULK_CREATE_AGENT_PRODUCT_RATES_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Bulk update agent-product confirmation rates
   */
  async bulkUpdateAgentProductConfirmationRates(req: Request, res: Response) {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'updates array is required and must not be empty',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const updatedRates = await commissionService.bulkUpdateAgentProductConfirmationRates(updates);

      res.json({
        success: true,
        data: updatedRates
      });
    } catch (error) {
      console.error('Bulk update agent-product confirmation rates error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to bulk update agent-product confirmation rates',
          code: 'BULK_UPDATE_AGENT_PRODUCT_RATES_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Bulk delete agent-product confirmation rates
   */
  async bulkDeleteAgentProductConfirmationRates(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'ids array is required and must not be empty',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      await commissionService.bulkDeleteAgentProductConfirmationRates(ids);

      res.json({
        success: true,
        message: 'Agent-product confirmation rates deleted successfully'
      });
    } catch (error) {
      console.error('Bulk delete agent-product confirmation rates error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to bulk delete agent-product confirmation rates',
          code: 'BULK_DELETE_AGENT_PRODUCT_RATES_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Export commission report
   */
  async exportCommissionReport(req: Request, res: Response) {
    try {
      const { startDate, endDate, period = 'monthly', format = 'json' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'startDate and endDate are required',
            code: 'MISSING_PARAMETERS',
            statusCode: 400
          }
        });
      }

      const summary = await commissionService.getCommissionSummary(
        new Date(startDate as string),
        new Date(endDate as string),
        period as 'weekly' | 'monthly'
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(summary);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=commission-report-${startDate}-${endDate}.csv`);
        res.send(csvData);
      } else {
        // Return JSON
        res.json({
          success: true,
          data: summary,
          meta: {
            exportDate: new Date().toISOString(),
            period: { startDate, endDate, type: period },
            totalAgents: summary.length,
            totalCommission: summary.reduce((sum, agent) => sum + agent.totalCommission, 0)
          }
        });
      }
    } catch (error) {
      console.error('Export commission report error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to export commission report',
          code: 'EXPORT_REPORT_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Convert commission data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = [
      'Agent ID',
      'Agent Name',
      'Agent Code',
      'Confirmation Rate',
      'Total Orders',
      'Total Commission',
      'Products'
    ];

    const rows = data.map(agent => [
      agent.agentInfo.id,
      agent.agentInfo.name,
      agent.agentInfo.agentCode,
      agent.agentInfo.confirmationRate,
      agent.agentInfo.totalOrders,
      agent.totalCommission,
      agent.breakdown.map((p: any) => `${p.product}: ${p.total}`).join('; ')
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}