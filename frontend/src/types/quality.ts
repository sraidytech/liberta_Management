// Quality Review Stages
export type QualityReviewStage = 'INITIAL_REVIEW' | 'INSPECTION' | 'DECISION' | 'RESOLUTION';

// Quality Severity Levels
export type QualitySeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';

// Quality Decisions
export type QualityDecision = 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING';

// Ticket Status
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_RESPONSE' | 'RESOLVED' | 'CLOSED';

// Ticket Priority
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// User interface
export interface User {
  id: string;
  name: string;
  role: string;
  agentCode?: string;
}

// Customer interface
export interface Customer {
  fullName: string;
  telephone: string;
  wilaya?: string;
  commune?: string;
  address?: string;
}

// Order interface
export interface Order {
  reference: string;
  status: string;
  total?: number;
  customer: Customer;
  items?: OrderItem[];
}

// Order Item interface
export interface OrderItem {
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Ticket Message interface
export interface TicketMessage {
  id: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender: User;
}

// Quality Metrics interface
export interface QualityMetrics {
  reviewDuration?: number;
  issuesFound?: number;
  customerImpact?: string;
  costImpact?: number;
  [key: string]: any;
}

// Quality Ticket interface
export interface QualityTicket {
  id: string;
  orderId: string;
  reporterId: string;
  assigneeId?: string;
  title: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  
  // Quality-specific fields
  qualityReviewStage?: QualityReviewStage;
  qualitySeverity?: QualitySeverity;
  qualityDecision?: QualityDecision;
  qualityReviewerId?: string;
  qualityReviewedAt?: string;
  qualityMetrics?: QualityMetrics;
  qualityNotes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Relations
  order: Order;
  reporter: User;
  assignee?: User;
  qualityReviewer?: User;
  messages?: TicketMessage[];
  _count?: {
    messages: number;
  };
}

// Quality Statistics interface
export interface QualityStatistics {
  pendingReviews: number;
  completedToday: number;
  completedWeek: number;
  completedMonth: number;
  approvalRate: number;
  averageReviewTime: number;
  issuesBySeverity: Record<QualitySeverity, number>;
  decisionBreakdown: Record<QualityDecision, number>;
  totalReviewed: number;
}

// Quality Trend interface
export interface QualityTrend {
  date: string;
  total: number;
  approved: number;
  rejected: number;
  escalated: number;
  minor: number;
  moderate: number;
  major: number;
  critical: number;
}

// Agent Performance interface
export interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentCode?: string;
  pendingReviews: number;
  completedToday: number;
  completedWeek: number;
  completedMonth: number;
  approvalRate: number;
  averageReviewTime: number;
  issuesBySeverity: Record<string, number>;
  decisionBreakdown: Record<string, number>;
  totalReviewed: number;
}

// API Response interfaces
export interface QualityTicketsResponse {
  success: boolean;
  data: {
    tickets: QualityTicket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface QualityTicketResponse {
  success: boolean;
  data: {
    ticket: QualityTicket;
  };
}

export interface QualityStatisticsResponse {
  success: boolean;
  data: {
    statistics: QualityStatistics;
  };
}

export interface QualityTrendsResponse {
  success: boolean;
  data: {
    trends: QualityTrend[];
  };
}

export interface QualityPerformanceResponse {
  success: boolean;
  data: {
    performance: AgentPerformance[];
  };
}

// Filter interfaces
export interface QualityTicketFilters {
  status?: TicketStatus;
  stage?: QualityReviewStage;
  severity?: QualitySeverity;
  decision?: QualityDecision;
  page?: number;
  limit?: number;
}

// Form data interfaces
export interface InspectionNoteData {
  severity: QualitySeverity;
  notes: string;
  metrics?: QualityMetrics;
}

export interface ApprovalData {
  approvalNotes: string;
}

export interface RejectionData {
  rejectionReason: string;
}

export interface EscalationData {
  escalationReason: string;
}