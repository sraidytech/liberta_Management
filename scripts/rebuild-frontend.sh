#!/bin/bash

echo "🔄 Rebuilding frontend container with new environment variables..."

# Stop the frontend container
echo "⏹️ Stopping frontend container..."
docker-compose -f docker-compose.prod-optimized-fixed.yml stop frontend

# Remove the frontend container and image to force rebuild
echo "🗑️ Removing frontend container and cached images..."
docker-compose -f docker-compose.prod-optimized-fixed.yml rm -f frontend
docker rmi libertaphonix_frontend:latest 2>/dev/null || true

# Rebuild and start the frontend with no cache
echo "🔨 Rebuilding frontend with --no-cache..."
docker-compose -f docker-compose.prod-optimized-fixed.yml build --no-cache frontend

# Start the frontend container
echo "🚀 Starting frontend container..."
docker-compose -f docker-compose.prod-optimized-fixed.yml up -d frontend

echo "✅ Frontend rebuild complete!"
echo "🌐 Frontend should now use: https://app.libertadz.shop/api"
echo "📝 Check browser console to verify API calls are going to production URL"