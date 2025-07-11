#!/bin/bash

# Frontend Update Script for LibertaPhonix Management System
# This script handles Next.js cache clearing and frontend updates

echo "🚀 Starting frontend update process..."

# Stop the frontend container
echo "⏹️  Stopping frontend container..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized-fixed.yml stop frontend

# Remove the frontend container to force rebuild
echo "🗑️  Removing frontend container..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized-fixed.yml rm -f frontend

# Clear any dangling images
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# Rebuild and start the frontend container
echo "🔨 Rebuilding and starting frontend container..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized-fixed.yml up -d --build frontend

# Wait for the container to be healthy
echo "⏳ Waiting for frontend to be ready..."
sleep 30

# Check if the frontend is running
if docker-compose -f docker-compose.yml -f docker-compose.prod-optimized-fixed.yml ps frontend | grep -q "Up"; then
    echo "✅ Frontend update completed successfully!"
    echo "🌐 Your application should be available at: https://app.libertadz.shop"
else
    echo "❌ Frontend update failed. Please check the logs:"
    docker-compose -f docker-compose.yml -f docker-compose.prod-optimized-fixed.yml logs frontend
fi