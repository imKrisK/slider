#!/bin/bash

# =======================================
# Slider App - Dependency Checker & Fixer
# =======================================

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}     SLIDER APP DEPENDENCY CHECKER & FIXER     ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e ""

# Check backend dependencies
echo -e "${YELLOW}Checking backend dependencies...${NC}"
cd backend
if [ -f "package.json" ]; then
  echo -e "${GREEN}Backend package.json found.${NC}"
  
  # Check if node_modules exists and has content
  if [ -d "node_modules" ] && [ "$(ls -A node_modules)" ]; then
    echo -e "${GREEN}Backend node_modules found.${NC}"
  else
    echo -e "${YELLOW}Backend node_modules not found or empty. Installing dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Backend dependencies installed successfully.${NC}"
    else
      echo -e "${RED}Error installing backend dependencies.${NC}"
    fi
  fi
else
  echo -e "${RED}Backend package.json not found.${NC}"
fi
cd ..

# Check frontend dependencies
echo -e "\n${YELLOW}Checking frontend dependencies...${NC}"
cd frontend
if [ -f "package.json" ]; then
  echo -e "${GREEN}Frontend package.json found.${NC}"
  
  # Check if node_modules exists and has content
  if [ -d "node_modules" ] && [ "$(ls -A node_modules)" ]; then
    echo -e "${GREEN}Frontend node_modules found.${NC}"
    
    # Check for package.json corruption issues
    echo -e "${YELLOW}Checking for package.json corruption issues...${NC}"
    find ./node_modules -name "package.json" -type f -exec cat {} \; -exec echo "" \; 2>/dev/null | grep -q "}"
    if [ $? -ne 0 ]; then
      echo -e "${RED}Found potentially corrupted package.json files in node_modules.${NC}"
      echo -e "${YELLOW}Attempting to fix by reinstalling dependencies...${NC}"
      rm -rf node_modules
      npm cache clean --force
      npm install
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}Frontend dependencies reinstalled successfully.${NC}"
      else
        echo -e "${RED}Error reinstalling frontend dependencies.${NC}"
      fi
    else
      echo -e "${GREEN}No obvious corruption detected in package.json files.${NC}"
    fi
  else
    echo -e "${YELLOW}Frontend node_modules not found or empty. Installing dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Frontend dependencies installed successfully.${NC}"
    else
      echo -e "${RED}Error installing frontend dependencies.${NC}"
    fi
  fi
else
  echo -e "${RED}Frontend package.json not found.${NC}"
fi
cd ..

echo -e "\n${GREEN}Dependency check complete.${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}     NEXT STEPS:     ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "1. Run ${YELLOW}./dev-mode.sh${NC} to start development servers"
echo -e "2. Open your browser to ${YELLOW}http://localhost:5173${NC}"
echo -e "3. Use ${YELLOW}./db-check.sh${NC} if you encounter database issues"
echo -e "${BLUE}===============================================${NC}"
