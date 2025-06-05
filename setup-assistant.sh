#!/bin/bash

# =======================================
# Slider App - Setup Assistant
# =======================================
# This script helps diagnose and fix common issues with the Slider app

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP SETUP ASSISTANT        ${NC}"
echo -e "${BLUE}===============================================${NC}"

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"

# Step 1: Check if all required scripts exist
echo -e "${YELLOW}Checking for required scripts...${NC}"
REQUIRED_SCRIPTS=("quick-start.sh" "direct-start.sh" "check-status.sh" "stop-servers.sh" "safeguard.sh")
MISSING_SCRIPTS=0

for script in "${REQUIRED_SCRIPTS[@]}"; do
  if [ ! -f "$APP_ROOT/$script" ]; then
    echo -e "${RED}✗ Missing script: $script${NC}"
    MISSING_SCRIPTS=$((MISSING_SCRIPTS+1))
  else
    echo -e "${GREEN}✓ Found script: $script${NC}"
  fi
done

if [ $MISSING_SCRIPTS -gt 0 ]; then
  echo -e "${RED}Error: $MISSING_SCRIPTS required scripts are missing.${NC}"
  exit 1
fi

# Step 2: Make sure all scripts are executable
echo -e "\n${YELLOW}Making sure all scripts are executable...${NC}"
chmod +x $APP_ROOT/*.sh
echo -e "${GREEN}✓ All scripts are now executable${NC}"

# Step 3: Check deployment.config
echo -e "\n${YELLOW}Checking deployment configuration...${NC}"
CONFIG_FILE="$APP_ROOT/deployment.config"

if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
  echo -e "${GREEN}✓ Deployment config found${NC}"
  
  # Check deployment settings
  if [ "$ENABLE_DEPLOYMENT" != "true" ]; then
    echo -e "${RED}! Deployment is disabled (ENABLE_DEPLOYMENT=$ENABLE_DEPLOYMENT)${NC}"
    read -p "Would you like to enable deployment for development? (y/n): " answer
    if [[ $answer == "y" || $answer == "Y" ]]; then
      sed -i '' 's/ENABLE_DEPLOYMENT=false/ENABLE_DEPLOYMENT=true/g' "$CONFIG_FILE"
      echo -e "${GREEN}✓ Deployment enabled${NC}"
    fi
  else
    echo -e "${GREEN}✓ Deployment is enabled${NC}"
  fi
else
  echo -e "${RED}✗ Deployment.config not found${NC}"
  
  # Create a basic config file
  read -p "Create a default configuration file? (y/n): " answer
  if [[ $answer == "y" || $answer == "Y" ]]; then
    cat > "$CONFIG_FILE" << EOF
# Slider App Deployment Configuration
# Use this file to manage deployment settings

# Set to true to enable application startup
# Set to false for production security (prevents accidental deployments)
ENABLE_DEPLOYMENT=true

# MongoDB settings
# Set to false to disable local MongoDB connection
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
EOF
    echo -e "${GREEN}✓ Default configuration created${NC}"
  fi
fi

# Step 4: Check MongoDB
echo -e "\n${YELLOW}Checking MongoDB...${NC}"
if command -v mongosh &> /dev/null; then
  echo -e "${GREEN}✓ MongoDB shell is installed${NC}"
  
  if pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✓ MongoDB service is running${NC}"
  else
    echo -e "${RED}✗ MongoDB service is not running${NC}"
    echo -e "${YELLOW}Attempting to start MongoDB...${NC}"
    brew services start mongodb-community 2>/dev/null
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ MongoDB started successfully${NC}"
    else
      echo -e "${RED}Failed to start MongoDB automatically. Try running:${NC}"
      echo -e "${YELLOW}brew services start mongodb-community${NC}"
    fi
  fi
else
  echo -e "${RED}✗ MongoDB shell (mongosh) not found${NC}"
  echo -e "MongoDB needs to be installed. Would you like to install it?"
  read -p "Install MongoDB using Homebrew? (y/n): " answer
  if [[ $answer == "y" || $answer == "Y" ]]; then
    brew install mongodb-community
    brew services start mongodb-community
    echo -e "${GREEN}MongoDB installed and started${NC}"
  else
    echo -e "${YELLOW}MongoDB installation skipped. The app may not work correctly.${NC}"
  fi
fi

# Step 5: Check Node.js and npm
echo -e "\n${YELLOW}Checking Node.js and npm...${NC}"
if command -v node &> /dev/null && command -v npm &> /dev/null; then
  NODE_VERSION=$(node -v)
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}✓ Node.js $NODE_VERSION and npm $NPM_VERSION are installed${NC}"
else
  echo -e "${RED}✗ Node.js or npm is not installed${NC}"
  echo -e "${YELLOW}Please install Node.js and npm to continue.${NC}"
  exit 1
fi

# Step 6: Check backend dependencies
echo -e "\n${YELLOW}Checking backend dependencies...${NC}"
if [ -f "$BACKEND_DIR/package.json" ]; then
  echo -e "${GREEN}✓ Backend package.json found${NC}"
  
  # Check if node_modules exists
  if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${RED}✗ Backend node_modules not found${NC}"
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd "$BACKEND_DIR" && npm install
    cd "$APP_ROOT"
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
  else
    echo -e "${GREEN}✓ Backend node_modules found${NC}"
  fi
else
  echo -e "${RED}✗ Backend package.json not found${NC}"
  exit 1
fi

# Step 7: Check frontend dependencies
echo -e "\n${YELLOW}Checking frontend dependencies...${NC}"
if [ -f "$FRONTEND_DIR/package.json" ]; then
  echo -e "${GREEN}✓ Frontend package.json found${NC}"
  
  # Check if node_modules exists
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}✗ Frontend node_modules not found${NC}"
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install
    cd "$APP_ROOT"
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
  else
    echo -e "${GREEN}✓ Frontend node_modules found${NC}"
  fi
else
  echo -e "${RED}✗ Frontend package.json not found${NC}"
  exit 1
fi

# Step 8: Check if health endpoint exists
echo -e "\n${YELLOW}Checking if health endpoint exists...${NC}"
HEALTH_ENDPOINT_CHECK=$(grep -n "/health" "$BACKEND_DIR/server.js")
if [ -z "$HEALTH_ENDPOINT_CHECK" ]; then
  echo -e "${RED}✗ Health endpoint not found in server.js${NC}"
  echo -e "${YELLOW}Would you like to add a health endpoint? (Recommended)${NC}"
  read -p "Add health endpoint? (y/n): " answer
  if [[ $answer == "y" || $answer == "Y" ]]; then
    # Find a good insertion point after the cors middleware setup
    INSERTION_LINE=$(grep -n "app.use(cors" "$BACKEND_DIR/server.js" | cut -d: -f1)
    INSERTION_LINE=$((INSERTION_LINE + 2))
    
    # Create a temporary file with the health endpoint
    TEMP_FILE=$(mktemp)
    sed "${INSERTION_LINE}i\\
// Health check endpoint for monitoring and status checks\\
app.get('/health', (req, res) => {\\
  res.status(200).json({\\
    status: 'UP',\\
    timestamp: new Date().toISOString(),\\
    version: '1.0.0',\\
    deployment: deploymentConfig.ENABLE_DEPLOYMENT === 'true',\\
    mongodb: deploymentConfig.ENABLE_MONGODB === 'true',\\
    uptime: process.uptime()\\
  });\\
});" "$BACKEND_DIR/server.js" > "$TEMP_FILE"
    
    mv "$TEMP_FILE" "$BACKEND_DIR/server.js"
    echo -e "${GREEN}✓ Health endpoint added${NC}"
  fi
else
  echo -e "${GREEN}✓ Health endpoint found on line $(echo $HEALTH_ENDPOINT_CHECK | cut -d: -f1)${NC}"
fi

# Step 9: Check uploads directory
echo -e "\n${YELLOW}Checking uploads directory...${NC}"
UPLOADS_DIR="$BACKEND_DIR/uploads"
if [ ! -d "$UPLOADS_DIR" ]; then
  echo -e "${RED}✗ Uploads directory not found${NC}"
  echo -e "${YELLOW}Creating uploads directory...${NC}"
  mkdir -p "$UPLOADS_DIR"
  chmod 755 "$UPLOADS_DIR"
  echo -e "${GREEN}✓ Uploads directory created${NC}"
else
  echo -e "${GREEN}✓ Uploads directory exists${NC}"
fi

echo -e "\n${GREEN}${BOLD}Setup checks completed!${NC}"
echo -e "${GREEN}Your Slider application should now be ready to run.${NC}"
echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BOLD}        STARTUP OPTIONS        ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Quick Start (recommended):${NC}"
echo -e "./quick-start.sh"
echo -e "\n${GREEN}Direct Start (bypasses safeguards):${NC}"
echo -e "./direct-start.sh"
echo -e "\n${GREEN}Check Status:${NC}"
echo -e "./check-status.sh"
echo -e "${BLUE}===============================================${NC}"
