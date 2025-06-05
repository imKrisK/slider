#!/bin/bash

# =======================================
# Slider App - One-Click Launcher
# =======================================
# This script provides a simple menu to launch the application

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}===============================================${NC}"
echo -e "${WHITE}${BOLD}        SLIDER APP LAUNCHER        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check current application status
echo -e "${YELLOW}Checking current application status...${NC}"
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if pgrep -f "node.*server\.js" > /dev/null || pgrep -f "nodemon.*server\.js" > /dev/null; then
  BACKEND_RUNNING=true
  echo -e "${GREEN}✓ Backend server is already running${NC}"
else
  echo -e "${YELLOW}✗ Backend server is not running${NC}"
fi

if pgrep -f "vite" > /dev/null; then
  FRONTEND_RUNNING=true
  echo -e "${GREEN}✓ Frontend server is already running${NC}"
else
  echo -e "${YELLOW}✗ Frontend server is not running${NC}"
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${WHITE}${BOLD}        SELECT AN OPTION:        ${NC}"
echo -e "${BLUE}===============================================${NC}"

if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
  echo -e "${GREEN}1. Application is already running${NC}"
  echo -e "${YELLOW}2. Restart application${NC}"
  echo -e "${RED}3. Stop application${NC}"
  echo -e "${BLUE}4. Check application status${NC}"
  echo -e "${BLUE}5. Run setup assistant${NC}"
  echo -e "${BLUE}6. Open application in browser${NC}"
  echo -e "${RED}q. Quit${NC}"
  
  echo -e "${BLUE}===============================================${NC}"
  read -p "Enter your choice: " choice
  
  case $choice in
    1)
      echo "Application is already running."
      echo -e "Access it at: ${GREEN}http://localhost:5173${NC}"
      ;;
    2)
      echo "Restarting application..."
      ./stop-servers.sh
      sleep 2
      ./quick-start.sh
      ;;
    3)
      echo "Stopping application..."
      ./stop-servers.sh
      ;;
    4)
      ./check-status.sh
      ;;
    5)
      ./setup-assistant.sh
      ;;
    6)
      open "http://localhost:5173"
      ;;
    q|Q)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
else
  echo -e "${GREEN}1. Start application (recommended)${NC}"
  echo -e "${YELLOW}2. Start application with no safeguards${NC}"
  echo -e "${BLUE}3. Check application status${NC}"
  echo -e "${BLUE}4. Run setup assistant${NC}"
  echo -e "${RED}q. Quit${NC}"
  
  echo -e "${BLUE}===============================================${NC}"
  read -p "Enter your choice: " choice
  
  case $choice in
    1)
      echo "Starting application..."
      ./quick-start.sh
      ;;
    2)
      echo "Starting application with no safeguards..."
      ./direct-start.sh
      ;;
    3)
      ./check-status.sh
      ;;
    4)
      ./setup-assistant.sh
      ;;
    q|Q)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Invalid option"
      ;;
  esac
fi
