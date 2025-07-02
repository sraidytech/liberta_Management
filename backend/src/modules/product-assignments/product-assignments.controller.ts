import { Request, Response } from 'express';
import { productAssignmentService } from '@/services/product-assignment.service';
import { CreateProductAssignmentRequest, UpdateProductAssignmentRequest } from '@/types';

export class ProductAssignmentsController {
  /**
   * Assign products to a user
   */
  async assignProducts(req: Request, res: Response) {
    try {
      const request: CreateProductAssignmentRequest = req.body;
      
      if (!request.userId || !request.productNames || !Array.isArray(request.productNames)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'userId and productNames array are required'
          }
        });
      }

      const result = await productAssignmentService.assignProductsToUser(request);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        data: result.assignments,
        message: result.message
      });
    } catch (error) {
      console.error('Assign products error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to assign products'
        }
      });
    }
  }

  /**
   * Update product assignments for a user
   */
  async updateAssignments(req: Request, res: Response) {
    try {
      const request: UpdateProductAssignmentRequest = req.body;
      
      if (!request.userId || !request.productNames || !Array.isArray(request.productNames)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'userId and productNames array are required'
          }
        });
      }

      const result = await productAssignmentService.updateUserProductAssignments(request);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        data: result.assignments,
        message: result.message
      });
    } catch (error) {
      console.error('Update assignments error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update assignments'
        }
      });
    }
  }

  /**
   * Get user's assigned products
   */
  async getUserProducts(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'userId is required'
          }
        });
      }

      const products = await productAssignmentService.getUserAssignedProducts(userId);
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Get user products error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get user products'
        }
      });
    }
  }

  /**
   * Get users assigned to a product
   */
  async getProductUsers(req: Request, res: Response) {
    try {
      const { productName } = req.params;
      
      if (!productName) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'productName is required'
          }
        });
      }

      const users = await productAssignmentService.getUsersAssignedToProduct(decodeURIComponent(productName));
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get product users error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get product users'
        }
      });
    }
  }

  /**
   * Get all product assignments
   */
  async getAssignments(req: Request, res: Response) {
    try {
      const { userId, productName, isActive } = req.query;
      
      const filters = {
        userId: userId as string,
        productName: productName as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
      };

      const result = await productAssignmentService.getProductAssignments(filters);
      
      res.json(result);
    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get assignments'
        }
      });
    }
  }

  /**
   * Get available products
   */
  async getAvailableProducts(req: Request, res: Response) {
    try {
      const products = await productAssignmentService.getAvailableProducts();
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Get available products error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get available products'
        }
      });
    }
  }

  /**
   * Remove product assignment
   */
  async removeAssignment(req: Request, res: Response) {
    try {
      const { userId, productName } = req.params;
      
      if (!userId || !productName) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'userId and productName are required'
          }
        });
      }

      const result = await productAssignmentService.removeProductAssignment(
        userId, 
        decodeURIComponent(productName)
      );
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: result.message
          }
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Remove assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to remove assignment'
        }
      });
    }
  }

  /**
   * Get assignment statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const result = await productAssignmentService.getAssignmentStats();
      
      res.json(result);
    } catch (error) {
      console.error('Get assignment stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get assignment statistics'
        }
      });
    }
  }

  /**
   * Get current user's product assignments (for coordinateurs)
   */
  async getMyAssignments(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated'
          }
        });
      }

      const result = await productAssignmentService.getProductAssignments({ userId });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: result.message
          }
        });
      }

      // Get all product names for bulk statistics query
      const productNames = result.data?.map((assignment: any) => assignment.productName) || [];
      
      // Get statistics for all products in one query
      const allProductStats = await productAssignmentService.getBulkProductStatistics(productNames);
      
      // Transform the data to include real product statistics from orders
      const assignmentsWithStats = result.data?.map((assignment: any) => {
        const productStats = allProductStats[assignment.productName] || {
          totalOrders: 0,
          totalRevenue: 0,
          averagePrice: 0,
          assignedAgents: 1,
          category: 'General'
        };
        
        return {
          id: assignment.id,
          userId: assignment.userId,
          productId: assignment.productName, // Use productName as productId for compatibility
          assignedAt: assignment.createdAt,
          product: {
            id: assignment.productName,
            name: assignment.productName,
            description: `Product: ${assignment.productName}`,
            category: productStats.category || 'General',
            price: productStats.averagePrice || 0,
            status: assignment.isActive ? 'ACTIVE' : 'INACTIVE',
            totalOrders: productStats.totalOrders || 0,
            assignedAgents: productStats.assignedAgents || 1,
            revenue: productStats.totalRevenue || 0
          }
        };
      }) || [];

      res.json({
        success: true,
        data: assignmentsWithStats
      });
    } catch (error) {
      console.error('Get my assignments error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get user assignments'
        }
      });
    }
  }
}
