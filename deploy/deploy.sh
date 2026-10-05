#!/bin/bash
# =============================================================
# Auto-Deploy Script for newstartour.vn
# Triggered by GitHub webhook on push to main branch
# =============================================================

set -e

DEPLOY_DIR="/var/www/travel-site"
LOG_FILE="/var/log/travel-site-deploy.log"
LOCK_FILE="/tmp/travel-site-deploy.lock"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Prevent concurrent deployments
if [ -f "$LOCK_FILE" ]; then
    log "❌ Deploy already in progress. Exiting."
    exit 1
fi
trap "rm -f $LOCK_FILE" EXIT
touch "$LOCK_FILE"

log "🚀 Starting deployment..."

# Navigate to project directory
cd "$DEPLOY_DIR"

# Pull latest code
log "📥 Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# Check which files changed to determine what to rebuild
CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "all")

# Rebuild backend if backend files changed
if echo "$CHANGED_FILES" | grep -q "^backend/" || [ "$CHANGED_FILES" = "all" ]; then
    log "🔧 Backend changes detected. Rebuilding backend..."
    docker compose build --no-cache backend
    docker compose up -d backend
    log "✅ Backend rebuilt and restarted."
fi

# Rebuild frontend if frontend files changed
if echo "$CHANGED_FILES" | grep -q "^frontend/" || [ "$CHANGED_FILES" = "all" ]; then
    log "🔧 Frontend changes detected. Rebuilding frontend..."
    docker compose build --no-cache frontend
    docker compose up -d frontend
    log "✅ Frontend rebuilt and restarted."
fi

# Rebuild AppQuanLy if AppQuanLy files changed
if echo "$CHANGED_FILES" | grep -q "^AppQuanLy/" || [ "$CHANGED_FILES" = "all" ]; then
    log "🔧 AppQuanLy changes detected. Rebuilding AppQuanLy..."
    if [ -f "$DEPLOY_DIR/AppQuanLy/docker-compose.yml" ]; then
        cd "$DEPLOY_DIR/AppQuanLy"
        docker compose build --no-cache
        docker compose up -d
        cd "$DEPLOY_DIR"
    fi
    log "✅ AppQuanLy rebuilt and restarted."
fi

# Rebuild docker-compose.yml changes
if echo "$CHANGED_FILES" | grep -q "^docker-compose.yml" || [ "$CHANGED_FILES" = "all" ]; then
    log "🔧 docker-compose.yml changed. Restarting all services..."
    docker compose up -d
    log "✅ All services restarted."
fi

# Cleanup old Docker images
docker image prune -f >> "$LOG_FILE" 2>&1

log "🎉 Deployment completed successfully!"
log "============================================"
