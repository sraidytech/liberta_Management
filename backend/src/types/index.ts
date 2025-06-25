import { User, Order, Customer, OrderItem, AgentActivity, Notification, ApiConfiguration, WebhookEvent } from '@prisma/client';

// Extended types with relations
export interface UserWithRelations extends User {
  assignedOrders?: Order[];
  agentActivities?: AgentActivity[];
  notifications?: Notification[];
  createdApiConfigs?: ApiConfiguration[];
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
  role?: 'ADMIN' | 'TEAM_MANAGER' | 'AGENT_SUIVI' | 'AGENT_CALL_CENTER';
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