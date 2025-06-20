import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { config, validateConfig } from '@/config/app';
import { connectDatabase } from '@/config/database';
import redis from '@/config/redis';
import { SyncService } from '@/services/sync.service';
import { AgentAssignmentService } from '@/services/agent-assignment.service';

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

// Import middleware
import { errorHandler } from '@/common/middleware/errorHandler';
import { notFound } from '@/common/middleware/notFound';
import { authMiddleware } from '@/common/middleware/auth';

class App {
  public app: express.Application;
  public server: any;
  public io: Server;
  private syncService!: SyncService;
  private assignmentService!: AgentAssignmentService;

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
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

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
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/users', usersRoutes); // Users routes have their own auth middleware
    this.app.use('/api/v1/orders', authMiddleware, orderRoutes);
    this.app.use('/api/v1/agents', authMiddleware, agentRoutes);
    this.app.use('/api/v1/customers', authMiddleware, customerRoutes);
    this.app.use('/api/v1/webhooks', webhookRoutes); // No auth for webhooks
    this.app.use('/api/v1/notifications', authMiddleware, notificationRoutes);
    this.app.use('/api/v1/analytics', authMiddleware, analyticsRoutes);
    this.app.use('/api/v1/stores', authMiddleware, storesRoutes);
    this.app.use('/api/v1/assignments', authMiddleware, assignmentRoutes);

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
    
    // Start auto sync in production or when explicitly enabled
    if (config.nodeEnv === 'production' || process.env.ENABLE_AUTO_SYNC === 'true') {
      // Start auto sync with 15-minute intervals
      this.syncService.startAutoSync(15).catch(error => {
        console.error('❌ Failed to start auto sync:', error);
      });
      console.log('🔄 Auto sync service started');
    } else {
      console.log('🔄 Auto sync service initialized (manual mode)');
    }

    // Make sync service available globally for manual triggers
    (global as any).syncService = this.syncService;
  }

  private initializeAssignmentService(): void {
    this.assignmentService = new AgentAssignmentService(redis);
    
    // Make assignment service available globally
    (global as any).assignmentService = this.assignmentService;
    
    // Start periodic assignment check (every 5 minutes)
    setInterval(async () => {
      try {
        const result = await this.assignmentService.autoAssignUnassignedOrders();
        if (result.successfulAssignments > 0) {
          console.log(`🎯 Periodic assignment: ${result.successfulAssignments} orders assigned`);
          
          // Notify agents about new assignments
          this.io.to('agents').emit('new_assignments', {
            count: result.successfulAssignments,
            source: 'periodic'
          });
        }
      } catch (error) {
        console.error('Periodic assignment error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('🎯 Agent assignment service initialized');
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();

      // Connect to database
      await connectDatabase();

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