#!/bin/bash

# ==========================================
# Slider App Deployment - System Startup Script
# ==========================================
# This script should be added to system startup to ensure
# the deployment monitor is running at all times

APP_DIR="/Users/iamkrisk/Documents/slider/slider"
LOG_FILE="$APP_DIR/startup.log"

# Log startup attempt
echo "$(date '+%Y-%m-%d %H:%M:%S') - System startup script executed" >> "$LOG_FILE"

# Navigate to application directory
cd "$APP_DIR"

# Ensure deployment is disabled by default
if [ -f "deployment.config" ]; then
  # Make sure deployment is disabled in the config
  sed -i '' 's/ENABLE_DEPLOYMENT=true/ENABLE_DEPLOYMENT=false/g' deployment.config
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Ensured deployment is disabled in config" >> "$LOG_FILE"
fi

# Start the deployment monitor in daemon mode
if [ -f "deployment-monitor.sh" ]; then
  nohup ./deployment-monitor.sh daemon > /dev/null 2>&1 &
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Started deployment monitor with PID: $!" >> "$LOG_FILE"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: deployment-monitor.sh not found" >> "$LOG_FILE"
fi

# Check and kill any existing server processes
./stop-servers.sh >> "$LOG_FILE" 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - System startup script completed" >> "$LOG_FILE"
