import { PrismaClient } from '@prisma/client';

// Global Prisma client instance with optimized connection pooling for 200K+ orders
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create optimized connection URL for high-volume operations
function createOptimizedDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Optimized parameters for 200,000+ orders system
  const separator = baseUrl.includes('?') ? '&' : '?';
  
  if (process.env.NODE_ENV === 'production') {
    // Production: Optimized for high-volume operations
    return `${baseUrl}${separator}connection_limit=25&pool_timeout=20&connect_timeout=60&socket_timeout=60&statement_timeout=30000&idle_in_transaction_session_timeout=30000&pgbouncer=true`;
  } else {
    // Development: Higher limits for testing
    return `${baseUrl}${separator}connection_limit=30&pool_timeout=25&connect_timeout=45&socket_timeout=45&statement_timeout=60000`;
  }
}

if (process.env.NODE_ENV === 'production') {
  // Production: Single instance with optimized settings
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: createOptimizedDatabaseUrl()
      }
    },
    log: ['error', 'warn'],
    errorFormat: 'minimal'
  });
  
} else {
  // Development: Use global variable to prevent multiple instances during hot reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: {
        db: {
          url: createOptimizedDatabaseUrl()
        }
      },
      log: ['query', 'error', 'warn'],
      errorFormat: 'pretty'
    });
  }
  prisma = global.__prisma;
}

// Enhanced connection health monitoring
let connectionHealthy = true;
let lastHealthCheck = Date.now();

const checkConnectionHealth = async () => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const duration = Date.now() - start;
    
    if (duration > 5000) {
      console.warn(`⚠️ Database connection slow: ${duration}ms`);
    }
    
    if (!connectionHealthy) {
      console.log('✅ Database connection restored');
      connectionHealthy = true;
    }
    
    lastHealthCheck = Date.now();
    
    // Log connection pool status in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔗 Database connection healthy (${duration}ms)`);
    }
    
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    connectionHealthy = false;
  }
};

// Connection monitoring with adaptive intervals
const startConnectionMonitoring = () => {
  // Initial health check
  checkConnectionHealth();
  
  // Adaptive monitoring: more frequent checks if unhealthy
  const monitoringInterval = setInterval(async () => {
    const timeSinceLastCheck = Date.now() - lastHealthCheck;
    
    // Check more frequently if connection was recently unhealthy
    const checkInterval = connectionHealthy ? 60000 : 15000; // 1 min vs 15 sec
    
    if (timeSinceLastCheck >= checkInterval) {
      await checkConnectionHealth();
    }
  }, 10000); // Check every 10 seconds
  
  return monitoringInterval;
};

// Start monitoring
const monitoringInterval = startConnectionMonitoring();

// Enhanced graceful shutdown with connection cleanup
const gracefulShutdown = async (signal: string) => {
  console.log(`🔌 Received ${signal}, shutting down gracefully...`);
  
  // Clear monitoring interval
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  try {
    // Wait for ongoing queries to complete (max 10 seconds)
    const shutdownTimeout = setTimeout(() => {
      console.warn('⚠️ Force closing database connections due to timeout');
      process.exit(1);
    }, 10000);
    
    await prisma.$disconnect();
    clearTimeout(shutdownTimeout);
    
    console.log('✅ Database connections closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
    process.exit(1);
  }
};

// Enhanced signal handling
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('beforeExit', async () => {
  console.log('🔌 Process exiting, disconnecting from database...');
  await prisma.$disconnect();
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  await prisma.$disconnect();
  process.exit(1);
});

// Export enhanced prisma client with health status
export { prisma };
export const getDatabaseHealth = () => ({
  healthy: connectionHealthy,
  lastCheck: lastHealthCheck,
  uptime: Date.now() - lastHealthCheck
});

// Performance monitoring utilities
export const queryPerformanceMonitor = {
  // Track slow queries
  logSlowQuery: (query: string, duration: number, threshold = 2000) => {
    if (duration > threshold) {
      console.warn(`🐌 Slow query (${duration}ms): ${query.substring(0, 200)}...`);
    }
  },
  
  // Measure query execution time
  measureQuery: async <T>(queryName: string, queryFn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      const result = await queryFn();
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        console.log(`⚡ ${queryName}: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ ${queryName} failed after ${duration}ms:`, error);
      throw error;
    }
  }
};

export default prisma;
