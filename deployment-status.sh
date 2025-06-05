#!/bin/bash

# ======================================
# Slider App Deployment Status Reporter
# ======================================

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load configuration file
CONFIG_FILE="./deployment.config"
if [ -f "$CONFIG_FILE" ]; then
  source $CONFIG_FILE
  echo -e "${GREEN}Deployment configuration loaded successfully.${NC}"
else
  echo -e "${RED}Error: Deployment configuration file not found.${NC}"
  exit 1
fi

echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}      SLIDER APP DEPLOYMENT STATUS    ${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# Check deployment status
echo -e "${YELLOW}Deployment Configuration:${NC}"
if [ "$ENABLE_DEPLOYMENT" == "true" ]; then
  echo -e "  Deployment Enabled: ${GREEN}$ENABLE_DEPLOYMENT${NC}"
else
  echo -e "  Deployment Enabled: ${RED}$ENABLE_DEPLOYMENT${NC}"
fi

if [ "$ENABLE_MONGODB" == "true" ]; then
  echo -e "  MongoDB Enabled: ${GREEN}$ENABLE_MONGODB${NC}"
else
  echo -e "  MongoDB Enabled: ${RED}$ENABLE_MONGODB${NC}"
fi

if [ "$ENABLE_STRIPE" == "true" ]; then
  echo -e "  Stripe Enabled: ${GREEN}$ENABLE_STRIPE${NC}"
else
  echo -e "  Stripe Enabled: ${RED}$ENABLE_STRIPE${NC}"
fi

if [ "$ENABLE_EMAIL" == "true" ]; then
  echo -e "  Email Enabled: ${GREEN}$ENABLE_EMAIL${NC}"
else
  echo -e "  Email Enabled: ${RED}$ENABLE_EMAIL${NC}"
fi
echo ""

# Check server processes
echo -e "${YELLOW}Server Processes:${NC}"

# Check backend server
backend_pid=$(ps -ef | grep "node.*backend/server.js" | grep -v "grep" | awk '{print $2}')
if [ -n "$backend_pid" ]; then
  echo -e "  Backend Server: ${GREEN}Running (PID: $backend_pid)${NC}"
else
  echo -e "  Backend Server: ${RED}Not Running${NC}"
fi

# Check frontend server
vite_pid=$(ps -ef | grep "vite.*frontend" | grep -v "grep" | awk '{print $2}')
if [ -n "$vite_pid" ]; then
  echo -e "  Frontend Server: ${GREEN}Running (PID: $vite_pid)${NC}"
else
  echo -e "  Frontend Server: ${RED}Not Running${NC}"
fi

echo ""
# Check ports
echo -e "${YELLOW}Network Ports:${NC}"

# Check backend port
if lsof -i :$BACKEND_PORT &>/dev/null; then
  port_pid=$(lsof -ti :$BACKEND_PORT)
  echo -e "  Backend Port ($BACKEND_PORT): ${GREEN}In Use (PID: $port_pid)${NC}"
else
  echo -e "  Backend Port ($BACKEND_PORT): ${BLUE}Available${NC}"
fi

# Check frontend port
if lsof -i :$FRONTEND_PORT &>/dev/null; then
  port_pid=$(lsof -ti :$FRONTEND_PORT)
  echo -e "  Frontend Port ($FRONTEND_PORT): ${GREEN}In Use (PID: $port_pid)${NC}"
else
  echo -e "  Frontend Port ($FRONTEND_PORT): ${BLUE}Available${NC}"
fi

echo ""
# Check MongoDB connection
echo -e "${YELLOW}MongoDB Status:${NC}"
if [ "$ENABLE_MONGODB" == "true" ]; then
  if pgrep -x mongod &>/dev/null; then
    echo -e "  MongoDB: ${GREEN}Running${NC}"
  else
    echo -e "  MongoDB: ${RED}Not Running${NC}"
  fi
  echo -e "  Connection URI: $MONGO_URI"
else
  echo -e "  MongoDB: ${YELLOW}Disabled in configuration${NC}"
fi

echo ""
echo -e "${YELLOW}Deployment Control Instructions:${NC}"
echo -e "  ${BLUE}To start all services:${NC} ./manage-deployment.sh start"
echo -e "  ${BLUE}To stop all services:${NC} ./manage-deployment.sh stop"
echo -e "  ${BLUE}To check service status:${NC} ./manage-deployment.sh status"
echo -e "  ${BLUE}To permanently disable deployment:${NC} Edit deployment.config and set ENABLE_DEPLOYMENT=false"

echo ""
echo -e "${CYAN}======================================${NC}"
