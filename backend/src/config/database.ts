import { PrismaClient } from '@prisma/client';

// Global Prisma client instance with optimized connection pooling
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create connection URL with optimized parameters for high-volume operations
function createDatabaseUrl(maxConnections: number = 10) {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Check if URL already has parameters
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}connection_limit=${maxConnections}&pool_timeout=10&connect_timeout=30&socket_timeout=30&pgbouncer=true`;
}

if (process.env.NODE_ENV === 'production') {
  // Production: Optimized connection pooling for high-volume operations
  // Reduced from 40 to 15 to prevent connection exhaustion
  // PostgreSQL max_connections is now 200, so we use 15 per service instance
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: createDatabaseUrl(15)
      }
    },
    log: ['error', 'warn'],
    errorFormat: 'minimal'
  });
} else {
  // Development: Use global variable to prevent multiple instances during hot reloads
  // Set higher connection limit for development testing
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: {
        db: {
          url: createDatabaseUrl(20)
        }
      },
      log: ['query', 'error', 'warn'],
      errorFormat: 'pretty'
    });
  }
  prisma = global.__prisma;
}

// Add connection monitoring
setInterval(async () => {
  try {
    // Simple query to check connection health
    await prisma.$queryRaw`SELECT 1`;
    
    // Log connection pool status in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Database connection healthy');
    }
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
  }
}, 60000); // Check every minute

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting from database...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
export default prisma;