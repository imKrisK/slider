#!/bin/bash

# =======================================
# Slider App Development Mode Script
# =======================================
# This script temporarily enables development mode
# for local testing while keeping production deployment
# safeguards in place

CONFIG_FILE="./deployment.config"
CONFIG_BACKUP="./deployment.config.bak"
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Function to restore original config on script exit
cleanup() {
  echo -e "\n${YELLOW}Cleaning up and restoring original configuration...${NC}"
  if [ -f "$CONFIG_BACKUP" ]; then
    cp "$CONFIG_BACKUP" "$CONFIG_FILE"
    rm "$CONFIG_BACKUP"
    echo -e "${GREEN}Original configuration restored.${NC}"
  fi
  
  # Kill any running dev processes if needed
  if [ -n "$BACKEND_PID" ]; then
    echo -e "${YELLOW}Stopping backend server (PID: $BACKEND_PID)${NC}"
    kill $BACKEND_PID 2>/dev/null
  fi
  if [ -n "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}Stopping frontend server (PID: $FRONTEND_PID)${NC}"
    kill $FRONTEND_PID 2>/dev/null
  fi
  
  echo -e "${GREEN}Development session ended.${NC}"
}

# Register the cleanup function to be called on script exit
trap cleanup EXIT

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP DEVELOPMENT MODE${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  exit 1
fi

# Backup original config
cp "$CONFIG_FILE" "$CONFIG_BACKUP"
echo -e "${GREEN}Configuration backed up.${NC}"

# Create temporary dev config
cat > "$CONFIG_FILE" <<EOL
# Slider App Temporary Development Configuration
# This is a temporary configuration file for local development

# Temporarily enable deployment for development
ENABLE_DEPLOYMENT=true

# MongoDB settings - using local database for development
ENABLE_MONGODB=true
MONGO_URI="mongodb://localhost:27017/pokeshowcase"

# Disable production services for dev testing
ENABLE_STRIPE=false
ENABLE_EMAIL=false

# Development server ports
BACKEND_PORT=3000
FRONTEND_PORT=5173
EOL

echo -e "${YELLOW}Development configuration created.${NC}"
echo -e "${RED}WARNING: Application will be temporarily enabled for local development only.${NC}"
echo -e "${RED}When you exit this script, the original protected configuration will be restored.${NC}"
echo -e "${BLUE}===============================================${NC}"

# Ask for confirmation
read -p "Start development servers? (y/N): " confirm
if [[ $confirm != [Yy]* ]]; then
  echo -e "${YELLOW}Development mode cancelled.${NC}"
  exit 0
fi

echo -e "${YELLOW}Starting development servers...${NC}"

# Start the backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
npm run dev:unsafe > ../backend.dev.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}Backend server started with PID: $BACKEND_PID${NC}"

# Wait a moment for backend to initialize
sleep 2

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
  echo -e "${GREEN}Backend server running successfully.${NC}"
else
  echo -e "${RED}Backend server failed to start. Check backend.dev.log for details.${NC}"
  cat backend.dev.log
  exit 1
fi

# Start the frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev:unsafe > ../frontend.dev.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"

# Wait a moment for frontend to initialize
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
  echo -e "${GREEN}Frontend server running successfully.${NC}"
else
  echo -e "${RED}Frontend server failed to start. Check frontend.dev.log for details.${NC}"
  cat frontend.dev.log
  exit 1
fi

echo -e "\n${GREEN}Development servers are now running!${NC}"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}Backend:${NC} http://localhost:3000"
echo -e "${YELLOW}Logs are being written to backend.dev.log and frontend.dev.log${NC}"
echo -e "${RED}Press Ctrl+C to stop development servers and restore secure configuration${NC}"

# Keep the script running to maintain the trap
while true; do
  sleep 1
done
