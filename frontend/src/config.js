// Environment configuration for frontend app
const API_CONFIG = {
  // The base URL for the backend API
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // The WebSocket URL for real-time communication
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  
  // Feature flags
  FEATURES: {
    PAYMENTS_ENABLED: import.meta.env.VITE_PAYMENTS_ENABLED !== 'false',
    STREAMING_ENABLED: import.meta.env.VITE_STREAMING_ENABLED !== 'false',
    EMAIL_NOTIFICATIONS: import.meta.env.VITE_EMAIL_NOTIFICATIONS !== 'false'
  }
};

export default API_CONFIG;
