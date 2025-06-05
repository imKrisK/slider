# Slider Application Deployment Guide

This document provides instructions for managing the deployment of the Slider application.

## Deployment Management

The application comes with a deployment management script that allows you to control whether and how the application is deployed.

### Configuration

All deployment settings are stored in `deployment.config` file in the root directory:

```
# Set to false to disable automatic deployment
ENABLE_DEPLOYMENT=false

# MongoDB settings
ENABLE_MONGODB=true
MONGO_URI=mongodb://localhost:27017/pokeshowcase

# Stripe API (set to false to disable Stripe integration)
ENABLE_STRIPE=false
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_SECRET_KEY

# Email notifications (set to false to disable email functionality)
ENABLE_EMAIL=false
MAIL_USER=your_gmail@gmail.com
MAIL_PASS=your_gmail_app_password

# Server ports
BACKEND_PORT=3000
FRONTEND_PORT=5173
```

### Using the Deployment Management Script

The `manage-deployment.sh` script provides several commands for controlling deployment:

#### Check Status of Services

```bash
./manage-deployment.sh status
```

#### Start Services

```bash
./manage-deployment.sh start
```

Note: This will only start services if `ENABLE_DEPLOYMENT=true` in the configuration file.

#### Stop Services

```bash
./manage-deployment.sh stop
```

#### Restart Services

```bash
./manage-deployment.sh restart
```

### How to Stop/Disable Deployment

There are multiple ways to stop or disable deployment:

1. **Temporarily Stop Running Services**:
   ```bash
   ./manage-deployment.sh stop
   ```

2. **Permanently Disable Deployment**:
   - Edit `deployment.config` and set `ENABLE_DEPLOYMENT=false`
   - This will prevent the server from starting even when explicitly requested

3. **Disable Specific Features**:
   - Set `ENABLE_MONGODB=false` to disable MongoDB connection
   - Set `ENABLE_STRIPE=false` to disable payment processing
   - Set `ENABLE_EMAIL=false` to disable email notifications

4. **Manual Process Termination**:
   ```bash
   # Find processes using ports 3000 (backend) and 5173 (frontend)
   lsof -i :3000
   lsof -i :5173
   
   # Kill processes by PID
   kill <PID>
   ```

## Development vs Production Environment

The default configuration is set up for local development. For production deployment:

1. Update the `.env` file with production credentials
2. Update `deployment.config` with production settings
3. Consider using process managers like PM2 for more robust deployment:
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name "slider-backend"
   cd frontend && pm2 start npm --name "slider-frontend" -- run build
   ```

## Log Files

When started with the deployment script, logs are stored in:
- `backend.log` for the backend server
- `frontend.log` for the frontend server

## Troubleshooting

If you encounter issues with deployment:

1. Check the log files for errors
2. Verify port availability with `lsof -i :<port_number>`
3. Check MongoDB connection if enabled
4. Verify environment variables in `.env` files are correctly set
