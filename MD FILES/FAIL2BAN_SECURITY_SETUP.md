# 🛡️ Fail2Ban Security Setup for LibertaPhonix

## Overview

Fail2Ban is an intrusion prevention system that monitors log files and automatically blocks IP addresses showing malicious behavior. This is **highly recommended** for production servers, especially given the recent CVE-2025-55182 Next.js vulnerability.

---

## 🎯 Why You Need Fail2Ban

1. **Automatic Attack Blocking**: Blocks IPs after repeated failed attempts
2. **CVE-2025-55182 Protection**: Detects and blocks RSC exploit attempts
3. **Brute Force Prevention**: Protects against SSH and login attacks
4. **DDoS Mitigation**: Helps prevent denial-of-service attacks
5. **Zero Maintenance**: Works automatically once configured

---

## 📦 Installation & Configuration

### Step 1: Install Fail2Ban

```bash
# Update package list
sudo apt update

# Install fail2ban
sudo apt install -y fail2ban

# Start and enable service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Verify installation
sudo systemctl status fail2ban
```

### Step 2: Create Custom Configuration

```bash
# Create local configuration (never edit jail.conf directly)
sudo nano /etc/fail2ban/jail.local
```

**Paste this comprehensive configuration:**

```ini
[DEFAULT]
# Ban settings
bantime = 3600          # Ban for 1 hour
findtime = 600          # Look back 10 minutes
maxretry = 3            # Allow 3 attempts before ban
backend = systemd       # Use systemd for log monitoring

# Email notifications (optional)
destemail = contact@libertaphoenix.com
sendername = Fail2Ban-LibertaPhonix
action = %(action_mwl)s  # Ban and send email with logs

# Ignore local IPs (add your office IP if needed)
ignoreip = 127.0.0.1/8 ::1

# ============================================
# SSH Protection
# ============================================
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200          # 2 hours for SSH attacks

# ============================================
# Nginx Protection
# ============================================
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/libertaphonix_error.log
maxretry = 3

[nginx-noscript]
enabled = true
filter = nginx-noscript
port = http,https
logpath = /var/log/nginx/libertaphonix_access.log
maxretry = 6

[nginx-badbots]
enabled = true
filter = nginx-badbots
port = http,https
logpath = /var/log/nginx/libertaphonix_access.log
maxretry = 2

[nginx-noproxy]
enabled = true
filter = nginx-noproxy
port = http,https
logpath = /var/log/nginx/libertaphonix_access.log
maxretry = 2

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/libertaphonix_error.log
maxretry = 10
findtime = 60
bantime = 600

# ============================================
# Next.js RSC Exploit Protection (CVE-2025-55182)
# ============================================
[nextjs-rsc-exploit]
enabled = true
filter = nextjs-rsc-exploit
port = http,https
logpath = /var/log/nginx/libertaphonix_access.log
maxretry = 1            # Ban immediately on exploit attempt
bantime = 86400         # Ban for 24 hours
findtime = 60

# ============================================
# API Abuse Protection
# ============================================
[nginx-api-abuse]
enabled = true
filter = nginx-api-abuse
port = http,https
logpath = /var/log/nginx/libertaphonix_access.log
maxretry = 30
findtime = 60
bantime = 1800

# ============================================
# Login Brute Force Protection
# ============================================
[nginx-login-bruteforce]
enabled = true
filter = nginx-login-bruteforce
port = http,https
logpath = /var/log/nginx/libertaphonix_access.log
maxretry = 5
findtime = 300
bantime = 3600

# ============================================
# Docker Container Protection
# ============================================
[docker-auth]
enabled = true
filter = docker-auth
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

### Step 3: Create Custom Filters

#### Filter 1: Next.js RSC Exploit Detection

```bash
sudo nano /etc/fail2ban/filter.d/nextjs-rsc-exploit.conf
```

```ini
# Fail2Ban filter for Next.js RSC exploit attempts (CVE-2025-55182)
[Definition]

# Detect RSC exploit patterns in access logs
failregex = ^<HOST> .* "(POST|GET) .*(/rsc/|/_next/data/|react-server-dom).*" .* ".*(\$\$typeof|Symbol\.for|__webpack_require__|react-server-dom-webpack).*"$
            ^<HOST> .* "POST .*" .* ".*multipart/form-data.*" .* "($$typeof|Symbol\.for)".*$
            ^<HOST> .* "(POST|GET) .*/api/.*" .* ".*react-server.*" .*$

ignoreregex =

# Date pattern for Nginx logs
datepattern = ^%%d/%%b/%%Y:%%H:%%M:%%S
```

#### Filter 2: API Abuse Detection

```bash
sudo nano /etc/fail2ban/filter.d/nginx-api-abuse.conf
```

```ini
# Fail2Ban filter for API abuse
[Definition]

# Detect excessive API calls
failregex = ^<HOST> .* "(GET|POST|PUT|DELETE) /api/.*" (429|503) .*$
            ^<HOST> .* "POST /api/.*" 4\d\d .*$

ignoreregex =

datepattern = ^%%d/%%b/%%Y:%%H:%%M:%%S
```

#### Filter 3: Login Brute Force Detection

```bash
sudo nano /etc/fail2ban/filter.d/nginx-login-bruteforce.conf
```

```ini
# Fail2Ban filter for login brute force attempts
[Definition]

# Detect failed login attempts
failregex = ^<HOST> .* "POST /api/auth/.*" (401|403) .*$
            ^<HOST> .* "POST /api/login.*" (401|403) .*$
            ^<HOST> .* "POST /api/signin.*" (401|403) .*$

ignoreregex =

datepattern = ^%%d/%%b/%%Y:%%H:%%M:%%S
```

#### Filter 4: Docker Authentication

```bash
sudo nano /etc/fail2ban/filter.d/docker-auth.conf
```

```ini
# Fail2Ban filter for Docker authentication failures
[Definition]

failregex = ^.*Failed password for .* from <HOST>.*$
            ^.*authentication failure.*rhost=<HOST>.*$
            ^.*Invalid user .* from <HOST>.*$

ignoreregex =
```

### Step 4: Test Configuration

```bash
# Test fail2ban configuration
sudo fail2ban-client -t

# Test specific jail
sudo fail2ban-regex /var/log/nginx/libertaphonix_access.log /etc/fail2ban/filter.d/nextjs-rsc-exploit.conf

# Restart fail2ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status
```

---

## 🔍 Monitoring & Management

### Check Banned IPs

```bash
# List all active jails
sudo fail2ban-client status

# Check specific jail status
sudo fail2ban-client status sshd
sudo fail2ban-client status nextjs-rsc-exploit
sudo fail2ban-client status nginx-api-abuse

# View banned IPs
sudo fail2ban-client status nextjs-rsc-exploit | grep "Banned IP"
```

### Unban an IP

```bash
# Unban from specific jail
sudo fail2ban-client set nextjs-rsc-exploit unbanip 192.168.1.100

# Unban from all jails
sudo fail2ban-client unban 192.168.1.100
```

### View Fail2Ban Logs

```bash
# Real-time monitoring
sudo tail -f /var/log/fail2ban.log

# Search for specific IP
sudo grep "192.168.1.100" /var/log/fail2ban.log

# View ban actions
sudo grep "Ban" /var/log/fail2ban.log | tail -20
```

---

## 📊 Integration with Cloudflare

For enhanced protection, integrate Fail2Ban with Cloudflare:

### Step 1: Install Cloudflare API Script

```bash
# Create Cloudflare ban script
sudo nano /usr/local/bin/cloudflare-ban.sh
```

```bash
#!/bin/bash
# Cloudflare Fail2Ban Integration

CF_API_KEY="your_cloudflare_api_key"
CF_EMAIL="contact@libertaphoenix.com"
CF_ZONE_ID="your_zone_id"
IP=$1

# Add IP to Cloudflare firewall
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/firewall/access_rules/rules" \
     -H "X-Auth-Email: $CF_EMAIL" \
     -H "X-Auth-Key: $CF_API_KEY" \
     -H "Content-Type: application/json" \
     --data "{\"mode\":\"block\",\"configuration\":{\"target\":\"ip\",\"value\":\"$IP\"},\"notes\":\"Blocked by Fail2Ban\"}"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/cloudflare-ban.sh
```

### Step 2: Update Fail2Ban Action

```bash
sudo nano /etc/fail2ban/action.d/cloudflare.conf
```

```ini
[Definition]
actionstart =
actionstop =
actioncheck =
actionban = /usr/local/bin/cloudflare-ban.sh <ip>
actionunban =
```

---

## 🚨 Alert Configuration

### Email Alerts

Update `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
# Email settings
destemail = contact@libertaphoenix.com
sendername = Fail2Ban-LibertaPhonix
mta = sendmail
action = %(action_mwl)s  # Send email with logs
```

### Slack/Discord Webhooks (Optional)

```bash
sudo nano /etc/fail2ban/action.d/slack.conf
```

```ini
[Definition]
actionban = curl -X POST -H 'Content-type: application/json' --data '{"text":"🚨 Fail2Ban: Banned <ip> in jail <name>"}' https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## 📈 Performance Impact

Fail2Ban has minimal performance impact:
- **CPU Usage**: < 1%
- **Memory**: ~20-30 MB
- **Disk I/O**: Minimal (only reads logs)

---

## ✅ Verification Checklist

After setup, verify:

```bash
# 1. Check fail2ban is running
sudo systemctl status fail2ban

# 2. Verify all jails are active
sudo fail2ban-client status

# 3. Test SSH protection (from another machine)
# Try 4 failed SSH attempts - should get banned

# 4. Monitor logs
sudo tail -f /var/log/fail2ban.log

# 5. Check iptables rules
sudo iptables -L -n | grep fail2ban
```

---

## 🔧 Troubleshooting

### Fail2Ban Not Starting

```bash
# Check configuration
sudo fail2ban-client -t

# View detailed errors
sudo journalctl -u fail2ban -n 50

# Restart service
sudo systemctl restart fail2ban
```

### Jail Not Working

```bash
# Test filter against log
sudo fail2ban-regex /var/log/nginx/libertaphonix_access.log /etc/fail2ban/filter.d/nextjs-rsc-exploit.conf --print-all-matched

# Check jail status
sudo fail2ban-client status nextjs-rsc-exploit
```

### Accidentally Banned Yourself

```bash
# Unban your IP
sudo fail2ban-client unban YOUR_IP

# Add to whitelist
sudo nano /etc/fail2ban/jail.local
# Add to ignoreip: 127.0.0.1/8 ::1 YOUR_IP
```

---

## 📊 Expected Results

After implementing Fail2Ban:

✅ **Automatic blocking** of malicious IPs  
✅ **Protection** against CVE-2025-55182 exploit attempts  
✅ **Reduced** brute force attacks  
✅ **Email alerts** for security events  
✅ **Integration** with Cloudflare firewall  
✅ **Minimal** performance impact  

---

## 🎯 Recommended Next Steps

1. **Monitor logs** for the first 24 hours
2. **Adjust maxretry** values based on legitimate traffic
3. **Set up email alerts** for critical jails
4. **Integrate with Cloudflare** for global blocking
5. **Review banned IPs** weekly
6. **Update filters** as new threats emerge

---

## 📝 Maintenance Schedule

- **Daily**: Check fail2ban.log for unusual activity
- **Weekly**: Review banned IPs and unban false positives
- **Monthly**: Update fail2ban and filters
- **Quarterly**: Review and optimize jail configurations

---

## 🔗 Additional Resources

- [Fail2Ban Official Documentation](https://www.fail2ban.org/)
- [CVE-2025-55182 Details](https://nvd.nist.gov/vuln/detail/CVE-2025-55182)
- [Nginx Security Best Practices](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

---

**Status**: ✅ Ready for Production Deployment  
**Priority**: 🔴 HIGH - Implement immediately for security