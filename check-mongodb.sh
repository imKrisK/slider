#!/bin/bash

# =======================================
# Slider App - MongoDB Health Checker
# =======================================

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

CONFIG_FILE="./deployment.config"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BOLD}        MONGODB HEALTH CHECKER        ${NC}"
echo -e "${BLUE}===============================================${NC}"

# Load MongoDB settings from config
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
  echo -e "${YELLOW}MongoDB settings loaded from config:${NC}"
  echo -e "ENABLE_MONGODB: ${GREEN}$ENABLE_MONGODB${NC}"
  echo -e "MONGO_URI: ${GREEN}$MONGO_URI${NC}"
else
  echo -e "${RED}Error: deployment.config file not found.${NC}"
  ENABLE_MONGODB="true"
  MONGO_URI="mongodb://localhost:27017/pokeshowcase"
  echo -e "${YELLOW}Using default MongoDB configuration:${NC}"
  echo -e "ENABLE_MONGODB: ${GREEN}$ENABLE_MONGODB${NC}"
  echo -e "MONGO_URI: ${GREEN}$MONGO_URI${NC}"
fi

# Check if MongoDB is enabled
if [ "$ENABLE_MONGODB" != "true" ]; then
  echo -e "${YELLOW}MongoDB is disabled in configuration. Enable it first.${NC}"
  exit 1
fi

# Check if MongoDB is installed
if ! command -v mongosh &> /dev/null; then
  echo -e "${RED}MongoDB shell not found. Please install MongoDB first:${NC}"
  echo -e "${YELLOW}brew install mongodb-community${NC}"
  exit 1
fi

# Check if MongoDB process is running
if ! pgrep -x mongod > /dev/null; then
  echo -e "${RED}MongoDB service is not running.${NC}"
  echo -e "${YELLOW}Starting MongoDB...${NC}"
  brew services start mongodb-community 2>/dev/null
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}MongoDB service started successfully.${NC}"
  else
    echo -e "${RED}Failed to start MongoDB. Try starting it manually:${NC}"
    echo -e "${YELLOW}brew services start mongodb-community${NC}"
    exit 1
  fi
  # Give MongoDB time to start
  sleep 3
fi

# Check if MongoDB is accepting connections
echo -e "${YELLOW}Testing MongoDB connection...${NC}"
if mongosh --eval "db.serverStatus()" --quiet &> /dev/null; then
  echo -e "${GREEN}✓ MongoDB connection successful${NC}"
  
  # Extract database name from URI
  DB_NAME=$(echo "$MONGO_URI" | sed -E 's/.*\/([^/]+)$/\1/')
  
  # Check if database exists
  DB_EXISTS=$(mongosh --eval "db.adminCommand('listDatabases').databases.map(function(db) { return db.name; }).indexOf('$DB_NAME') !== -1" --quiet)
  
  if [ "$DB_EXISTS" == "true" ]; then
    echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"
    
    # Get collection count
    COLLECTION_COUNT=$(mongosh "$DB_NAME" --eval "db.getCollectionNames().length" --quiet)
    echo -e "${GREEN}✓ Database has $COLLECTION_COUNT collections${NC}"
    
    # Check if collections have data
    if [ "$COLLECTION_COUNT" -gt 0 ]; then
      echo -e "${GREEN}✓ Database appears to be properly set up${NC}"
    else
      echo -e "${YELLOW}! No collections found. Database might be empty.${NC}"
    fi
  else
    echo -e "${YELLOW}! Database '$DB_NAME' does not exist yet. It will be created when the app first runs.${NC}"
  fi
else
  echo -e "${RED}✗ MongoDB connection failed${NC}"
  echo -e "${YELLOW}Possible reasons:${NC}"
  echo -e "  1. MongoDB service is not running properly"
  echo -e "  2. MongoDB authentication is required but not configured"
  echo -e "  3. Network or firewall issues blocking connections"
  echo -e "${YELLOW}Try manually verifying the connection:${NC}"
  echo -e "  mongosh $MONGO_URI"
  exit 1
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}MongoDB health check completed successfully.${NC}"
echo -e "${BLUE}===============================================${NC}"
