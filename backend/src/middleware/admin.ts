import { Request, Response, NextFunction } from 'express';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required.'
        }
      });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Admin access required.'
        }
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Server error.'
      }
    });
  }
};