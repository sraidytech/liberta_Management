# 🚨 Git Conflict Resolution Guide for LibertaPhonix Server

## Current Issue
You have unmerged files preventing git pull. Here's how to fix it:

## Step-by-Step Resolution

### 1. Check Git Status
```bash
git status
```
This will show you which files have conflicts.

### 2. Reset to Clean State (Recommended)
Since you're on the server and want the latest code, let's reset to a clean state:

```bash
# Save any local changes you want to keep (optional)
git stash push -m "server-local-changes-$(date +%Y%m%d_%H%M%S)"

# Reset to clean state
git reset --hard HEAD

# Pull latest changes
git pull origin main
```

### 3. Alternative: Manual Conflict Resolution
If you need to preserve local changes:

```bash
# Check which files have conflicts
git status

# For each conflicted file, edit it manually:
nano docker-compose.prod.yml

# Look for conflict markers:
# <<<<<<< HEAD
# (your local changes)
# =======
# (incoming changes)
# >>>>>>> branch-name

# Remove the conflict markers and keep the version you want

# After resolving all conflicts:
git add .
git commit -m "Resolve merge conflicts"
git pull origin main
```

### 4. Quick Fix for docker-compose.prod.yml
If the conflict is only in docker-compose.prod.yml:

```bash
# Remove the conflicted file and use the remote version
git rm docker-compose.prod.yml
git pull origin main

# Or reset just this file
git checkout --theirs docker-compose.prod.yml
git add docker-compose.prod.yml
git commit -m "Accept remote docker-compose.prod.yml"
git pull origin main
```

### 5. Nuclear Option (Complete Reset)
If nothing else works and you want a completely clean state:

```bash
# ⚠️ WARNING: This will delete ALL local changes
cd /home/liberta
rm -rf liberta_Management
git clone https://github.com/sraidytech/liberta_Management.git
cd liberta_Management
```

## Recommended Solution for Your Case

Since you're on the production server and want the latest fixes, use this:

```bash
# Navigate to project directory
cd /home/liberta/liberta_Management

# Save current state (just in case)
cp docker-compose.prod.yml docker-compose.prod.yml.backup.$(date +%Y%m%d_%H%M%S)

# Reset to clean state
git reset --hard HEAD

# Pull latest changes with connection fixes
git pull origin main

# Verify you have the latest files
ls -la scripts/
ls -la docker-compose.prod-optimized-fixed.yml
```

## After Resolving Git Issues

Once git is working, deploy the connection fixes:

```bash
# Make the deployment script executable
chmod +x scripts/deploy-connection-fixes.sh

# Run the deployment script
./scripts/deploy-connection-fixes.sh
```

## Verification

After fixing git and deploying:

```bash
# Check git status
git status

# Check if you have the latest connection fixes
grep "max_connections=200" docker-compose.prod-optimized-fixed.yml

# Check if deployment script exists
ls -la scripts/deploy-connection-fixes.sh
```

## If You Still Have Issues

If you continue having git issues, run this complete reset:

```bash
cd /home/liberta
mv liberta_Management liberta_Management.backup.$(date +%Y%m%d_%H%M%S)
git clone https://github.com/sraidytech/liberta_Management.git
cd liberta_Management
chmod +x scripts/deploy-connection-fixes.sh
./scripts/deploy-connection-fixes.sh
```

This will give you a completely fresh copy with all the connection pool fixes.