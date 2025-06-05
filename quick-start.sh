#!/bin/bash

# =======================================
# Slider App Quick Start
# =======================================

# This is a simple startup script that can be run with a single command
# It removes security barriers for local development use only

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP QUICK START        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Temporarily modify deployment.config to enable startup
CONFIG_FILE="./deployment.config"
if [ -f "$CONFIG_FILE" ]; then
  # Backup original config
  cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
  
  # Update ENABLE_DEPLOYMENT to true
  sed -i '' 's/ENABLE_DEPLOYMENT=false/ENABLE_DEPLOYMENT=true/g' "$CONFIG_FILE"
  echo -e "${GREEN}Deployment enabled for this session.${NC}"
else
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  exit 1
fi

# Start backend server
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend
SCRIPT_DIR="$(pwd)"
# Use absolute path for the backend script
NODE_PATH="$(which node)"
NODEMON_PATH="$(npm bin)/nodemon"
$NODE_PATH $NODEMON_PATH server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to initialize and check if it's responding
PORT=${BACKEND_PORT:-3000}
MAX_ATTEMPTS=30
ATTEMPTS=0
echo -e "${YELLOW}Waiting for backend to start (port $PORT)...${NC}"

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if ps -p $BACKEND_PID > /dev/null; then
    if curl -s http://localhost:$PORT/health &> /dev/null; then
      echo -e "${GREEN}Backend server running and responding on http://localhost:$PORT${NC}"
      break
    fi
  else
    echo -e "${RED}Backend process died. Check backend.log for details:${NC}"
    tail -n 10 backend.log
  
  # Restore original config
  mv "${CONFIG_FILE}.bak" "$CONFIG_FILE"
  echo -e "${YELLOW}Original configuration restored.${NC}"
  exit 1
fi

# Start frontend server
echo -e "${YELLOW}Starting frontend server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to initialize
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
  echo -e "${GREEN}Frontend server running on http://localhost:5173${NC}"
else
  echo -e "${RED}Frontend server failed to start. Check frontend.log for details:${NC}"
  tail -n 10 frontend.log
  
  # Kill backend server
  kill $BACKEND_PID
  
  # Restore original config
  mv "${CONFIG_FILE}.bak" "$CONFIG_FILE"
  echo -e "${YELLOW}Original configuration restored.${NC}"
  exit 1
fi

echo -e "${GREEN}Application started successfully!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}Open your browser to: ${GREEN}http://localhost:5173${NC}"

# Register cleanup function to restore config on exit
cleanup() {
  echo -e "\n${YELLOW}Stopping servers and restoring configuration...${NC}"
  # Kill server processes
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  # Restore original config
  if [ -f "${CONFIG_FILE}.bak" ]; then
    mv "${CONFIG_FILE}.bak" "$CONFIG_FILE"
    echo -e "${GREEN}Original configuration restored.${NC}"
  fi
  echo -e "${GREEN}Cleanup completed.${NC}"
}

trap cleanup EXIT INT TERM

echo -e "${YELLOW}Press Enter to stop servers and restore configuration...${NC}"
read -r

# Script will exit and cleanup will run automatically
