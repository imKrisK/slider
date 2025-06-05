#!/bin/bash

# ==================================================
# Slider App Deployment Monitor & Blocker
# This script runs in the background to continuously
# monitor for unauthorized deployment attempts
# ==================================================

CONFIG_FILE="./deployment.config"
LOG_FILE="./deployment-monitor.log"
CHECK_INTERVAL=10  # seconds between checks
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to log messages with timestamp
log_message() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
  echo -e "$1"
}

# Check if running as a service/background process
if [ "$1" == "daemon" ]; then
  log_message "Starting deployment monitor in daemon mode"
  # Redirect output to log file
  exec 1>>$LOG_FILE
  exec 2>>$LOG_FILE
else
  log_message "Starting deployment monitor in interactive mode"
fi

log_message "Slider App Deployment Monitor started"
log_message "Configuration file: $CONFIG_FILE"
log_message "Log file: $LOG_FILE"

# Function to check and kill unauthorized processes
check_and_kill_processes() {
  # Load the latest config
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
  else
    log_message "${RED}Warning: Config file not found. Assuming deployment is disabled.${NC}"
    ENABLE_DEPLOYMENT="false"
  fi
  
  # If deployment is disabled, look for and kill unauthorized processes
  if [ "$ENABLE_DEPLOYMENT" != "true" ]; then
    # Check for slider-related Node.js processes
    backend_pids=$(ps -ef | grep "node.*server.js" | grep -v "grep" | grep -v "safeguard.sh" | awk '{print $2}')
    if [ -n "$backend_pids" ]; then
      for pid in $backend_pids; do
        log_message "${RED}Detected unauthorized backend server (PID: $pid). Killing process...${NC}"
        kill -9 $pid
        log_message "${GREEN}Unauthorized backend server terminated.${NC}"
      done
    fi
    
    # Check for Vite frontend processes
    vite_pids=$(ps -ef | grep "vite" | grep -v "grep" | grep -v "safeguard.sh" | awk '{print $2}')
    if [ -n "$vite_pids" ]; then
      for pid in $vite_pids; do
        log_message "${RED}Detected unauthorized frontend server (PID: $pid). Killing process...${NC}"
        kill -9 $pid
        log_message "${GREEN}Unauthorized frontend server terminated.${NC}"
      done
    fi
    
    # Check for processes on specific ports
    if [ -n "$BACKEND_PORT" ]; then
      port_pid=$(lsof -ti :$BACKEND_PORT 2>/dev/null)
      if [ -n "$port_pid" ]; then
        log_message "${RED}Detected unauthorized process on backend port $BACKEND_PORT (PID: $port_pid). Killing process...${NC}"
        kill -9 $port_pid
        log_message "${GREEN}Unauthorized process on port $BACKEND_PORT terminated.${NC}"
      fi
    fi
    
    if [ -n "$FRONTEND_PORT" ]; then
      port_pid=$(lsof -ti :$FRONTEND_PORT 2>/dev/null)
      if [ -n "$port_pid" ]; then
        log_message "${RED}Detected unauthorized process on frontend port $FRONTEND_PORT (PID: $port_pid). Killing process...${NC}"
        kill -9 $port_pid
        log_message "${GREEN}Unauthorized process on port $FRONTEND_PORT terminated.${NC}"
      fi
    fi
  fi
}

# Main monitoring loop
log_message "${YELLOW}Starting continuous monitoring...${NC}"
while true; do
  check_and_kill_processes
  
  # Re-check config to see if we should continue monitoring
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
  else
    ENABLE_DEPLOYMENT="false"
  fi
  
  # Display status every iteration only in interactive mode
  if [ "$1" != "daemon" ]; then
    if [ "$ENABLE_DEPLOYMENT" != "true" ]; then
      log_message "${GREEN}Deployment is disabled. Monitoring for unauthorized processes.${NC}"
    else
      log_message "${YELLOW}Deployment is enabled. Not blocking processes.${NC}"
    fi
  fi
  
  sleep $CHECK_INTERVAL
done
