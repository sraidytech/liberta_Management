import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateAgentCode } from '@/utils/helpers';
import redis from '@/config/redis';

const prisma = new PrismaClient();

export class UsersController {
  // Check if an agent is online based on recent activity
  private async isAgentOnline(agentId: string): Promise<boolean> {
    try {
      const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      // Check last activity timestamp - this is the primary indicator
      const activityKey = `activity:agent:${agentId}`;
      const lastActivity = await redis.get(activityKey);
      
      if (!lastActivity) {
        return false;
      }

      const lastActivityTime = new Date(lastActivity);
      const now = new Date();
      const timeDiff = now.getTime() - lastActivityTime.getTime();

      // User is online if they have recent activity (within 15 minutes)
      return timeDiff <= ACTIVITY_TIMEOUT;
    } catch (error) {
      console.error('Error checking agent online status:', error);
      return false;
    }
  }

  // Get all users
  async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          agentCode: true,
          maxOrders: true,
          currentOrders: true,
          availability: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Check real online status for each user
      const usersWithRealStatus = await Promise.all(
        users.map(async (user) => {
          let realAvailability = user.availability;
          
          // For agents, check real online status from Redis
          if (user.role === 'AGENT_SUIVI' || user.role === 'AGENT_CALL_CENTER') {
            const isOnline = await this.isAgentOnline(user.id);
            realAvailability = isOnline ? 'ONLINE' : 'OFFLINE';
          }
          // For admins and managers, check if they have recent activity
          else if (user.role === 'ADMIN' || user.role === 'TEAM_MANAGER') {
            const activityKey = `activity:agent:${user.id}`;
            const lastActivity = await redis.get(activityKey);
            
            if (lastActivity) {
              const lastActivityTime = new Date(lastActivity);
              const now = new Date();
              const timeDiff = now.getTime() - lastActivityTime.getTime();
              const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
              
              realAvailability = timeDiff <= ACTIVITY_TIMEOUT ? 'ONLINE' : 'OFFLINE';
            } else {
              realAvailability = 'OFFLINE';
            }
          }

          return {
            ...user,
            availability: realAvailability
          };
        })
      );

      res.json({
        success: true,
        data: usersWithRealStatus
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch users'
        }
      });
    }
  }

  // Create new user
  async createUser(req: Request, res: Response) {
    try {
      const { name, email, password, role } = req.body;

      // Validate required fields
      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Name, email, password, and role are required'
          }
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'User with this email already exists'
          }
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate agent code based on role
      const agentCode = generateAgentCode(role);

      // Set default max orders based on role
      const maxOrders = role === 'TEAM_MANAGER' ? 100 : 50;

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          agentCode,
          maxOrders,
          currentOrders: 0,
          availability: 'OFFLINE',
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          agentCode: true,
          maxOrders: true,
          currentOrders: true,
          availability: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create user'
        }
      });
    }
  }

  // Update user
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, role, agentCode, maxOrders, isActive } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }

      // Check if email is already taken by another user
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email }
        });

        if (emailExists) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Email is already taken by another user'
            }
          });
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(role && { role }),
          ...(agentCode && { agentCode }),
          ...(maxOrders && { maxOrders }),
          ...(typeof isActive === 'boolean' && { isActive })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          agentCode: true,
          maxOrders: true,
          currentOrders: true,
          availability: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update user'
        }
      });
    }
  }

  // Delete user
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }

      // Prevent deleting admin users
      if (existingUser.role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cannot delete admin users'
          }
        });
      }

      // Delete user
      await prisma.user.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete user'
        }
      });
    }
  }

  // Update user availability
  async updateAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { availability } = req.body;

      if (!availability || !['ONLINE', 'BUSY', 'BREAK', 'OFFLINE'].includes(availability)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Valid availability status is required'
          }
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { availability },
        select: {
          id: true,
          availability: true
        }
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Availability updated successfully'
      });
    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update availability'
        }
      });
    }
  }
}