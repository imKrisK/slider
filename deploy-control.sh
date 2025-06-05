#!/bin/bash

# ==============================================
# Slider App Master Deployment Control Script
# This is the main entry point for all deployment
# and management actions for the Slider application
# ==============================================

VERSION="1.0.0"
CONFIG_FILE="./deployment.config"
MONITOR_LOG="./deployment-monitor.log"
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Function to display menu
show_menu() {
  clear
  echo -e "${BLUE}===============================================${NC}"
  echo -e "${BOLD}        SLIDER APP DEPLOYMENT MANAGER v$VERSION${NC}"
  echo -e "${BLUE}===============================================${NC}"
  echo -e ""
  
  # Load configuration
  load_config
  
  # Display current status
  echo -e "${YELLOW}Current Status:${NC}"
  if [ "$ENABLE_DEPLOYMENT" == "true" ]; then
    echo -e "  • Deployment: ${RED}ENABLED${NC}"
  else
    echo -e "  • Deployment: ${GREEN}DISABLED${NC}"
  fi
  
  if [ "$ENABLE_MONGODB" == "true" ]; then
    echo -e "  • MongoDB: ${YELLOW}ENABLED${NC}"
  else
    echo -e "  • MongoDB: ${GREEN}DISABLED${NC}"
  fi
  
  if [ "$ENABLE_STRIPE" == "true" ]; then
    echo -e "  • Stripe Payments: ${YELLOW}ENABLED${NC}"
  else
    echo -e "  • Stripe Payments: ${GREEN}DISABLED${NC}"
  fi
  
  if [ "$ENABLE_EMAIL" == "true" ]; then
    echo -e "  • Email Notifications: ${YELLOW}ENABLED${NC}"
  else
    echo -e "  • Email Notifications: ${GREEN}DISABLED${NC}"
  fi
  
  echo -e ""
  echo -e "${BOLD}Available Actions:${NC}"
  echo -e "  1. Check Service Status"
  echo -e "  2. Start All Services"
  echo -e "  3. Stop All Services"
  echo -e "  4. Enable Deployment"
  echo -e "  5. Disable Deployment"
  echo -e "  6. Start Deployment Monitor"
  echo -e "  7. View Monitor Logs"
  echo -e "  8. View Configuration"
  echo -e "  9. Edit Configuration"
  echo -e "  0. Exit"
  echo -e ""
  echo -e "${BLUE}===============================================${NC}"
}

# Function to load configuration
load_config() {
  # Default values if config is missing
  ENABLE_DEPLOYMENT="false"
  ENABLE_MONGODB="false"
  ENABLE_STRIPE="false"
  ENABLE_EMAIL="false"
  BACKEND_PORT="3000"
  FRONTEND_PORT="5173"
  
  # Load from config file if it exists
  if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
  else
    echo -e "${RED}Warning: Config file not found. Using default values.${NC}"
  fi
}

# Function to check services status
check_status() {
  ./deployment-status.sh
  echo ""
  read -p "Press Enter to continue..."
}

# Function to start services
start_services() {
  echo -e "${YELLOW}Attempting to start services...${NC}"
  ./manage-deployment.sh start
  echo ""
  read -p "Press Enter to continue..."
}

# Function to stop services
stop_services() {
  echo -e "${YELLOW}Stopping all services...${NC}"
  ./manage-deployment.sh stop
  echo ""
  read -p "Press Enter to continue..."
}

# Function to enable deployment
enable_deployment() {
  echo -e "${RED}WARNING: This will enable application deployment.${NC}"
  echo -e "${YELLOW}When enabled, the application can be started and will be accessible.${NC}"
  read -p "Are you sure you want to enable deployment? (y/N): " confirm
  
  if [[ $confirm == [Yy]* ]]; then
    sed -i '' 's/ENABLE_DEPLOYMENT=false/ENABLE_DEPLOYMENT=true/g' $CONFIG_FILE
    echo -e "${RED}Deployment has been ENABLED.${NC}"
  else
    echo -e "${GREEN}Operation cancelled. Deployment remains disabled.${NC}"
  fi
  
  echo ""
  read -p "Press Enter to continue..."
}

# Function to disable deployment
disable_deployment() {
  echo -e "${YELLOW}Disabling deployment...${NC}"
  sed -i '' 's/ENABLE_DEPLOYMENT=true/ENABLE_DEPLOYMENT=false/g' $CONFIG_FILE
  
  # Also stop any running services
  ./manage-deployment.sh stop
  
  echo -e "${GREEN}Deployment has been DISABLED and all services stopped.${NC}"
  echo ""
  read -p "Press Enter to continue..."
}

# Function to start monitor
start_monitor() {
  echo -e "${YELLOW}Starting deployment monitor...${NC}"
  echo -e "The monitor will run in the background and prevent unauthorized deployments."
  
  # Check if monitor is already running
  monitor_pid=$(ps -ef | grep "deployment-monitor.sh daemon" | grep -v "grep" | awk '{print $2}')
  if [ -n "$monitor_pid" ]; then
    echo -e "${YELLOW}Monitor is already running with PID: $monitor_pid${NC}"
  else
    nohup ./deployment-monitor.sh daemon > /dev/null 2>&1 &
    echo -e "${GREEN}Monitor started with PID: $!${NC}"
  fi
  
  echo ""
  read -p "Press Enter to continue..."
}

# Function to view monitor logs
view_logs() {
  if [ -f "$MONITOR_LOG" ]; then
    echo -e "${YELLOW}Showing last 20 lines of monitor log:${NC}"
    tail -n 20 "$MONITOR_LOG"
  else
    echo -e "${RED}Monitor log file not found.${NC}"
  fi
  
  echo ""
  read -p "Press Enter to continue..."
}

# Function to view configuration
view_config() {
  if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Current configuration:${NC}"
    cat "$CONFIG_FILE"
  else
    echo -e "${RED}Config file not found.${NC}"
  fi
  
  echo ""
  read -p "Press Enter to continue..."
}

# Function to edit configuration
edit_config() {
  if [ -f "$CONFIG_FILE" ]; then
    ${EDITOR:-vi} "$CONFIG_FILE"
  else
    echo -e "${RED}Config file not found. Creating default config...${NC}"
    cat > $CONFIG_FILE <<EOL
# Slider App Deployment Configuration
# Use this file to manage deployment settings

# Set to false to disable automatic deployment
ENABLE_DEPLOYMENT=false

# MongoDB settings
ENABLE_MONGODB=false
MONGO_URI="mongodb://localhost:27017/pokeshowcase"

# Stripe API (set to false to disable Stripe integration)
ENABLE_STRIPE=false
STRIPE_SECRET_KEY="sk_test_REPLACE_WITH_YOUR_SECRET_KEY"

# Email notifications (set to false to disable email functionality)
ENABLE_EMAIL=false
MAIL_USER="your_gmail@gmail.com"
MAIL_PASS="your_gmail_app_password"

# Server ports
BACKEND_PORT=3000
FRONTEND_PORT=5173
EOL
    ${EDITOR:-vi} "$CONFIG_FILE"
  fi
  
  echo ""
  read -p "Press Enter to continue..."
}

# Main loop
while true; do
  show_menu
  read -p "Enter your choice (0-9): " choice
  
  case $choice in
    1) check_status ;;
    2) start_services ;;
    3) stop_services ;;
    4) enable_deployment ;;
    5) disable_deployment ;;
    6) start_monitor ;;
    7) view_logs ;;
    8) view_config ;;
    9) edit_config ;;
    0) 
      echo -e "${GREEN}Exiting...${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid option. Please try again.${NC}"
      sleep 1
      ;;
  esac
done
