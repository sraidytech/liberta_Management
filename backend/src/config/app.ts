import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT & Auth
  jwtSecret: process.env.JWT_SECRET!,
  nextAuthSecret: process.env.NEXTAUTH_SECRET!,
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Webhooks
  ecoManagerWebhookSecret: process.env.ECOMANAGER_WEBHOOK_SECRET!,
  maystroWebhookSecret: process.env.MAYSTRO_WEBHOOK_SECRET!,
  
  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'ECOMANAGER_WEBHOOK_SECRET',
  'MAYSTRO_WEBHOOK_SECRET'
];

export const validateConfig = () => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  const warnings: string[] = [];
  
  // Check for missing required variables
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  // Check for optional but recommended variables
  if (!process.env.REDIS_URL) {
    warnings.push('REDIS_URL not set, using default: redis://localhost:6379');
  }
  
  if (!process.env.CORS_ORIGIN) {
    warnings.push('CORS_ORIGIN not set, using default: http://localhost:3000');
  }
  
  if (!process.env.RATE_LIMIT_WINDOW_MS) {
    warnings.push('RATE_LIMIT_WINDOW_MS not set, using default: 900000ms (15 minutes)');
  }
  
  if (!process.env.RATE_LIMIT_MAX_REQUESTS) {
    warnings.push('RATE_LIMIT_MAX_REQUESTS not set, using default: 100 requests');
  }
  
  // Validate JWT secret strength in production
  if (config.isProduction && config.jwtSecret.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
  
  // Validate database URL format
  if (!config.databaseUrl.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL must be a valid PostgreSQL connection string');
    process.exit(1);
  }
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }
  
  console.log('✅ Configuration validated successfully');
};
