#!/bin/bash

# =======================================
# Slider App Master Control Script
# =======================================

CONFIG_FILE="./deployment.config"
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  echo -e "Creating a default configuration with deployment disabled..."
  cat > $CONFIG_FILE <<EOL
# Slider App Deployment Configuration
# Use this file to manage deployment settings

# Set to false to disable automatic deployment
ENABLE_DEPLOYMENT=false

# MongoDB settings
ENABLE_MONGODB=true
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
  echo -e "${GREEN}Default configuration created with deployment disabled.${NC}"
fi

# Load configuration
source $CONFIG_FILE

# Make sure the deployment setting is respected
# Force override if needed
if [ "$1" == "--force-disable" ]; then
  # Update the config file to disable deployment
  sed -i '' 's/ENABLE_DEPLOYMENT=true/ENABLE_DEPLOYMENT=false/g' $CONFIG_FILE
  ENABLE_DEPLOYMENT="false"
  echo -e "${RED}${BOLD}Deployment forcibly disabled via command line flag.${NC}"
fi

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}      SLIDER APP MASTER CONTROL SCRIPT       ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Display current status
if [ "$ENABLE_DEPLOYMENT" == "true" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Deployment is currently ${GREEN}ENABLED${NC}"
else
  echo -e "${GREEN}✅ Deployment is currently ${RED}DISABLED${NC}"
fi

echo ""
echo -e "${YELLOW}Available options:${NC}"
echo -e "  1. ${BOLD}Status${NC} - Check service status"
echo -e "  2. ${BOLD}Stop All${NC} - Stop all services"
echo -e "  3. ${BOLD}Disable Deployment${NC} - Update config to disable deployment"
echo -e "  4. ${BOLD}Enable Deployment${NC} - Update config to enable deployment"
echo -e "  5. ${BOLD}Start Services${NC} - Attempt to start services"
echo -e "  6. ${BOLD}Exit${NC}"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
  1)
    echo "Checking status..."
    ./deployment-status.sh
    ;;
  2)
    echo "Stopping all services..."
    ./manage-deployment.sh stop
    ;;
  3)
    echo "Disabling deployment..."
    sed -i '' 's/ENABLE_DEPLOYMENT=true/ENABLE_DEPLOYMENT=false/g' $CONFIG_FILE
    echo -e "${GREEN}✅ Deployment has been disabled in configuration.${NC}"
    ;;
  4)
    echo -e "${YELLOW}⚠️  Warning: This will enable deployment of the application.${NC}"
    read -p "Are you sure you want to enable deployment? (y/N): " confirm
    if [[ $confirm == [Yy]* ]]; then
      sed -i '' 's/ENABLE_DEPLOYMENT=false/ENABLE_DEPLOYMENT=true/g' $CONFIG_FILE
      echo -e "${YELLOW}⚠️  Deployment has been enabled in configuration.${NC}"
    else
      echo "Operation cancelled. Deployment remains disabled."
    fi
    ;;
  5)
    if [ "$ENABLE_DEPLOYMENT" == "true" ]; then
      echo "Starting services..."
      ./manage-deployment.sh start
    else
      echo -e "${RED}Cannot start services: Deployment is disabled in configuration.${NC}"
      echo -e "To enable deployment, run this script again and select option 4."
    fi
    ;;
  6)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid option. Exiting.${NC}"
    exit 1
    ;;
esac

exit 0
