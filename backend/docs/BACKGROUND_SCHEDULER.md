# Background Job Scheduler Documentation

## Overview

The LibertaPhonix Order Management System now includes a comprehensive background job scheduler that automatically handles:

1. **EcoManager Order Sync**: Fetches new orders from EcoManager stores
2. **Shipping Status Sync**: Updates order shipping status from Maystro delivery service
3. **Daily Cleanup**: Maintains system performance by cleaning old data

## Production Schedule

### EcoManager Order Sync
- **Frequency**: Every hour from 8:00 AM to 8:00 PM (12 times per day)
- **Purpose**: Fetch new orders from all active EcoManager stores
- **Features**:
  - Automatic order assignment to available agents
  - Intelligent sync with binary search optimization
  - Redis caching for performance
  - Error handling and retry logic

### Shipping Status Sync
- **Frequency**: Every 6 hours at 00:00, 06:00, 12:00, 18:00 (4 times per day)
- **Purpose**: Update order shipping status from Maystro API
- **Features**:
  - Batch processing for optimal performance
  - Automatic order status updates (LIVRÉ → DELIVERED)
  - Comprehensive tracking information sync
  - Status mapping and error handling

### Daily Cleanup
- **Frequency**: Every day at 2:00 AM
- **Purpose**: Maintain system performance and storage
- **Tasks**:
  - Remove activity logs older than 30 days
  - Clean up expired Redis keys
  - Database maintenance tasks

## Architecture

### Core Components

1. **SchedulerService** (`/src/services/scheduler.service.ts`)
   - Main scheduler orchestrator
   - Handles job timing and execution
   - Provides status monitoring and manual triggers

2. **SchedulerController** (`/src/modules/scheduler/scheduler.controller.ts`)
   - REST API endpoints for scheduler management
   - Admin interface for monitoring and control

3. **SchedulerRoutes** (`/src/modules/scheduler/scheduler.routes.ts`)
   - API routes for scheduler operations
   - Admin-only access with authentication

### Integration Points

- **SyncService**: Handles EcoManager order synchronization
- **MaystroService**: Manages shipping status updates
- **Redis**: Stores scheduler state and job metadata
- **Socket.IO**: Real-time notifications for sync events

## API Endpoints

### GET /api/v1/scheduler/status
Get current scheduler status and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "isRunning": true,
    "startedAt": "2025-06-27T18:00:00.000Z",
    "activeJobs": ["ecomanager_sync", "shipping_status_sync", "daily_cleanup"],
    "lastSyncs": {
      "ecomanager": {
        "lastStart": "2025-06-27T19:00:00.000Z",
        "lastEnd": "2025-06-27T19:02:30.000Z",
        "lastResults": { ... }
      },
      "shippingStatus": { ... }
    }
  }
}
```

### POST /api/v1/scheduler/start
Start the background job scheduler.

### POST /api/v1/scheduler/stop
Stop the background job scheduler.

### POST /api/v1/scheduler/trigger/ecomanager
Manually trigger EcoManager sync.

### POST /api/v1/scheduler/trigger/shipping
Manually trigger shipping status sync.

### GET /api/v1/scheduler/next-sync-times
Get next scheduled sync times.

### GET /api/v1/scheduler/history
Get sync history and logs.

## Environment Configuration

### Production Mode
The scheduler automatically starts in production mode when:
- `NODE_ENV=production`
- OR `ENABLE_SCHEDULER=true`

### Required Environment Variables
```bash
# Maystro API Configuration
MAYSTRO_API_KEY=your_maystro_api_key
MAYSTRO_BASE_URL=https://api.maystro.com

# Database and Redis (already configured)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## Monitoring and Logging

### Real-time Monitoring
- Scheduler status via admin dashboard
- Real-time sync notifications via Socket.IO
- Next sync time calculations

### Logging Features
- Comprehensive sync logging with timestamps
- Error tracking and reporting
- Performance metrics (duration, counts)
- Redis-based status persistence

### Admin Dashboard
Access the scheduler management interface at:
`/admin/scheduler`

Features:
- Start/stop scheduler controls
- Manual sync triggers
- Real-time status monitoring
- Sync history and error logs
- Next sync time display

## Error Handling

### Automatic Recovery
- Failed syncs are logged but don't stop the scheduler
- Individual store sync failures don't affect other stores
- Automatic retry logic for transient errors

### Error Notifications
- Real-time error notifications via Socket.IO
- Detailed error logging in Redis
- Admin dashboard error display

## Performance Optimization

### EcoManager Sync
- Binary search for efficient order fetching
- Redis caching for API responses
- Batch processing (25 orders per batch)
- Rate limiting and delay management

### Shipping Status Sync
- Concurrent API requests (10 pages simultaneously)
- Map-based lookup for O(1) order matching
- Batch database updates (100 orders per batch)
- Intelligent status change detection

### Resource Management
- Memory-efficient processing
- Connection pooling for database operations
- Redis key expiration for cleanup
- Graceful error handling

## Deployment Considerations

### Production Deployment
1. Set `NODE_ENV=production` in environment
2. Configure Maystro API credentials
3. Ensure Redis is available and configured
4. Verify database connectivity
5. Monitor initial scheduler startup

### Scaling Considerations
- Single scheduler instance per application
- Redis-based coordination for multi-instance deployments
- Database connection pooling for concurrent operations
- Rate limiting for external API calls

### Monitoring in Production
- Check scheduler status regularly via API
- Monitor sync success rates and timing
- Watch for error patterns in logs
- Verify order processing pipeline

## Troubleshooting

### Common Issues

1. **Scheduler Not Starting**
   - Check environment variables
   - Verify Redis connectivity
   - Review application logs

2. **Sync Failures**
   - Verify API credentials
   - Check network connectivity
   - Review rate limiting settings

3. **Performance Issues**
   - Monitor Redis memory usage
   - Check database connection pool
   - Review batch sizes and timing

### Debug Commands
```bash
# Check scheduler status
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/scheduler/status

# Manual sync trigger
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/scheduler/trigger/ecomanager

# View next sync times
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/scheduler/next-sync-times
```

## Future Enhancements

### Planned Features
- Configurable sync schedules via admin interface
- Advanced retry policies with exponential backoff
- Sync performance analytics and reporting
- Multi-region deployment support
- Webhook notifications for sync events

### Extensibility
The scheduler architecture supports easy addition of new background jobs:
1. Add job logic to SchedulerService
2. Create scheduling method
3. Add API endpoints for control
4. Update admin interface

## Security

### Access Control
- All scheduler endpoints require admin authentication
- JWT token validation for API access
- Role-based access control (RBAC)

### Data Protection
- Secure API key storage in environment variables
- Encrypted Redis connections in production
- Audit logging for all scheduler operations

## Conclusion

The background job scheduler provides a robust, production-ready solution for automated order synchronization and system maintenance. It ensures continuous operation with comprehensive monitoring, error handling, and performance optimization.

For support or questions, refer to the main project documentation or contact the development team.