# Slider App

A modern web application for streaming, showcasing, and selling collectible items.

## Quick Start

For the fastest way to get started:

```bash
./setup-assistant.sh
```

This tool will check your system, install dependencies, and configure the application automatically.

Then start the application:

```bash
./quick-start.sh
```

## Manual Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- MongoDB (v5.0 or higher)

### Installing Dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Startup Options

The application provides multiple ways to start depending on your needs:

1. **Quick Start (Recommended)**: `./quick-start.sh`
   - Temporarily enables deployment for your session
   - Automatically restores security settings when closed

2. **Direct Start (Development)**: `./direct-start.sh`
   - Bypasses all security controls
   - Useful for development and debugging

3. **Status Check**: `./check-status.sh`
   - Shows the current status of all application components
   - Useful for troubleshooting

## Quick Launch Options

The Slider app provides several convenient ways to launch:

### Interactive Launcher

```bash
./slider.sh
```

This provides an interactive menu with options to:
- Start the application
- Check application status
- Run the setup assistant
- Open the application in a browser

### Desktop Shortcut

Double-click the `Slider Launcher.command` file to open the application in a new terminal window.

### Shell Aliases

Set up shell aliases for quick access from anywhere:

```bash
./setup-aliases.sh
```

This will add convenient commands like:
- `slider` - Launch the interactive menu
- `slider-start` - Start the application
- `slider-stop` - Stop all servers

### System-wide Access

A symbolic link is also available at `/usr/local/bin/slider` so you can start the application from anywhere by simply typing `slider`.

## Database Setup

This application requires MongoDB to be running. The default connection URL is:
`mongodb://localhost:27017/pokeshowcase`

To verify your MongoDB connection is working:

```bash
./db-check.sh
```

## Running the Application

### Quick Start (Recommended)

The simplest way to start the application is to use the quick start script:

```bash
./quick-start.sh
```

This script will:
1. Temporarily enable deployment for your session
2. Start both backend and frontend servers
3. Restore the secure configuration when you exit

### Direct Start (No Safeguards)

If you want to bypass all safeguards and start the application directly:

```bash
./direct-start.sh
```

This script launches the application with no security barriers, suitable for local development.

### Development Mode

If you prefer the original development mode with all necessary configurations:

```bash
./dev-mode.sh
```

This script will:
1. Create a temporary development configuration
2. Start the backend server (http://localhost:3000)
3. Start the frontend server (http://localhost:5173)
4. Restore the original protected configuration when exited

### Manual Configuration

If you prefer to run services individually:

1. Edit `deployment.config` and set `ENABLE_DEPLOYMENT=true` (already set in current version)
2. Run the backend: `cd backend && npm run dev`
3. Run the frontend: `cd frontend && npm run dev`

## API Configuration

The frontend is configured to use environment variables for API endpoints. In development mode, these are set to connect to the local backend server.

### Environment Files

- `.env.development` - Used during development
- `.env.production` - Used during production builds

## Troubleshooting

If you encounter issues with the application, try these steps:

### MongoDB Connection Issues

1. Check if MongoDB is running:
   ```bash
   ./check-mongodb.sh
   ```

2. Manually start MongoDB:
   ```bash
   brew services start mongodb-community
   ```

### Application Not Starting

1. Check the deployment configuration:
   ```bash
   cat deployment.config
   ```
   Ensure `ENABLE_DEPLOYMENT=true` is set.

2. Verify service status:
   ```bash
   ./check-status.sh
   ```

3. Run the setup assistant:
   ```bash
   ./setup-assistant.sh
   ```

4. Check the logs:
   ```bash
   cat backend.log
   cat frontend.log
   ```

### Security Controls

The application implements several security measures to prevent accidental deployments:

1. **Deployment Flag**: Controls whether the application can start
2. **Safeguard Script**: Validates security settings before startup
3. **Configuration Validation**: Checks for proper security setup

These security controls are intended for production environments. For local development:

- Use `./quick-start.sh` to temporarily bypass security
- Use `./direct-start.sh` for development without any security checks
- Or manually edit `deployment.config` and set `ENABLE_DEPLOYMENT=true`

## Health Monitoring

The application includes a health endpoint at `/health` to monitor service status:

```bash
curl http://localhost:3000/health
```

This returns information about:
- Backend service status
- MongoDB connection status
- Deployment configuration
- System uptime

## Security Notice

The application includes safeguards to prevent accidental deployment to production environments. For local development, you can safely use:
- `quick-start.sh` - Temporarily enables the application with automatic restoration of security settings
- `direct-start.sh` - Bypasses security for local development
- `dev-mode.sh` - Development mode with temporary configuration

In production environments, always leave `ENABLE_DEPLOYMENT=false` in the deployment.config when not actively deploying to prevent unauthorized access.
