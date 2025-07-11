# LibertaPhonix Automatic Processes Documentation

## Overview
The LibertaPhonix Order Management System includes several automated background processes that handle order synchronization, shipping status updates, and system maintenance. This document provides a detailed explanation of how these processes work.

## 🚀 System Architecture

### 1. Scheduler Service (`backend/src/services/scheduler.service.ts`)
The main orchestrator for all automated processes. It manages:
- **EcoManager Order Sync**: Fetches new orders from EcoManager
- **Maystro Shipping Status Sync**: Updates order shipping statuses
- **Daily Cleanup**: Maintains system performance

### 2. Database Connection Management (`backend/src/config/database.ts`)
- **Production**: 40 concurrent connections (supports 30+ users)
- **Development**: 20 concurrent connections
- **Connection pooling**: Optimized for high-traffic scenarios
- **Graceful shutdown**: Proper cleanup on system restart

## 📅 Automated Schedule

### EcoManager Order Synchronization
- **Frequency**: Every hour from 8 AM to 8 PM (12 times per day)
- **Purpose**: Fetch new orders from EcoManager system
- **Process**:
  1. Connects to each configured store's EcoManager API
  2. Fetches new orders since last sync
  3. Processes orders in batches of 25
  4. Creates new order records in LibertaPhonix database
  5. Links orders to appropriate stores
  6. Triggers automatic agent assignment for new orders

### Maystro Shipping Status Sync
- **Frequency**: Every 6 hours at 00:00, 06:00, 12:00, 18:00
- **Purpose**: Update shipping statuses from Maystro delivery service
- **Process**:
  1. Fetches orders with tracking numbers
  2. Queries Maystro API for shipping status updates
  3. Updates order shipping status in database
  4. **Auto-completion**: Orders with "LIVRÉ" status automatically marked as "DELIVERED"
  5. Processes updates in batches of 50 for optimal performance

### Daily Cleanup
- **Frequency**: Every day at 2:00 AM
- **Purpose**: System maintenance and optimization
- **Process**:
  1. Cleans up old activity logs
  2. Removes expired session data
  3. Optimizes database performance
  4. Clears temporary files

## 🔄 Order Processing Flow

### 1. New Order Detection
```
EcoManager API → Scheduler Service → Sync Service → Database
```

### 2. Order Assignment Process
```
New Order → Agent Assignment Service → Round-Robin Algorithm → Agent Notification
```
- **Batch Processing**: Last 10,000 orders processed for efficiency
- **Connection Management**: 50-order batches with 2-second delays
- **Agent Selection**: Round-robin with workload balancing

### 3. Shipping Status Updates
```
Maystro API → Scheduler Service → Maystro Service → Database → Auto-completion
```

## 🛠️ Configuration & Startup

### Automatic Startup (Production)
```typescript
// In app.ts
if (config.nodeEnv === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
  this.schedulerService.startScheduler();
}
```

### Manual Control (Development)
- Scheduler available via admin dashboard
- Manual triggers for testing
- Individual sync operations can be triggered

## 📊 Monitoring & Logging

### Redis Storage
All sync activities are logged in Redis with keys:
- `scheduler:status` - Current scheduler state
- `scheduler:last_ecomanager_sync_*` - EcoManager sync results
- `scheduler:last_shipping_sync_*` - Shipping sync results
- `scheduler:last_cleanup` - Cleanup operation logs

### Real-time Updates
- WebSocket notifications for sync completion
- Admin dashboard shows live status
- Error notifications for failed operations

## 🔧 API Endpoints

### Scheduler Control
- `GET /api/v1/scheduler/status` - Get current status
- `POST /api/v1/scheduler/start` - Start scheduler
- `POST /api/v1/scheduler/stop` - Stop scheduler
- `POST /api/v1/scheduler/trigger/ecomanager` - Manual EcoManager sync
- `POST /api/v1/scheduler/trigger/shipping` - Manual shipping sync

### Admin Management (New)
- `DELETE /api/admin/delete-orders` - Delete all orders
- `POST /api/admin/sync-stores` - Sync stores from EcoManager
- `DELETE /api/admin/cleanup-assignments` - Clean order assignments

## 🚨 Error Handling & Recovery

### Connection Pool Management
- **Issue**: Database connection exhaustion
- **Solution**: Centralized Prisma client with connection limits
- **Monitoring**: Connection usage tracked in real-time

### Batch Processing Limits
- **EcoManager Sync**: 25 orders per batch
- **Shipping Updates**: 50 orders per batch
- **Agent Assignment**: 50 orders per batch with delays

### Automatic Recovery
- Failed syncs are logged and retried on next schedule
- Connection errors trigger automatic reconnection
- System continues operation even if one service fails

## 📈 Performance Optimizations

### Database Queries
- **Order Assignment**: Limited to last 10,000 orders (not all orders)
- **Batch Processing**: Prevents memory overflow
- **Connection Pooling**: Supports 30+ concurrent users

### API Rate Limiting
- Delays between API calls to respect external service limits
- Concurrent request batching for Maystro API
- Error handling for API timeouts

## 🔐 Security & Authentication

### API Access
- All scheduler endpoints require admin authentication
- JWT token validation for all operations
- Role-based access control (ADMIN, MANAGER, AGENT_SUIVI)

### Data Protection
- Secure API key storage in Redis
- Environment variable configuration
- Encrypted database connections

## 🎯 Key Benefits

1. **Automatic Order Import**: No manual intervention needed for new orders
2. **Real-time Status Updates**: Shipping statuses updated automatically
3. **Scalable Architecture**: Handles high order volumes efficiently
4. **Fault Tolerance**: System continues operation during partial failures
5. **Performance Monitoring**: Real-time insights into system health
6. **Easy Management**: Admin dashboard for complete control

## 📝 Configuration Requirements

### Environment Variables
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MAYSTRO_API_KEY=your_api_key
MAYSTRO_BASE_URL=https://api.maystro.com
ENABLE_SCHEDULER=true  # For development testing
```

### Store Configuration
- Each store must have EcoManager API credentials
- Maystro API keys configured for shipping tracking
- Store linking properly configured in database

## 🚀 Deployment Notes

1. **Production**: Scheduler starts automatically
2. **Development**: Use `ENABLE_SCHEDULER=true` to test
3. **Monitoring**: Check admin dashboard for sync status
4. **Scaling**: Connection pool automatically adjusts for load

This automated system ensures that LibertaPhonix operates efficiently with minimal manual intervention while maintaining high performance and reliability.