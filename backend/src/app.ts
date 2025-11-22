import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { config, validateConfig } from '@/config/app';
import { prisma } from '@/config/database';
import redis from '@/config/redis';
import { SyncService } from '@/services/sync.service';
import { AgentAssignmentService } from '@/services/agent-assignment.service';
import { SchedulerService } from '@/services/scheduler.service';

// Import routes
import authRoutes from '@/modules/auth/auth.routes';
import usersRoutes from '@/modules/users/users.routes';
import orderRoutes from '@/modules/orders/orders.routes';
import agentRoutes from '@/modules/agents/agents.routes';
import customerRoutes from '@/modules/customers/customers.routes';
import webhookRoutes from '@/modules/webhooks/webhooks.routes';
import notificationRoutes from '@/modules/notifications/notifications.routes';
import analyticsRoutes from '@/modules/analytics/analytics.routes';
import storesRoutes from '@/modules/stores/stores.routes';
import assignmentRoutes from '@/modules/assignments/assignment.routes';
import commissionRoutes from '@/modules/commissions/commission.routes';
import defaultCommissionSettingsRoutes from '@/modules/commissions/default-commission-settings.routes';
import activityLogsRoutes from '@/modules/activity-logs/activity-logs.routes';
import schedulerRoutes from '@/modules/scheduler/scheduler.routes';
import productAssignmentRoutes from '@/modules/product-assignments/product-assignments.routes';
import ticketRoutes from '@/modules/tickets/tickets.routes';
import noteTypesRoutes from '@/modules/note-types/note-types.routes';
import wilayaSettingsRoutes from '@/modules/wilaya-settings/wilaya-settings.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import satisfactionSurveysRoutes from '@/modules/satisfaction-surveys/satisfaction-surveys.routes';
import { createShippingRoutes } from '@/modules/shipping/shipping.routes';

// Import middleware
import { errorHandler } from '@/common/middleware/errorHandler';
import { notFound } from '@/common/middleware/notFound';
import { authMiddleware } from '@/common/middleware/auth';
import { activityLogger, errorLogger } from '@/common/middleware/activity-logger';
import { generalRateLimit, authRateLimit, userRateLimit } from '@/middleware/rate-limiter';

class App {
  public app: express.Application;
  public server: any;
  public io: Server;
  private syncService!: SyncService;
  private assignmentService!: AgentAssignmentService;
  private schedulerService!: SchedulerService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
    this.initializeSyncService();
    this.initializeAssignmentService();
    this.initializeSchedulerService();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
    }));

    // 🚀 ENTERPRISE-GRADE RATE LIMITING
    // Apply general rate limiting to all API routes
    this.app.use('/api/', generalRateLimit);
    
    // Apply strict rate limiting to auth routes
    this.app.use('/api/v1/auth/login', authRateLimit);
    this.app.use('/api/v1/auth/register', authRateLimit);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.isDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
      });
    });

    // Activity logging middleware (after auth routes but before other routes)
    this.app.use('/api/v1', activityLogger);
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/users', usersRoutes); // Users routes have their own auth middleware
    // 🚀 CRITICAL ROUTES WITH USER-BASED RATE LIMITING
    this.app.use('/api/v1/orders', authMiddleware, userRateLimit, orderRoutes);
    this.app.use('/api/v1/agents', authMiddleware, userRateLimit, agentRoutes);
    this.app.use('/api/v1/customers', authMiddleware, userRateLimit, customerRoutes);
    this.app.use('/api/v1/webhooks', webhookRoutes); // No auth for webhooks
    this.app.use('/api/v1/notifications', authMiddleware, userRateLimit, notificationRoutes);
    this.app.use('/api/v1/analytics', authMiddleware, userRateLimit, analyticsRoutes);
    this.app.use('/api/v1/stores', authMiddleware, userRateLimit, storesRoutes);
    this.app.use('/api/v1/assignments', authMiddleware, userRateLimit, assignmentRoutes);
    this.app.use('/api/v1/commissions', commissionRoutes); // Commission routes have their own auth middleware
    this.app.use('/api/v1/commissions/default-settings', defaultCommissionSettingsRoutes); // Default commission settings routes
    this.app.use('/api/v1/activity-logs', activityLogsRoutes); // Activity logs routes have their own auth middleware
    this.app.use('/api/v1/scheduler', schedulerRoutes); // Scheduler routes for background job management
    this.app.use('/api/v1/product-assignments', productAssignmentRoutes); // Product assignment routes have their own auth middleware
    this.app.use('/api/v1/tickets', authMiddleware, userRateLimit, ticketRoutes); // Ticket system routes with rate limiting
    this.app.use('/api/v1/note-types', authMiddleware, userRateLimit, noteTypesRoutes); // Note types management routes
    this.app.use('/api/v1/wilaya-settings', authMiddleware, userRateLimit, wilayaSettingsRoutes); // Wilaya delivery settings routes
    this.app.use('/api/v1/admin', adminRoutes); // Admin management routes (auth middleware included in routes)
    this.app.use('/api/v1/satisfaction-surveys', authMiddleware, userRateLimit, satisfactionSurveysRoutes); // Customer satisfaction surveys routes
    this.app.use('/api/v1/shipping', createShippingRoutes(redis)); // Shipping companies and accounts management routes

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Order Management System API',
        version: '1.0.0',
        documentation: '/api/docs',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorLogger);
    this.app.use(notFound);
    this.app.use(errorHandler);
  }

  private initializeSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Join user to their room for targeted notifications
      socket.on('join', (userId: string) => {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined their room`);
      });

      // Join agents to agent room with activity tracking
      socket.on('join_agents', async (data: { userId: string, role: string }) => {
        socket.join('agents');
        
        // Track agent activity if they're AGENT_SUIVI
        if (data.role === 'AGENT_SUIVI' && this.assignmentService) {
          await this.assignmentService.updateAgentActivity(data.userId, socket.id);
          console.log(`👥 AGENT_SUIVI ${data.userId} joined and marked as online`);
        } else {
          console.log(`👥 Agent ${data.userId} joined agents room`);
        }
      });

      // Join managers to manager room
      socket.on('join_managers', () => {
        socket.join('managers');
        console.log(`👔 Manager joined managers room`);
      });

      // Handle agent activity updates
      socket.on('agent_activity', async (userId: string) => {
        if (this.assignmentService) {
          await this.assignmentService.updateAgentActivity(userId);
        }
      });

      // Handle manual assignment requests
      socket.on('request_assignment', async (data: { managerId: string }) => {
        try {
          if (this.assignmentService) {
            const result = await this.assignmentService.autoAssignUnassignedOrders();
            
            // Notify managers about assignment results
            this.io.to('managers').emit('assignment_completed', {
              managerId: data.managerId,
              result: result
            });
            
            // Notify agents about new assignments
            this.io.to('agents').emit('new_assignments', {
              count: result.successfulAssignments
            });
          }
        } catch (error) {
          console.error('Manual assignment error:', error);
          this.io.to(`user_${data.managerId}`).emit('assignment_error', {
            message: 'Failed to assign orders'
          });
        }
      });

      socket.on('disconnect', async () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        
        // Find which agent disconnected and mark them offline
        if (this.assignmentService) {
          const agentKeys = await redis.keys('socket:agent:*');
          for (const key of agentKeys) {
            const storedSocketId = await redis.get(key);
            if (storedSocketId === socket.id) {
              const agentId = key.replace('socket:agent:', '');
              await this.assignmentService.setAgentOffline(agentId);
              console.log(`👥 AGENT_SUIVI ${agentId} marked as offline`);
              break;
            }
          }
        }
      });
    });

    // Make io available globally
    (global as any).io = this.io;
  }

  private initializeSyncService(): void {
    this.syncService = new SyncService(redis);
    
    // SyncService is only used for manual triggers and API calls
    // Automatic syncing is handled by SchedulerService
    console.log('🔄 Sync service initialized (manual triggers only - automatic syncing handled by SchedulerService)');

    // Make sync service available globally for manual triggers
    (global as any).syncService = this.syncService;
  }

  private initializeAssignmentService(): void {
    this.assignmentService = new AgentAssignmentService(redis);
    
    // Make assignment service available globally
    (global as any).assignmentService = this.assignmentService;
    
    // Start periodic assignment check with process locking (every 10 minutes)
    setInterval(async () => {
      const lockKey = 'assignment:periodic_lock';
      const lockValue = Date.now().toString();
      
      try {
        // Try to acquire lock with 15-minute expiration
        const lockAcquired = await redis.set(lockKey, lockValue, 'PX', 15 * 60 * 1000, 'NX');
        
        if (!lockAcquired) {
          console.log('⏳ Periodic assignment already running, skipping...');
          return;
        }
        
        console.log('🔒 Acquired periodic assignment lock');
        const result = await this.assignmentService.autoAssignUnassignedOrders();
        
        if (result.successfulAssignments > 0) {
          console.log(`🎯 Periodic assignment: ${result.successfulAssignments} orders assigned`);
          
          // Notify agents about new assignments
          this.io.to('agents').emit('new_assignments', {
            count: result.successfulAssignments,
            source: 'periodic'
          });
        }
        
        // Release lock
        await redis.del(lockKey);
        console.log('🔓 Released periodic assignment lock');
        
      } catch (error) {
        console.error('Periodic assignment error:', error);
        // Ensure lock is released on error
        try {
          const currentLock = await redis.get(lockKey);
          if (currentLock === lockValue) {
            await redis.del(lockKey);
            console.log('🔓 Released periodic assignment lock after error');
          }
        } catch (lockError) {
          console.error('Error releasing lock:', lockError);
        }
      }
    }, 10 * 60 * 1000); // Increased from 5 to 10 minutes
    
    // Start periodic cleanup of inactive users (every 5 minutes)
    setInterval(async () => {
      try {
        await this.cleanupInactiveUsers();
      } catch (error) {
        console.error('Periodic cleanup error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('🎯 Agent assignment service initialized');
  }

  private initializeSchedulerService(): void {
    this.schedulerService = new SchedulerService(redis);
    
    // 🚨 DEBUG: Log environment details
    console.log('🔍 [SCHEDULER DEBUG] Environment check:');
    console.log(`   - NODE_ENV: ${config.nodeEnv}`);
    console.log(`   - ENABLE_SCHEDULER: ${process.env.ENABLE_SCHEDULER}`);
    console.log(`   - Is Production: ${config.nodeEnv === 'production'}`);
    console.log(`   - Should Start: ${config.nodeEnv === 'production' || process.env.ENABLE_SCHEDULER === 'true'}`);
    
    // Start scheduler in production or when explicitly enabled
    if (config.nodeEnv === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
      // Start the production scheduler
      console.log('🚀 [SCHEDULER DEBUG] Starting scheduler...');
      this.schedulerService.startScheduler().then(() => {
        console.log('✅ [SCHEDULER DEBUG] Scheduler started successfully');
      }).catch(error => {
        console.error('❌ [SCHEDULER DEBUG] Failed to start scheduler:', error);
      });
      console.log('📅 Production scheduler initiated');
    } else {
      console.log('📅 Scheduler service initialized (manual mode)');
      console.log('💡 [SCHEDULER DEBUG] To enable automatic scheduling, set NODE_ENV=production or ENABLE_SCHEDULER=true');
    }

    // Make scheduler service available globally for manual triggers
    (global as any).schedulerService = this.schedulerService;
  }

  private async cleanupInactiveUsers(): Promise<void> {
    try {
      const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
      const now = new Date();

      // Get all users who are marked as ONLINE in the database
      const onlineUsers = await prisma.user.findMany({
        where: { availability: 'ONLINE' },
        select: { id: true, name: true, email: true, role: true }
      });

      for (const user of onlineUsers) {
        // Check if user has recent activity in Redis
        const activityKey = `activity:agent:${user.id}`;
        const lastActivity = await redis.get(activityKey);
        
        let shouldMarkOffline = false;
        
        if (!lastActivity) {
          shouldMarkOffline = true;
        } else {
          const lastActivityTime = new Date(lastActivity);
          const timeDiff = now.getTime() - lastActivityTime.getTime();
          
          if (timeDiff > ACTIVITY_TIMEOUT) {
            shouldMarkOffline = true;
          }
        }

        if (shouldMarkOffline) {
          // Mark user as offline in database
          await prisma.user.update({
            where: { id: user.id },
            data: { availability: 'OFFLINE' }
          });

          // Clean up Redis keys
          await redis.del(`socket:agent:${user.id}`);
          await redis.del(`activity:agent:${user.id}`);

          console.log(`🔄 Marked inactive user ${user.name || user.email} as offline`);
        }
      }
    } catch (error) {
      console.error('Error in cleanup inactive users:', error);
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();

      // Connect to database
      await prisma.$connect();

      // Test Redis connection
      await redis.ping();
      console.log('✅ Redis connected');

      // Start server
      this.server.listen(config.port, () => {
        console.log(`🚀 Server running on port ${config.port}`);
        console.log(`🌍 Environment: ${config.nodeEnv}`);
        console.log(`📡 CORS enabled for: ${config.corsOrigin}`);
        console.log(`🔄 Sync service ready`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

export default App;
