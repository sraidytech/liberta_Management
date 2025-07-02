import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/app';
import prisma from '@/config/database';
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

// Agent middleware (any agent role)
export const requireAgent = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.COORDINATEUR,
  UserRole.AGENT_SUIVI,
  UserRole.AGENT_CALL_CENTER,
]);