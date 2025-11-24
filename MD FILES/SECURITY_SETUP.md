# 🔐 LibertaPhonix Security Setup Guide

## Overview

This guide outlines the security implementation for the LibertaPhonix Order Management System, focusing on secure environment variable management and production deployment best practices.

## 🚨 Security Issues Resolved

### Before (Security Vulnerabilities)
- ❌ Hardcoded sensitive data in `docker-compose.yml`
- ❌ Database passwords exposed in version control
- ❌ JWT secrets visible in Docker configuration
- ❌ API keys stored in plain text in compose files
- ❌ No separation between development and production secrets

### After (Secure Implementation)
- ✅ All sensitive data moved to `.env` files
- ✅ Docker Compose uses environment variable substitution
- ✅ Multiple Maystro API key support with load balancing
- ✅ Secure secret management with example templates
- ✅ Production-ready configuration separation

## 📁 File Structure

```
libertaphonix-management-app/
├── .env                          # Main environment file (Docker Compose)
├── .env.example                  # Development template
├── .env.production.example       # Production template
├── backend/
│   └── .env                      # Backend-specific variables
├── frontend/
│   └── .env.local               # Frontend-specific variables
├── docker-compose.yml           # Secure Docker configuration
└── SECURITY_SETUP.md           # This documentation
```

## 🔧 Environment Files

### 1. Root `.env` File
- Used by Docker Compose for container environment variables
- Contains shared configuration for all services
- Includes database credentials, API keys, and service URLs

### 2. Backend `.env` File
- Backend-specific configuration
- Includes multiple Maystro API keys for load balancing
- Database and Redis connection strings

### 3. Frontend `.env.local` File
- Frontend-specific configuration
- Public API URLs and NextAuth configuration
- Client-side environment variables

## 🔑 Maystro API Key Management

### Multiple API Key Support
The system supports up to 5 Maystro API keys for:
- Load balancing across multiple keys
- Client-specific API key isolation
- Failover and redundancy
- Environment separation (dev/staging/prod)

### Environment Variables
```bash
# Primary API key (backward compatibility)
MAYSTRO_API_KEY=your_primary_api_key

# Multiple API keys
MAYSTRO_API_KEY_1=client_a_api_key
MAYSTRO_API_KEY_2=client_b_api_key
MAYSTRO_API_KEY_3=development_api_key
MAYSTRO_API_KEY_4=staging_api_key
MAYSTRO_API_KEY_5=backup_api_key

# Optional: Custom names for admin dashboard
MAYSTRO_API_KEY_1_NAME=Client A - Production
MAYSTRO_API_KEY_2_NAME=Client B - Production
```

### Load Balancing Features
- Round-robin distribution based on request count
- Automatic failover to healthy keys
- Real-time statistics tracking
- Connection testing and health monitoring

## 🚀 Deployment Instructions

### Development Setup

1. **Copy environment templates:**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env  # if needed
   cp frontend/.env.local.example frontend/.env.local  # if needed
   ```

2. **Fill in your development values:**
   - Update database credentials
   - Add your Maystro API keys
   - Configure webhook secrets

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

### Production Setup

1. **Copy production template:**
   ```bash
   cp .env.production.example .env
   ```

2. **Generate secure secrets:**
   ```bash
   # Generate JWT secret (64+ characters)
   openssl rand -hex 64

   # Generate NextAuth secret (32+ characters)
   openssl rand -hex 32
   ```

3. **Configure production values:**
   - Use strong, unique passwords
   - Update domain names and URLs
   - Add production API keys
   - Configure production database and Redis hosts

4. **Deploy with production configuration:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## 🛡️ Security Best Practices

### Environment Variable Security
- ✅ Never commit `.env` files to version control
- ✅ Use different secrets for each environment
- ✅ Rotate secrets regularly
- ✅ Use strong, randomly generated passwords
- ✅ Limit access to environment files

### Docker Security
- ✅ Use `env_file` directive instead of hardcoded values
- ✅ Separate development and production configurations
- ✅ Use Docker secrets for sensitive data in production
- ✅ Run containers with non-root users

### API Key Management
- ✅ Use multiple API keys for load distribution
- ✅ Monitor API key usage and health
- ✅ Implement automatic failover
- ✅ Never expose API keys in client-side code
- ✅ Use API key rotation strategies

## 📊 Monitoring and Maintenance

### API Key Health Monitoring
The admin dashboard provides real-time monitoring of:
- Request counts and success rates
- Last usage timestamps
- Connection test results
- Error tracking and reporting

### Security Auditing
Regular security checks should include:
- Review of environment variable access
- API key rotation schedule
- Database credential updates
- SSL certificate renewals
- Security patch updates

## 🔍 Troubleshooting

### Common Issues

1. **Environment variables not loading:**
   - Check file permissions on `.env` files
   - Verify Docker Compose syntax
   - Ensure no trailing spaces in variable values

2. **API key authentication failures:**
   - Test API keys using the admin dashboard
   - Check API key format and validity
   - Verify base URL configuration

3. **Database connection issues:**
   - Confirm database credentials
   - Check network connectivity
   - Verify database service is running

### Debug Commands

```bash
# Check environment variables in container
docker-compose exec backend env | grep MAYSTRO

# Test database connection
docker-compose exec backend npm run db:test

# View container logs
docker-compose logs backend
docker-compose logs frontend
```

## 📝 Changelog

### Version 1.0.0 - Security Implementation
- Moved all sensitive data from docker-compose.yml to .env files
- Implemented multiple Maystro API key support
- Added production-ready environment templates
- Created comprehensive security documentation
- Implemented API key load balancing and health monitoring

## 🆘 Support

For security-related issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Contact the development team
4. Never share sensitive credentials in support requests

---

**⚠️ Important:** Always use strong, unique secrets in production and never commit actual environment files to version control.