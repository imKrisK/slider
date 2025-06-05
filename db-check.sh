#!/bin/bash

# =======================================
# Slider App - MongoDB Connection Checker
# =======================================

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}     MONGODB CONNECTION VERIFICATION TOOL     ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e ""

# Load MongoDB connection URI from config
CONFIG_FILE="./deployment.config"
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
  echo -e "${GREEN}Configuration loaded successfully.${NC}"
  echo -e "MongoDB URI: ${MONGO_URI}"
else
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  MONGO_URI="mongodb://localhost:27017/pokeshowcase"
  echo -e "${YELLOW}Using default MongoDB URI: ${MONGO_URI}${NC}"
fi

# Extract host and port from URI
if [[ $MONGO_URI =~ mongodb://([^:/]+)(:([0-9]+))? ]]; then
  DB_HOST=${BASH_REMATCH[1]}
  DB_PORT=${BASH_REMATCH[3]:-27017}
else
  DB_HOST="localhost"
  DB_PORT="27017"
  echo -e "${YELLOW}Could not parse MongoDB URI, using default host: ${DB_HOST} and port: ${DB_PORT}${NC}"
fi

echo -e "\n${YELLOW}Checking MongoDB connection:${NC}"

# Check if MongoDB is installed
if ! command -v mongosh &> /dev/null; then
  echo -e "${RED}MongoDB shell (mongosh) not found. Please install MongoDB tools.${NC}"
  echo -e "${YELLOW}You can install MongoDB tools with: brew install mongodb/brew/mongodb-database-tools${NC}"
else
  echo -e "${GREEN}MongoDB shell found.${NC}"
fi

# Check if MongoDB service is running
echo -e "\n${YELLOW}Checking if MongoDB service is running...${NC}"
if pgrep -x mongod > /dev/null; then
  echo -e "${GREEN}✅ MongoDB service is running.${NC}"
else
  echo -e "${RED}❌ MongoDB service is not running.${NC}"
  echo -e "${YELLOW}Starting MongoDB service...${NC}"
  brew services start mongodb-community 2>/dev/null || echo -e "${RED}Failed to start MongoDB service.${NC}"
  sleep 3
  if pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✅ MongoDB service started successfully.${NC}"
  else
    echo -e "${RED}❌ Could not start MongoDB service.${NC}"
  fi
fi

# Check network connectivity to MongoDB
echo -e "\n${YELLOW}Testing network connectivity to MongoDB (${DB_HOST}:${DB_PORT})...${NC}"
if nc -z -w5 $DB_HOST $DB_PORT 2>/dev/null; then
  echo -e "${GREEN}✅ Network connectivity to MongoDB is OK.${NC}"
else
  echo -e "${RED}❌ Cannot connect to MongoDB at ${DB_HOST}:${DB_PORT}.${NC}"
  echo -e "${YELLOW}Possible issues:${NC}"
  echo -e "  1. MongoDB is not running on the specified host/port"
  echo -e "  2. A firewall is blocking the connection"
  echo -e "  3. The host or port in the connection string is incorrect"
fi

# Try using mongosh to test connection
echo -e "\n${YELLOW}Testing actual MongoDB connection...${NC}"

MONGO_TEST_RESULT=1  # Default to failure

if command -v mongosh &> /dev/null; then
  echo -e "${GREEN}Using mongosh for connection test...${NC}"
  # Using mongosh for a quick connection test
  MONGOSH_OUTPUT=$(mongosh "$MONGO_URI" --eval "db.runCommand({ping: 1})" --quiet 2>/dev/null)
  
  if [[ "$MONGOSH_OUTPUT" == *"ok : 1"* ]]; then
    echo -e "${GREEN}✅ MongoDB connection test passed using mongosh.${NC}"
    MONGO_TEST_RESULT=0
  else
    echo -e "${RED}❌ MongoDB connection test failed using mongosh.${NC}"
  fi
else
  echo -e "${YELLOW}mongosh not found, testing connection another way...${NC}"
  
  # Try basic connection with mongo client (older version)
  if command -v mongo &> /dev/null; then
    echo -e "${GREEN}Using mongo client for connection test...${NC}"
    mongo "$MONGO_URI" --eval "printjson(db.serverStatus())" > /dev/null 2>&1
    MONGO_TEST_RESULT=$?
    
    if [ $MONGO_TEST_RESULT -eq 0 ]; then
      echo -e "${GREEN}✅ MongoDB connection test passed using mongo client.${NC}"
    else
      echo -e "${RED}❌ MongoDB connection test failed using mongo client.${NC}"
    fi
  else
    # As a last resort, try a direct TCP connection to verify the port is open
    echo -e "${YELLOW}No MongoDB client found, testing direct TCP connection...${NC}"
    nc -z -w5 $DB_HOST $DB_PORT
    MONGO_TEST_RESULT=$?
    
    if [ $MONGO_TEST_RESULT -eq 0 ]; then
      echo -e "${GREEN}✅ MongoDB port is accessible (basic connectivity).${NC}"
      echo -e "${YELLOW}Warning: Could only verify that the MongoDB port is open.${NC}"
      echo -e "${YELLOW}Install mongosh for a complete connection test.${NC}"
    else
      echo -e "${RED}❌ MongoDB port is not accessible.${NC}"
    fi
  fi
fi

if [ $MONGO_TEST_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}✅ MongoDB connection test passed!${NC}"
else
  echo -e "\n${RED}❌ MongoDB connection test failed.${NC}"
  echo -e "${YELLOW}Possible solutions:${NC}"
  echo -e "  1. Make sure MongoDB is installed and running"
  echo -e "  2. Check MongoDB connection string in deployment.config"
  echo -e "  3. Try restarting the MongoDB service with: brew services restart mongodb-community"
  echo -e "  4. Check MongoDB logs with: brew services info mongodb-community"
fi

# Check test result
if [ $NODE_TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ MongoDB connection test passed.${NC}"
else
  echo -e "${RED}❌ MongoDB connection test failed.${NC}"
  echo -e "${YELLOW}Possible solutions:${NC}"
  echo -e "  1. Make sure MongoDB is installed and running"
  echo -e "  2. Check MongoDB connection string in deployment.config"
  echo -e "  3. Try restarting the MongoDB service with: brew services restart mongodb-community"
  echo -e "  4. Check MongoDB logs with: brew services info mongodb-community"
fi

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BOLD}            CONNECTION TEST COMPLETED           ${NC}"
echo -e "${BLUE}===============================================${NC}"
