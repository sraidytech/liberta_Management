import { User, Order, Customer, OrderItem, AgentActivity, Notification, ApiConfiguration, WebhookEvent, ActivityLog, ActionType, LogLevel, UserRole } from '@prisma/client';
import { Request } from 'express';

// Define a flexible user type for requests
export interface RequestUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  agentCode?: string | null;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

// Extended types with relations
export interface UserWithRelations extends User {
  assignedOrders?: Order[];
  agentActivities?: AgentActivity[];
  notifications?: Notification[];
  createdApiConfigs?: ApiConfiguration[];
  productAssignments?: UserProductAssignment[];
}

export interface UserProductAssignment {
  id: string;
  userId: string;
  productName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface OrderWithRelations extends Order {
  customer: Customer;
  assignedAgent?: User;
  items: OrderItem[];
  activities?: AgentActivity[];
  notifications?: Notification[];
  webhookEvents?: WebhookEvent[];
}

export interface CustomerWithOrders extends Customer {
  orders: Order[];
}

// API Request/Response types
export interface CreateOrderRequest {
  reference: string;
  customerId: string;
  total: number;
  shippingCost?: number;
  notes?: string;
  items: {
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface UpdateOrderRequest {
  status?: string;
  assignedAgentId?: string;
  notes?: string;
  internalNotes?: string;
  trackingNumber?: string;
  shippingStatus?: string;
}

export interface AssignOrderRequest {
  orderId: string;
  agentId: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  telephone: string;
  email?: string;
  wilaya: string;
  commune: string;
  address?: string;
}

export interface UpdateAgentAvailabilityRequest {
  availability: 'ONLINE' | 'BUSY' | 'BREAK' | 'OFFLINE';
}

// Webhook payload types
export interface EcoManagerWebhookPayload {
  hook_trigger: {
    name: string;
    description: string;
  };
  event: 'orderCreated' | 'orderUpdated' | 'orderStatusChanged';
  instance_uuid: string;
  payload: {
    id: number;
    reference: string;
    order_state_name: string;
    full_name: string;
    telephone: string;
    wilaya: string;
    commune: string;
    total: number;
    items: Array<{
      product_id: string;
      title: string;
      quantity: number;
      unit_price?: number;
    }>;
  };
}

export interface MaystroWebhookPayload {
  order_id: string;
  tracking_number: string;
  status_code: number;
  status_name: string;
  updated_at: string;
}

// Real-time event types
export enum RealTimeEvents {
  NEW_ORDER_ASSIGNMENT = 'new_order_assignment',
  ORDER_STATUS_UPDATE = 'order_status_update',
  AGENT_STATUS_CHANGE = 'agent_status_change',
  SHIPPING_UPDATE = 'shipping_update',
  SYSTEM_NOTIFICATION = 'system_notification'
}

export interface RealTimeEventPayload {
  event: RealTimeEvents;
  data: any;
  userId?: string;
  timestamp: Date;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'TEAM_MANAGER' | 'COORDINATEUR' | 'AGENT_SUIVI' | 'AGENT_CALL_CENTER';
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken?: string;
}

export interface ChangeUserPasswordRequest {
  userId: string;
  newPassword: string;
}

export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Product Assignment types
export interface CreateProductAssignmentRequest {
  userId: string;
  productNames: string[];
}

export interface UpdateProductAssignmentRequest {
  userId: string;
  productNames: string[];
}

export interface ProductAssignmentFilters {
  userId?: string;
  productName?: string;
  isActive?: boolean;
}

// Analytics types
export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  totalOrders: number;
  completedOrders: number;
  averageHandlingTime: number;
  successRate: number;
  currentWorkload: number;
}

export interface SystemMetrics {
  totalOrders: number;
  pendingOrders: number;
  assignedOrders: number;
  completedOrders: number;
  activeAgents: number;
  averageResponseTime: number;
}

// Error types
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface OrderFilters {
  status?: string;
  assignedAgentId?: string;
  customerId?: string;
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AgentFilters {
  role?: string;
  availability?: string;
  isActive?: boolean;
}

// Activity Log types
export interface ActivityLogWithUser extends ActivityLog {
  user?: User;
}

export interface CreateActivityLogRequest {
  userId?: string;
  userName?: string;
  userRole?: string;
  sessionId?: string;
  action: string;
  actionType: ActionType;
  description: string;
  logLevel?: LogLevel;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  metadata?: any;
}

export interface ActivityLogFilters {
  userId?: string;
  actionType?: ActionType;
  logLevel?: LogLevel;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ActivityLogQuery extends PaginationQuery {
  filters?: ActivityLogFilters;
}

// Activity Log Actions - Predefined action constants
export const ACTIVITY_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ACCOUNT_ACTIVATION: 'ACCOUNT_ACTIVATION',
  
  // User Management
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  
  // Order Management
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_UPDATE: 'ORDER_UPDATE',
  ORDER_DELETE: 'ORDER_DELETE',
  ORDER_ASSIGN: 'ORDER_ASSIGN',
  ORDER_UNASSIGN: 'ORDER_UNASSIGN',
  ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
  
  // Store Management
  STORE_CREATE: 'STORE_CREATE',
  STORE_UPDATE: 'STORE_UPDATE',
  STORE_DELETE: 'STORE_DELETE',
  STORE_ACTIVATE: 'STORE_ACTIVATE',
  STORE_DEACTIVATE: 'STORE_DEACTIVATE',
  
  // Assignment Operations
  BULK_ASSIGNMENT: 'BULK_ASSIGNMENT',
  MANUAL_ASSIGNMENT: 'MANUAL_ASSIGNMENT',
  AUTO_ASSIGNMENT: 'AUTO_ASSIGNMENT',
  ASSIGNMENT_OVERRIDE: 'ASSIGNMENT_OVERRIDE',
  
  // Commission Management
  COMMISSION_RATE_CREATE: 'COMMISSION_RATE_CREATE',
  COMMISSION_RATE_UPDATE: 'COMMISSION_RATE_UPDATE',
  COMMISSION_RATE_DELETE: 'COMMISSION_RATE_DELETE',
  COMMISSION_SETTINGS_UPDATE: 'COMMISSION_SETTINGS_UPDATE',
  
  // System Events
  SYNC_START: 'SYNC_START',
  SYNC_COMPLETE: 'SYNC_COMPLETE',
  SYNC_ERROR: 'SYNC_ERROR',
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED: 'WEBHOOK_PROCESSED',
  
  // API Events
  API_CALL_SUCCESS: 'API_CALL_SUCCESS',
  API_CALL_ERROR: 'API_CALL_ERROR',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  
  // Error Events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR'
} as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[keyof typeof ACTIVITY_ACTIONS];