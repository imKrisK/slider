#!/bin/bash

# =======================================
# Slider App - Graceful Server Stop Script
# =======================================

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        STOPPING SLIDER APP SERVERS        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# First, check if dev-mode.sh is running and stop it properly
dev_mode_pid=$(ps -ef | grep "dev-mode.sh" | grep -v "grep" | awk '{print $2}')
if [ -n "$dev_mode_pid" ]; then
  echo -e "${YELLOW}Found dev-mode.sh process (PID: $dev_mode_pid), stopping it...${NC}"
  kill $dev_mode_pid
  echo -e "${GREEN}Dev mode process stopped.${NC}"
  # Give it a moment to clean up
  sleep 2
fi

# Find and kill nodemon/node server processes
echo -e "${YELLOW}Finding and stopping backend server processes...${NC}"
backend_pids=$(ps -ef | grep "node.*server\.js\|nodemon" | grep -v "grep" | awk '{print $2}')
if [ -n "$backend_pids" ]; then
  for pid in $backend_pids; do
    echo -e "${YELLOW}Stopping backend process (PID: $pid)...${NC}"
    kill $pid 2>/dev/null
  done
  echo -e "${GREEN}Backend server processes stopped.${NC}"
else
  echo -e "${BLUE}No backend server processes found.${NC}"
fi

# Find and kill Vite frontend server process
echo -e "${YELLOW}Finding and stopping frontend server process...${NC}"
frontend_pid=$(ps -ef | grep "vite" | grep -v "grep" | awk '{print $2}')
if [ -n "$frontend_pid" ]; then
  echo -e "${YELLOW}Stopping frontend process (PID: $frontend_pid)...${NC}"
  kill $frontend_pid 2>/dev/null
  echo -e "${GREEN}Frontend server process stopped.${NC}"
else
  echo -e "${BLUE}No Vite frontend server process found.${NC}"
fi

# Check for MongoDB process if running locally
mongo_pid=$(ps -ef | grep "mongod" | grep -v "grep" | awk '{print $2}')
if [ -n "$mongo_pid" ]; then
  echo "MongoDB process found (PID: $mongo_pid). If you want to stop it, run:"
  echo "kill $mongo_pid"
fi

echo "All servers related to the slider project have been stopped."
