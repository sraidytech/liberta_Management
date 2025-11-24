# 🚨 IMMEDIATE SERVER FIX - Copy and Paste These Commands

## The Issue
You have untracked files preventing git merge. Here are the exact commands to fix it:

## SOLUTION 1: Quick Fix (Recommended)

Copy and paste these commands one by one:

```bash
# Add the untracked file
git add docker-compose.prod-optimized.yml

# Reset to clean state
git reset --hard HEAD

# Pull latest changes
git pull origin main
```

## SOLUTION 2: If Solution 1 Doesn't Work

```bash
# Stash everything including untracked files
git stash push -u -m "server-backup-$(date +%Y%m%d_%H%M%S)"

# Pull latest changes
git pull origin main
```

## SOLUTION 3: Nuclear Option (If Above Don't Work)

```bash
# Remove the problematic file
rm docker-compose.prod-optimized.yml

# Reset to clean state
git reset --hard HEAD

# Pull latest changes
git pull origin main
```

## SOLUTION 4: Complete Fresh Start

```bash
# Go to parent directory
cd /home/liberta

# Backup current directory
mv liberta_Management liberta_Management.backup.$(date +%Y%m%d_%H%M%S)

# Clone fresh copy
git clone https://github.com/sraidytech/liberta_Management.git

# Enter directory
cd liberta_Management

# Verify you have the connection fixes
ls -la scripts/deploy-connection-fixes.sh
```

## After Git is Fixed, Deploy the Connection Fixes:

```bash
# Make script executable
chmod +x scripts/deploy-connection-fixes.sh

# Run the deployment
./scripts/deploy-connection-fixes.sh
```

## Quick Verification

```bash
# Check git status
git status

# Check if you have the connection fixes
grep "max_connections=200" docker-compose.prod-optimized-fixed.yml
```

---

**START WITH SOLUTION 1 - it should work for your case!**