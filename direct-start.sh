#!/bin/bash

# =======================================
# Slider App Direct Start Script
# =======================================
# This script bypasses the safeguard and starts the application directly

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP DIRECT START        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Kill any running servers first
echo -e "${YELLOW}Stopping any running servers...${NC}"
./stop-servers.sh > /dev/null 2>&1

# Check if MongoDB is installed and running
echo -e "${YELLOW}Checking MongoDB...${NC}"
if command -v mongod &> /dev/null; then
  if ! pgrep -x mongod > /dev/null; then
    echo -e "${YELLOW}MongoDB is not running. Attempting to start...${NC}"
    brew services start mongodb-community 2>/dev/null || echo -e "${RED}Failed to start MongoDB. Please start it manually.${NC}"
    sleep 3
  else
    echo -e "${GREEN}MongoDB is running.${NC}"
  fi
else
  echo -e "${YELLOW}MongoDB command not found. Assuming it's running in a different way...${NC}"
fi

echo -e "${YELLOW}Starting backend server (bypassing safeguards)...${NC}"

# Start backend without safeguards
cd backend
NODE_PATH="$(which node)"
$NODE_PATH server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}Backend server started with PID: $BACKEND_PID${NC}"

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
    echo -e "${RED}Backend process died. Check backend.log for details.${NC}"
    tail -n 10 backend.log
    exit 1
  fi
  
  ATTEMPTS=$((ATTEMPTS+1))
  echo -n "."
  sleep 1
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo -e "${RED}Backend server is running but not responding after $MAX_ATTEMPTS attempts.${NC}"
  echo -e "${YELLOW}Showing last 15 lines of backend log:${NC}"
  tail -n 15 backend.log
  echo -e "${YELLOW}You may want to check if the health endpoint is properly defined.${NC}"
else
  # Wait 1 more second to ensure the server is fully initialized
  sleep 1
fi

echo -e "${YELLOW}Starting frontend server (bypassing safeguards)...${NC}"

# Start frontend without safeguards
cd frontend
npm run dev:unsafe > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"

# Wait for frontend to initialize
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
  echo -e "${GREEN}Frontend server running on http://localhost:5173${NC}"
else
  echo -e "${RED}Frontend server failed to start. Check frontend.log for details.${NC}"
  tail -n 10 frontend.log
  exit 1
fi

echo -e "${GREEN}Application started successfully!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}Open your browser to: ${GREEN}http://localhost:5173${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the application.${NC}"
echo -e "${BLUE}===============================================${NC}"

# Keep the script running so user can see output and easily Ctrl+C to stop
echo -e "${YELLOW}Showing live logs (Ctrl+C to stop)...${NC}"
echo -e "${BLUE}------- Backend Log -------${NC}"
tail -f backend.log
