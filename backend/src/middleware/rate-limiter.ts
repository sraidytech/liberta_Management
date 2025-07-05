import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// 🚀 ENTERPRISE-GRADE RATE LIMITING SOLUTION
// Multiple tiers of rate limiting for different endpoints

// General API rate limiter - applies to all routes
export const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Allow 200 requests per minute per IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '1 minute'
    });
  }
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Allow only 50 requests per minute per IP
  message: {
    success: false,
    message: 'Rate limit exceeded for sensitive operation.',
    retryAfter: '1 minute'
  },
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded for sensitive operation.',
      retryAfter: '1 minute'
    });
  }
});

// Authentication rate limiter - for login attempts
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow only 10 login attempts per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Auth rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Bulk operations rate limiter
export const bulkOperationsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Allow 20 bulk operations per 5 minutes per IP
  message: {
    success: false,
    message: 'Too many bulk operations, please try again later.',
    retryAfter: '5 minutes'
  },
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Bulk operations rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many bulk operations, please try again later.',
      retryAfter: '5 minutes'
    });
  }
});

// Per-user rate limiter (requires authentication)
export const createUserRateLimit = (maxRequests: number, windowMs: number) => {
  const store = new Map();
  
  return (req: Request, res: Response, next: Function) => {
    const userId = req.user?.id;
    if (!userId) {
      return next(); // Skip if no user (will be handled by auth middleware)
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, data] of store.entries()) {
      if (data.resetTime < now) {
        store.delete(key);
      }
    }
    
    const userKey = `user:${userId}`;
    const userData = store.get(userKey) || { count: 0, resetTime: now + windowMs };
    
    if (userData.resetTime < now) {
      // Reset window
      userData.count = 0;
      userData.resetTime = now + windowMs;
    }
    
    userData.count++;
    store.set(userKey, userData);
    
    if (userData.count > maxRequests) {
      console.warn(`🚨 User rate limit exceeded for User: ${userId}, Path: ${req.path}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please slow down.',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000) + ' seconds'
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - userData.count).toString(),
      'X-RateLimit-Reset': new Date(userData.resetTime).toISOString()
    });
    
    next();
  };
};

// Export pre-configured user rate limiters
export const userRateLimit = createUserRateLimit(500, 60 * 1000); // 500 requests per minute per user (8+ per second)
export const userStrictRateLimit = createUserRateLimit(100, 60 * 1000); // 100 requests per minute per user
export const userLightRateLimit = createUserRateLimit(1000, 60 * 1000); // 1000 requests per minute for heavy usage