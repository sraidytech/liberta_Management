import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '@/config/app';
import { prisma } from '@/config/database';
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types';
import { AgentAssignmentService } from '@/services/agent-assignment.service';
import redis from '@/config/redis';

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Email and password are required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Account is deactivated',
            code: 'ACCOUNT_DEACTIVATED',
            statusCode: 401,
          },
        });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      // Track activity for all users on login
      try {
        const now = new Date().toISOString();
        await redis.set(`activity:agent:${user.id}`, now);
        
        // For AGENT_SUIVI, also use the assignment service for additional setup
        if (user.role === 'AGENT_SUIVI') {
          const assignmentService = new AgentAssignmentService(redis);
          await assignmentService.markAgentAsActive(user.id);
          console.log(`✅ Agent ${user.name || user.agentCode || user.email} marked as active for assignments`);
        } else {
          // For other roles, just update database availability
          await prisma.user.update({
            where: { id: user.id },
            data: { availability: 'ONLINE' }
          });
          console.log(`✅ ${user.role} ${user.name || user.email} marked as online`);
        }
      } catch (error) {
        console.error('Error tracking user activity on login:', error);
        // Don't fail login if this fails
      }

      const { password: _, ...userWithoutPassword } = user;

      const response: AuthResponse = {
        user: userWithoutPassword,
        token,
      };

      res.json({
        success: true,
        data: response,
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role }: RegisterRequest = req.body;

      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Email, password, and name are required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: {
            message: 'User already exists',
            code: 'USER_EXISTS',
            statusCode: 409,
          },
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'AGENT_SUIVI',
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;

      const response: AuthResponse = {
        user: userWithoutPassword,
        token,
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'Registration successful',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Placeholder for refresh token logic
      res.status(501).json({
        success: false,
        error: {
          message: 'Refresh token not implemented yet',
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from token if provided
      const token = req.header('Authorization')?.replace('Bearer ', '');
      let userId: string | null = null;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwtSecret) as any;
          userId = decoded.userId;
        } catch (tokenError) {
          // Token might be expired or invalid, but we still want to allow logout
          console.log('Token validation failed during logout, continuing...');
        }
      }

      // If we have a user ID, mark them as offline
      if (userId) {
        try {
          // Update user availability to OFFLINE
          await prisma.user.update({
            where: { id: userId },
            data: { availability: 'OFFLINE' }
          });

          // Clean up Redis activity tracking
          await redis.del(`activity:agent:${userId}`);
          await redis.del(`socket:agent:${userId}`);
          
          console.log(`✅ User ${userId} logged out and marked as OFFLINE`);
        } catch (cleanupError) {
          console.error('Error during logout cleanup:', cleanupError);
          // Don't fail logout if cleanup fails
        }
      }

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      // Placeholder for forgot password logic
      res.status(501).json({
        success: false,
        error: {
          message: 'Forgot password not implemented yet',
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
        },
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // Placeholder for reset password logic
      res.status(501).json({
        success: false,
        error: {
          message: 'Reset password not implemented yet',
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
        },
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          agentCode: true,
          availability: true,
          maxOrders: true,
          currentOrders: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            statusCode: 404,
          },
        });
        return;
      }

      // Update user activity for online status tracking
      try {
        const now = new Date().toISOString();
        await redis.set(`activity:agent:${userId}`, now);
      } catch (error) {
        console.error('Error updating user activity:', error);
        // Don't fail the request if activity tracking fails
      }

      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully',
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { name, agentCode, maxOrders } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (agentCode !== undefined) updateData.agentCode = agentCode;
      if (maxOrders !== undefined) updateData.maxOrders = parseInt(maxOrders);

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          agentCode: true,
          availability: true,
          maxOrders: true,
          currentOrders: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  // Admin-only: Change password for any user
  async changeUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId, newPassword } = req.body;
      const adminUser = (req as any).user;

      if (!adminUser || adminUser.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            message: 'Admin access required',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
        return;
      }

      if (!userId || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            message: 'User ID and new password are required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 6 characters long',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
        return;
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            statusCode: 404,
          },
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      console.log(`✅ Admin ${adminUser.email} changed password for user ${targetUser.email}`);

      res.json({
        success: true,
        message: `Password changed successfully for ${targetUser.name || targetUser.email}`,
      });
    } catch (error) {
      console.error('Change user password error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  // Admin: Change own password
  async changeOwnPassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminUser = (req as any).user;

      if (!adminUser || adminUser.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            message: 'Admin access required',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Current password and new password are required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: {
            message: 'New password must be at least 6 characters long',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
        return;
      }

      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: adminUser.id },
      });

      if (!user || !user.password) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            statusCode: 404,
          },
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Current password is incorrect',
            code: 'INVALID_PASSWORD',
            statusCode: 400,
          },
        });
        return;
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: adminUser.id },
        data: { password: hashedNewPassword },
      });

      console.log(`✅ Admin ${adminUser.email} changed their own password`);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change own password error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }
}

export const authController = new AuthController();