import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/app';
import { prisma } from '@/config/database';
import redis from '@/config/redis';
import { UserRole } from '@prisma/client';

interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Access token is required',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        agentCode: true,
        availability: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or inactive user',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
      return;
    }

    req.user = user;
    
    // 🔥 CRITICAL FIX: Update user activity in Redis for online status tracking
    try {
      const now = new Date().toISOString();
      await redis.set(`activity:agent:${user.id}`, now);
      
      // Also update database availability if user is not already marked as online
      // Only update database if necessary to avoid unnecessary writes
      if (user.availability !== 'ONLINE') {
        await prisma.user.update({
          where: { id: user.id },
          data: { availability: 'ONLINE' }
        });
        console.log(`✅ User ${user.name || user.email} marked as ONLINE`);
      }
    } catch (activityError) {
      console.error('Error updating user activity:', activityError);
      // Don't fail authentication if activity tracking fails
    }
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      },
    });
  }
};

// Role-based authorization middleware
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole([UserRole.ADMIN]);

// Manager or Admin middleware
export const requireManager = requireRole([UserRole.ADMIN, UserRole.TEAM_MANAGER]);

// Coordinateur middleware
export const requireCoordinateur = requireRole([UserRole.ADMIN, UserRole.TEAM_MANAGER, UserRole.COORDINATEUR]);

// Quality Agent middleware
export const requireQualityAgent = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.QUALITY_AGENT,
]);

// Agent middleware (any agent role)
export const requireAgent = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.COORDINATEUR,
  UserRole.AGENT_SUIVI,
  UserRole.AGENT_CALL_CENTER,
  UserRole.QUALITY_AGENT,
]);

// Media Buyer middleware
export const requireMediaBuyer = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.MEDIA_BUYER,
]);

// Stores read access (for Media Buyer to see stores list)
export const requireStoresReadAccess = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.MEDIA_BUYER,
]);