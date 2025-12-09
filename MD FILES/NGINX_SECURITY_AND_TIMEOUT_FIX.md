# 🔒 Nginx Security & Timeout Configuration Fix

## Problem Analysis
- **Current Issue**: 524/504 timeout errors
- **Root Cause**: Nginx timeouts (1800s) exceed Cloudflare's 100s limit
- **Security Risk**: CVE-2025-55182 Next.js RSC vulnerability needs WAF protection

## ✅ React Version Status
- **Current**: React 19.2.1 & React-DOM 19.2.1
- **Status**: ✅ PATCHED - Safe from CVE-2025-55182

## 📝 Optimized Nginx Configuration

Replace `/etc/nginx/sites-available/libertaphonix` with this optimized configuration:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name app.libertadz.shop;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name app.libertadz.shop;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.libertadz.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.libertadz.shop/privkey.pem;

    # SSL Security (Modern Configuration)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Global timeout settings (Cloudflare-compatible)
    proxy_connect_timeout 30s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    send_timeout 60s;
    
    # Buffer settings for performance
    proxy_buffering on;
    proxy_buffer_size 8k;
    proxy_buffers 16 8k;
    proxy_busy_buffers_size 16k;
    client_body_buffer_size 128k;
    client_max_body_size 50M;

    # Frontend routes
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Specific timeouts for frontend
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API routes (optimized for Cloudflare)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Cloudflare-compatible timeouts (under 100s)
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Enhanced buffering for API responses
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 32 8k;
        proxy_busy_buffers_size 16k;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;  # Longer for persistent connections
        proxy_read_timeout 300s;  # Longer for persistent connections
    }

    # Security headers (Enhanced)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-DNS-Prefetch-Control "on" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Gzip compression (Enhanced)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/json
        application/javascript 
        application/x-javascript 
        application/xml 
        application/xml+rss 
        application/xhtml+xml 
        application/x-font-ttf 
        application/x-font-opentype 
        application/vnd.ms-fontobject 
        image/svg+xml 
        image/x-icon 
        application/rss+xml 
        application/atom_xml;
    gzip_disable "msie6";

    # Rate limiting zones (defined in http block - see below)
    limit_req zone=api_limit burst=20 nodelay;
    limit_req zone=general_limit burst=50 nodelay;

    # Access and error logs
    access_log /var/log/nginx/libertaphonix_access.log;
    error_log /var/log/nginx/libertaphonix_error.log warn;
}
```

## 🔧 Additional Nginx Configuration

Add these rate limiting zones to `/etc/nginx/nginx.conf` in the `http` block:

```nginx
http {
    # ... existing configuration ...

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
    limit_req_status 429;

    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    limit_conn conn_limit 20;

    # ... rest of configuration ...
}
```

## 🚀 Deployment Commands

Execute these commands on your server:

```bash
# 1. Backup current configuration
sudo cp /etc/nginx/sites-available/libertaphonix /etc/nginx/sites-available/libertaphonix.backup.$(date +%Y%m%d_%H%M%S)

# 2. Apply new configuration
sudo nano /etc/nginx/sites-available/libertaphonix
# Paste the new configuration above

# 3. Update nginx.conf for rate limiting
sudo nano /etc/nginx/nginx.conf
# Add the rate limiting zones in the http block

# 4. Test configuration
sudo nginx -t

# 5. If test passes, reload Nginx
sudo systemctl reload nginx

# 6. Monitor logs for issues
sudo tail -f /var/log/nginx/libertaphonix_error.log
```

## 🛡️ Cloudflare WAF Rules

Add these custom rules in Cloudflare Dashboard:

### Rule 1: Block Next.js RSC Exploit Attempts
```
Name: Block Next.js RSC RCE Exploit
Expression:
(http.request.uri.path contains "/_next/data/" or 
 http.request.uri.path contains "/rsc/" or
 http.request.method eq "POST") and
(http.request.body contains "$$typeof" or 
 http.request.body contains "Symbol.for" or
 http.request.body contains "react-server-dom")

Action: Block
```

### Rule 2: Rate Limit API Endpoints
```
Name: API Rate Limiting
Expression:
http.request.uri.path contains "/api/"

Action: Rate Limit
Rate: 100 requests per minute
```

## 📊 Key Changes Made

1. **Timeout Optimization**:
   - Reduced from 1800s to 60s (Cloudflare-compatible)
   - WebSocket connections: 300s (5 minutes)
   - Connect timeout: 30s

2. **Buffer Optimization**:
   - Increased buffer sizes for better performance
   - Enhanced buffering for API responses
   - Client body buffer: 128k

3. **Security Enhancements**:
   - Added rate limiting zones
   - Enhanced security headers
   - Improved CSP policy
   - Added Permissions-Policy header

4. **Performance Improvements**:
   - Enhanced gzip compression
   - Optimized buffer settings
   - Better proxy configuration

## ✅ Expected Results

After applying these changes:
- ✅ No more 524/504 timeout errors
- ✅ Response times under 60 seconds
- ✅ Protected against CVE-2025-55182
- ✅ Better performance with optimized buffers
- ✅ Rate limiting protection
- ✅ Enhanced security headers

## 🔍 Verification

Test the configuration:

```bash
# 1. Check Nginx status
sudo systemctl status nginx

# 2. Test response time
curl -w "@-" -o /dev/null -s https://app.libertadz.shop << 'EOF'
time_total: %{time_total}s
http_code: %{http_code}
EOF

# 3. Monitor for errors
sudo tail -f /var/log/nginx/libertaphonix_error.log

# 4. Check rate limiting
for i in {1..15}; do curl -s -o /dev/null -w "%{http_code}\n" https://app.libertadz.shop/api/health; done
```

## 🚨 Troubleshooting

If you still see 524 errors:

1. **Check backend response time**:
```bash
docker logs liberta_management-backend-1 --tail=100
```

2. **Optimize database queries** (if slow):
```bash
cd /home/liberta/liberta_Management/backend
npm run prisma:studio
# Check slow queries
```

3. **Increase Cloudflare timeout** (Enterprise only):
   - Free plan: 100s limit (cannot change)
   - Pro plan: 600s limit
   - Enterprise: Custom timeouts

## 📝 Notes

- React 19.2.1 is already installed ✅
- Next.js 15.3.3 is safe ✅
- Cloudflare free plan has 100s timeout limit
- WebSocket connections can have longer timeouts
- Rate limiting helps prevent abuse