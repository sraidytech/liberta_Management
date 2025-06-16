import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '@/config/app';
import prisma from '@/config/database';
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

      // If user is AGENT_SUIVI, mark them as active for assignments
      if (user.role === 'AGENT_SUIVI') {
        try {
          const assignmentService = new AgentAssignmentService(redis);
          await assignmentService.markAgentAsActive(user.id);
          console.log(`✅ Agent ${user.name || user.agentCode || user.email} marked as active for assignments`);
        } catch (error) {
          console.error('Error marking agent as active:', error);
          // Don't fail login if this fails
        }
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
      // Placeholder for logout logic (token blacklisting, etc.)
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
      // Placeholder for get profile logic
      res.status(501).json({
        success: false,
        error: {
          message: 'Get profile not implemented yet',
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
        },
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
      // Placeholder for update profile logic
      res.status(501).json({
        success: false,
        error: {
          message: 'Update profile not implemented yet',
          code: 'NOT_IMPLEMENTED',
          statusCode: 501,
        },
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
}

export const authController = new AuthController();