#!/bin/bash

# =======================================
# Slider App - Status Checker
# =======================================
# Shows the status of all Slider app services

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP STATUS CHECKER        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check deployment configuration
CONFIG_FILE="./deployment.config"
if [ -f "$CONFIG_FILE" ]; then
  source $CONFIG_FILE
  if [ "$ENABLE_DEPLOYMENT" == "true" ]; then
    echo -e "${GREEN}✓ Deployment enabled${NC}"
  else
    echo -e "${RED}✗ Deployment disabled${NC}"
  fi
else
  echo -e "${RED}✗ Configuration file not found${NC}"
fi

# Check MongoDB status
echo -e "\n${YELLOW}MongoDB Status:${NC}"
if command -v mongosh &> /dev/null; then
  if pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✓ MongoDB service is running${NC}"
    
    # Test connection
    if mongosh --eval "db.serverStatus()" --quiet &> /dev/null; then
      echo -e "${GREEN}✓ MongoDB connection successful${NC}"
    else
      echo -e "${RED}✗ MongoDB connection failed${NC}"
    fi
  else
    echo -e "${RED}✗ MongoDB service is not running${NC}"
  fi
else
  echo -e "${YELLOW}! MongoDB shell not found, can't verify connection${NC}"
  if pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✓ MongoDB process is running${NC}"
  else
    echo -e "${RED}✗ MongoDB process is not running${NC}"
  fi
fi

# Check backend server status
echo -e "\n${YELLOW}Backend Server Status:${NC}"
if pgrep -f "node.*server\.js" > /dev/null || pgrep -f "nodemon.*server\.js" > /dev/null; then
  echo -e "${GREEN}✓ Backend server is running${NC}"
  # Check if backend is responding
  if curl -s http://localhost:3000/health &> /dev/null; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
  else
    echo -e "${RED}✗ Backend server is not responding${NC}"
  fi
else
  echo -e "${RED}✗ Backend server is not running${NC}"
fi

# Check frontend server status
echo -e "\n${YELLOW}Frontend Server Status:${NC}"
if pgrep -f "vite" > /dev/null; then
  echo -e "${GREEN}✓ Frontend server is running${NC}"
  # Check if frontend is responding
  if curl -s http://localhost:5173 &> /dev/null; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
  else
    echo -e "${RED}✗ Frontend server is not responding${NC}"
  fi
else
  echo -e "${RED}✗ Frontend server is not running${NC}"
fi

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BOLD}        SERVER CONTROL COMMANDS        ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}./quick-start.sh${NC}  - Start the application"
echo -e "${GREEN}./stop-servers.sh${NC} - Stop all servers"
echo -e "${GREEN}./db-check.sh${NC}     - Run detailed database check"
echo -e "${BLUE}===============================================${NC}"
