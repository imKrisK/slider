#!/bin/bash

# =======================================
# Slider App Deployment Management Script
# =======================================

# Load configuration
CONFIG_FILE="./deployment.config"
source $CONFIG_FILE

# Function to check if a process is running on a specific port
check_port() {
  local port=$1
  lsof -i :$port &>/dev/null
  return $?
}

# Function to start services
start_services() {
  echo "Starting Slider Application services..."
  
  # Check if backend port is already in use
  if check_port $BACKEND_PORT; then
    echo "⚠️  Warning: Port $BACKEND_PORT is already in use. Backend may already be running."
  else
    echo "🚀 Starting backend server on port $BACKEND_PORT..."
    cd backend
    nohup npm start > ../backend.log 2>&1 &
    echo "✅ Backend server started with PID: $!"
    cd ..
  fi
  
  # Check if frontend port is already in use
  if check_port $FRONTEND_PORT; then
    echo "⚠️  Warning: Port $FRONTEND_PORT is already in use. Frontend may already be running."
  else
    echo "🚀 Starting frontend server on port $FRONTEND_PORT..."
    cd frontend
    nohup npm run dev > ../frontend.log 2>&1 &
    echo "✅ Frontend server started with PID: $!"
    cd ..
  fi
  
  echo "📝 Logs are being written to backend.log and frontend.log"
  echo "✨ Slider Application started successfully!"
}

# Function to stop services
stop_services() {
  echo "Stopping Slider Application services..."
  
  # Stop backend server
  backend_pid=$(ps -ef | grep "node.*backend/server.js" | grep -v "grep" | awk '{print $2}')
  if [ -n "$backend_pid" ]; then
    echo "🛑 Stopping backend server (PID: $backend_pid)..."
    kill $backend_pid
    echo "✅ Backend server stopped."
  else
    echo "ℹ️  No backend server process found."
  fi
  
  # Stop frontend Vite server
  vite_pid=$(ps -ef | grep "vite.*frontend" | grep -v "grep" | awk '{print $2}')
  if [ -n "$vite_pid" ]; then
    echo "🛑 Stopping Vite frontend server (PID: $vite_pid)..."
    kill $vite_pid
    echo "✅ Frontend server stopped."
  else
    echo "ℹ️  No Vite frontend server process found."
  fi
  
  # Check for process on specific ports
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    pid=$(lsof -ti :$port)
    if [ -n "$pid" ]; then
      echo "🛑 Found process using port $port (PID: $pid), stopping..."
      kill $pid
      echo "✅ Process on port $port stopped."
    fi
  done
  
  echo "✨ All Slider Application services have been stopped."
}

# Function to check service status
check_status() {
  echo "Checking Slider Application service status..."
  
  # Check backend server
  backend_pid=$(ps -ef | grep "node.*backend/server.js" | grep -v "grep" | awk '{print $2}')
  if [ -n "$backend_pid" ]; then
    echo "✅ Backend server is running (PID: $backend_pid)"
  else
    echo "❌ Backend server is not running"
  fi
  
  # Check frontend Vite server
  vite_pid=$(ps -ef | grep "vite.*frontend" | grep -v "grep" | awk '{print $2}')
  if [ -n "$vite_pid" ]; then
    echo "✅ Frontend server is running (PID: $vite_pid)"
  else
    echo "❌ Frontend server is not running"
  fi
  
  # Check if ports are in use
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    if check_port $port; then
      pid=$(lsof -ti :$port)
      echo "🔌 Port $port is in use by PID: $pid"
    else
      echo "🔌 Port $port is free"
    fi
  done
}

# Main script logic
case "$1" in
  start)
    if [ "$ENABLE_DEPLOYMENT" = "true" ]; then
      start_services
    else
      echo "⚠️  Deployment is disabled in configuration. Set ENABLE_DEPLOYMENT=true in $CONFIG_FILE to enable."
    fi
    ;;
  stop)
    stop_services
    ;;
  restart)
    stop_services
    sleep 2
    if [ "$ENABLE_DEPLOYMENT" = "true" ]; then
      start_services
    else
      echo "⚠️  Deployment is disabled in configuration. Set ENABLE_DEPLOYMENT=true in $CONFIG_FILE to enable."
    fi
    ;;
  status)
    check_status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

exit 0
