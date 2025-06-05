#!/bin/bash

# =======================================
# Slider App Startup Safeguard
# =======================================

CONFIG_FILE="$(dirname "$0")/../deployment.config"
# If running from the backend directory, use parent directory
if [[ $(dirname "$0") == "." && -f "../deployment.config" ]]; then
    CONFIG_FILE="../deployment.config"
fi
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}${BOLD}SLIDER APP STARTUP SAFEGUARD${NC}"
echo -e "Checking deployment configuration..."

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  echo -e "${RED}Deployment will be prevented for security reasons.${NC}"
  exit 1
fi

# Load configuration
source $CONFIG_FILE

# Always check if deployment is enabled and block if not
if [ "$ENABLE_DEPLOYMENT" != "true" ]; then
  echo -e "${RED}${BOLD}DEPLOYMENT BLOCKED: Deployment is disabled in configuration.${NC}"
  echo -e "To enable the application, you can:"
  echo -e "1. Run ${YELLOW}./quick-start.sh${NC} (recommended for local development)"
  echo -e "2. Run ${YELLOW}./direct-start.sh${NC} (bypasses all safeguards)"  
  echo -e "3. Update $CONFIG_FILE and set ENABLE_DEPLOYMENT=true"
  echo -e "4. Run ./slider-control.sh and select 'Enable Deployment' option"
  exit 1
fi

# If we get here, deployment is enabled
echo -e "${GREEN}Deployment is enabled.${NC}"
echo -e "${YELLOW}Starting requested service...${NC}"
exec "$@"
