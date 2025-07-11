import { PrismaClient } from '@prisma/client';

// Global Prisma client instance with optimized connection pooling
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create connection URL with proper parameters
function createDatabaseUrl(maxConnections: number = 10) {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Check if URL already has parameters
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}connection_limit=${maxConnections}&pool_timeout=20&connect_timeout=60`;
}

if (process.env.NODE_ENV === 'production') {
  // Production: Create a single instance with connection pooling for 30+ concurrent users
  // Each user might need 1-2 connections, so we set to 40 to handle peak loads
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: createDatabaseUrl(40)
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

// Graceful shutdown
process.on('beforeExit', async () => {
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