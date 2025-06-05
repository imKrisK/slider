#!/bin/bash

# =======================================
# Slider App - Shell Aliases Setup
# =======================================
# This script sets up convenient aliases for running the Slider app

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP SHELL ALIASES SETUP        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Get the current directory
CURRENT_DIR=$(pwd)

# Create aliases for .zshrc
cat << EOF
# Add the following lines to your ~/.zshrc file:

# Slider App Aliases
alias slider-start='cd ${CURRENT_DIR} && ./quick-start.sh'
alias slider-dev='cd ${CURRENT_DIR} && ./dev-mode.sh'
alias slider-direct='cd ${CURRENT_DIR} && ./direct-start.sh'
alias slider-stop='cd ${CURRENT_DIR} && ./stop-servers.sh'
alias slider-db='cd ${CURRENT_DIR} && ./db-check.sh'
alias slider-fix='cd ${CURRENT_DIR} && ./fix-dependencies.sh'

EOF

echo -e "${YELLOW}Would you like to add these aliases to your ~/.zshrc file? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
  cat << EOF >> ~/.zshrc

# Slider App Aliases (added $(date))
alias slider='cd ${CURRENT_DIR} && ./slider.sh'
alias slider-start='cd ${CURRENT_DIR} && ./quick-start.sh'
alias slider-dev='cd ${CURRENT_DIR} && ./dev-mode.sh'
alias slider-direct='cd ${CURRENT_DIR} && ./direct-start.sh'
alias slider-stop='cd ${CURRENT_DIR} && ./stop-servers.sh'
alias slider-db='cd ${CURRENT_DIR} && ./db-check.sh'
alias slider-fix='cd ${CURRENT_DIR} && ./fix-dependencies.sh'

EOF
  echo -e "${GREEN}Aliases added to ~/.zshrc${NC}"
  echo -e "${YELLOW}To use the aliases immediately, run:${NC} source ~/.zshrc"
else
  echo -e "${YELLOW}No changes made to ~/.zshrc${NC}"
  echo -e "${YELLOW}You can add the aliases manually if desired.${NC}"
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        ALIAS COMMANDS AVAILABLE        ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}slider-start${NC}  - Start the application (quick mode)"
echo -e "${GREEN}slider-dev${NC}    - Start in development mode"
echo -e "${GREEN}slider-direct${NC} - Start with no safeguards"
echo -e "${GREEN}slider-stop${NC}   - Stop all running servers"
echo -e "${GREEN}slider-db${NC}     - Check database connection"
echo -e "${GREEN}slider-fix${NC}    - Fix dependency issues"
echo -e "${BLUE}===============================================${NC}"
