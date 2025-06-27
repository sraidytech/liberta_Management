import { Request, Response, NextFunction } from 'express';
import { logUserAction, logSystemEvent, logError } from '../../services/activity-log.service';
import { ActionType, LogLevel, UserRole } from '@prisma/client';
import { ACTIVITY_ACTIONS } from '../../types';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
  };
}

// Helper function to determine action type from endpoint
const getActionTypeFromEndpoint = (method: string, path: string): ActionType => {
  // Authentication endpoints
  if (path.includes('/auth/')) {
    return ActionType.AUTHENTICATION;
  }
  
  // User management endpoints
  if (path.includes('/users')) {
    return ActionType.USER_MANAGEMENT;
  }
  
  // Order management endpoints
  if (path.includes('/orders')) {
    return ActionType.ORDER_MANAGEMENT;
  }
  
  // Store management endpoints
  if (path.includes('/stores')) {
    return ActionType.STORE_MANAGEMENT;
  }
  
  // Assignment endpoints
  if (path.includes('/assignments')) {
    return ActionType.ASSIGNMENT;
  }
  
  // Commission endpoints
  if (path.includes('/commissions')) {
    return ActionType.COMMISSION;
  }
  
  // Webhook endpoints
  if (path.includes('/webhooks')) {
    return ActionType.WEBHOOK;
  }
  
  // Default to API_CALL
  return ActionType.API_CALL;
};

// Helper function to generate action name
const generateActionName = (method: string, path: string): string => {
  const cleanPath = path.replace(/\/api\/v1\//, '').replace(/\/\d+/g, '/:id');
  
  switch (method.toUpperCase()) {
    case 'POST':
      if (path.includes('/auth/login')) return ACTIVITY_ACTIONS.LOGIN;
      if (path.includes('/auth/logout')) return ACTIVITY_ACTIONS.LOGOUT;
      if (path.includes('/auth/register')) return ACTIVITY_ACTIONS.USER_CREATE;
      return `CREATE_${cleanPath.toUpperCase().replace(/\//g, '_')}`;
    
    case 'PUT':
    case 'PATCH':
      if (path.includes('/password')) return ACTIVITY_ACTIONS.PASSWORD_CHANGE;
      return `UPDATE_${cleanPath.toUpperCase().replace(/\//g, '_')}`;
    
    case 'DELETE':
      return `DELETE_${cleanPath.toUpperCase().replace(/\//g, '_')}`;
    
    case 'GET':
      return `VIEW_${cleanPath.toUpperCase().replace(/\//g, '_')}`;
    
    default:
      return `${method.toUpperCase()}_${cleanPath.toUpperCase().replace(/\//g, '_')}`;
  }
};

// Helper function to extract resource information
const extractResourceInfo = (path: string, body: any, params: any) => {
  let resourceType: string | undefined;
  let resourceId: string | undefined;

  if (path.includes('/orders')) {
    resourceType = 'ORDER';
    resourceId = params.id || body.orderId || body.id;
  } else if (path.includes('/users')) {
    resourceType = 'USER';
    resourceId = params.id || body.userId || body.id;
  } else if (path.includes('/stores')) {
    resourceType = 'STORE';
    resourceId = params.id || body.storeId || body.id;
  } else if (path.includes('/assignments')) {
    resourceType = 'ASSIGNMENT';
    resourceId = params.id || body.assignmentId || body.id;
  } else if (path.includes('/commissions')) {
    resourceType = 'COMMISSION';
    resourceId = params.id || body.commissionId || body.id;
  }

  return { resourceType, resourceId };
};

// Helper function to generate description
const generateDescription = (method: string, path: string, user?: any, resourceType?: string): string => {
  const userName = user?.name || user?.email || 'Unknown User';
  const action = method.toLowerCase();
  
  if (path.includes('/auth/login')) {
    return `User ${userName} logged in`;
  }
  
  if (path.includes('/auth/logout')) {
    return `User ${userName} logged out`;
  }
  
  if (resourceType) {
    return `User ${userName} ${action}d ${resourceType.toLowerCase()}`;
  }
  
  const cleanPath = path.replace(/\/api\/v1\//, '').replace(/\/\d+/g, '');
  return `User ${userName} performed ${action.toUpperCase()} on ${cleanPath}`;
};

// Helper function to generate detailed description with before/after values
const generateDetailedDescription = (method: string, path: string, user?: any, resourceType?: string, body?: any, responseData?: any): string => {
  const userName = user?.name || user?.email || 'Unknown User';
  const action = method.toLowerCase();
  
  if (path.includes('/auth/login')) {
    return `User ${userName} logged in`;
  }
  
  if (path.includes('/auth/logout')) {
    return `User ${userName} logged out`;
  }

  // For status updates, provide detailed information
  if (path.includes('/status') && (method === 'PUT' || method === 'PATCH')) {
    const oldStatus = body?.oldStatus || 'unknown';
    const newStatus = body?.status || body?.newStatus || 'unknown';
    return `User ${userName} updated status from "${oldStatus}" to "${newStatus}"`;
  }

  // For general updates, show what was changed
  if ((method === 'PUT' || method === 'PATCH') && body) {
    const changedFields = Object.keys(body).filter(key => key !== 'id').join(', ');
    if (changedFields) {
      return `User ${userName} updated ${resourceType?.toLowerCase() || 'resource'} (changed: ${changedFields})`;
    }
  }

  // For creates, show what was created
  if (method === 'POST' && body) {
    const mainField = body.name || body.title || body.reference || body.email || 'new item';
    return `User ${userName} created ${resourceType?.toLowerCase() || 'resource'}: ${mainField}`;
  }

  // For deletes
  if (method === 'DELETE') {
    return `User ${userName} deleted ${resourceType?.toLowerCase() || 'resource'}`;
  }
  
  if (resourceType) {
    return `User ${userName} ${action}d ${resourceType.toLowerCase()}`;
  }
  
  const cleanPath = path.replace(/\/api\/v1\//, '').replace(/\/\d+/g, '');
  return `User ${userName} performed ${action.toUpperCase()} on ${cleanPath}`;
};

// Middleware to log activities
export const activityLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip logging for certain endpoints
  const skipPaths = [
    '/health',
    '/activity-logs',
    '/analytics',
    '/notifications',
  ];
  
  const shouldSkip = skipPaths.some(path => req.path.includes(path));
  if (shouldSkip) {
    return next();
  }

  // Skip VIEW_PROFILE actions and profile-related endpoints
  const action = generateActionName(req.method, req.path);
  if (action === 'VIEW_PROFILE' ||
      action.includes('VIEW_PROFILE') ||
      action.includes('PROFILE') ||
      req.path.includes('/profile')) {
    return next();
  }

  // Store original res.json to capture response
  const originalJson = res.json;
  let responseData: any;
  let statusCode: number;

  res.json = function(data: any) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson.call(this, data);
  };

  // Store original res.status to capture status code
  const originalStatus = res.status;
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Continue with the request
  next();

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const { method, path, body, params, ip, headers } = req;
      const user = req.user;
      
      // Extract resource information
      const { resourceType, resourceId } = extractResourceInfo(path, body, params);
      
      // Generate action details
      const actionType = getActionTypeFromEndpoint(method, path);
      const action = generateActionName(method, path);
      const description = generateDetailedDescription(method, path, user, resourceType, body, responseData);
      
      // Determine log level based on status code
      let logLevel: LogLevel = LogLevel.INFO;
      if (statusCode >= 400 && statusCode < 500) {
        logLevel = LogLevel.WARNING;
      } else if (statusCode >= 500) {
        logLevel = LogLevel.ERROR;
      }

      // Prepare detailed metadata with before/after values
      const metadata = {
        requestBody: method !== 'GET' ? body : undefined,
        responseStatus: statusCode,
        responseSuccess: responseData?.success,
        userAgent: headers['user-agent'],
        referer: headers.referer,
        requestParams: params,
        requestQuery: req.query,
      };

      // Extract old and new values for updates
      let oldValues: any = undefined;
      let newValues: any = undefined;

      if (method === 'PUT' || method === 'PATCH') {
        // For updates, capture the changes
        if (body) {
          newValues = body;
          
          // Try to extract old values from response or request
          if (responseData?.data?.oldValues) {
            oldValues = responseData.data.oldValues;
          } else if (responseData?.oldData) {
            oldValues = responseData.oldData;
          }
        }
      } else if (method === 'POST') {
        // For creates, capture the new values
        if (body) {
          newValues = body;
        }
      }

      // Log the activity
      if (user) {
        await logUserAction(
          user.id,
          user.name || user.email,
          user.role,
          action,
          actionType,
          description,
          {
            resourceType,
            resourceId,
            oldValues,
            newValues,
            metadata,
            logLevel,
            ipAddress: req.ip,
            userAgent: headers['user-agent'] as string,
            endpoint: req.path,
            httpMethod: method,
            statusCode,
          }
        );
      } else {
        // Log as system event for unauthenticated requests
        await logSystemEvent(
          action,
          description,
          {
            resourceType,
            resourceId,
            metadata: {
              ...metadata,
              ipAddress: ip,
              endpoint: path,
              httpMethod: method,
            },
            logLevel,
          }
        );
      }
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw error to prevent breaking the main request
    }
  });
};

// Middleware to log errors
export const errorLogger = (error: Error, req: AuthRequest, res: Response, next: NextFunction) => {
  // Log the error
  logError(error, {
    userId: req.user?.id,
    userName: req.user?.name || req.user?.email,
    action: generateActionName(req.method, req.path),
    endpoint: req.path,
    httpMethod: req.method,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
    metadata: {
      requestBody: req.body,
      requestParams: req.params,
      requestQuery: req.query,
    },
  }).catch(logError => {
    console.error('Error logging failed:', logError);
  });

  // Continue with error handling
  next(error);
};

// Helper function to manually log specific activities
export const logActivity = async (
  req: AuthRequest,
  action: string,
  actionType: ActionType,
  description: string,
  options: {
    resourceType?: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    logLevel?: LogLevel;
    metadata?: any;
  } = {}
) => {
  const user = req.user;
  
  if (user) {
    await logUserAction(
      user.id,
      user.name || user.email,
      user.role,
      action,
      actionType,
      description,
      {
        ...options,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
        endpoint: req.path,
        httpMethod: req.method,
      }
    );
  } else {
    await logSystemEvent(action, description, options);
  }
};