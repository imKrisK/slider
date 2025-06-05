#!/bin/bash

# =======================================
# Slider App Auto Start Script
# =======================================
# This script automatically enables the application
# for local development while preserving production
# safeguards when shutting down

CONFIG_FILE="./deployment.config"
CONFIG_BACKUP="./deployment.config.bak"
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        SLIDER APP AUTO START        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  exit 1
fi

# Function to restore original config when script exits
cleanup() {
  echo -e "\n${YELLOW}Cleaning up and restoring secure configuration...${NC}"
  if [ -f "$CONFIG_BACKUP" ]; then
    cp "$CONFIG_BACKUP" "$CONFIG_FILE"
    rm "$CONFIG_BACKUP"
    echo -e "${GREEN}Secure configuration restored.${NC}"
  fi
  
  # Kill any running processes
  ./stop-servers.sh
  
  echo -e "${GREEN}Cleanup completed.${NC}"
}

# Register cleanup function to run on script exit
trap cleanup EXIT INT TERM

# Backup original config
cp "$CONFIG_FILE" "$CONFIG_BACKUP"
echo -e "${GREEN}Configuration backed up.${NC}"

# Create development configuration
cat > "$CONFIG_FILE" <<EOL
# Slider App Auto-Generated Configuration
# DEVELOPMENT MODE - DO NOT USE IN PRODUCTION

# Enable deployment for local development
ENABLE_DEPLOYMENT=true

# MongoDB settings
ENABLE_MONGODB=true
MONGO_URI="mongodb://localhost:27017/pokeshowcase"

# Stripe API (disabled for development)
ENABLE_STRIPE=false
STRIPE_SECRET_KEY="sk_test_REPLACE_WITH_YOUR_SECRET_KEY"

# Email notifications (disabled for development)
ENABLE_EMAIL=false
MAIL_USER="your_gmail@gmail.com"
MAIL_PASS="your_gmail_app_password"

# Server ports
BACKEND_PORT=3000
FRONTEND_PORT=5173
EOL

echo -e "${GREEN}Development configuration created.${NC}"
echo -e "${YELLOW}Starting application in development mode...${NC}"

# Check if MongoDB is installed and running
if ! pgrep -x mongod > /dev/null; then
  echo -e "${YELLOW}MongoDB is not running. Attempting to start...${NC}"
  brew services start mongodb-community 2>/dev/null || echo -e "${RED}Failed to start MongoDB. Please start it manually.${NC}"
  sleep 3
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}Starting backend server...${NC}"

# Start backend server in the background
cd backend
npm run start:unsafe > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to initialize
sleep 2

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
  echo -e "${GREEN}Backend server running on http://localhost:3000${NC}"
else
  echo -e "${RED}Backend server failed to start. Check backend.log for details.${NC}"
  exit 1
fi

echo -e "${YELLOW}Starting frontend server...${NC}"

# Start frontend server in the background
cd frontend
npm run dev:unsafe > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to initialize
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
  echo -e "${GREEN}Frontend server running on http://localhost:5173${NC}"
else
  echo -e "${RED}Frontend server failed to start. Check frontend.log for details.${NC}"
  exit 1
fi

echo -e "${GREEN}Application started successfully!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}Open your browser to: ${GREEN}http://localhost:5173${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the application and restore secure configuration.${NC}"
echo -e "${BLUE}===============================================${NC}"

# Keep the script running to ensure cleanup occurs on exit
while true; do
  sleep 1
done
