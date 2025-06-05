// API request helper utilities with error handling and retry capabilities

import API_CONFIG from './config';

// Default retry options
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second delay between retries
  retryStatusCodes: [408, 429, 500, 502, 503, 504], // Common retry-able status codes
};

/**
 * Enhanced fetch function with retries and better error handling
 * @param {string} endpoint - The API endpoint (without the base URL)
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Options for retrying failed requests
 * @returns {Promise} - Response data
 */
export async function apiFetch(endpoint, options = {}, retryOptions = {}) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
  const retry = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let attempts = 0;
  
  const executeRequest = async () => {
    attempts++;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Check if response is ok or if we should retry
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Determine if we should retry based on status code
        if (
          retry.retryStatusCodes.includes(response.status) && 
          attempts <= retry.maxRetries
        ) {
          console.warn(`Request to ${endpoint} failed (attempt ${attempts}/${retry.maxRetries}). Retrying in ${retry.retryDelay}ms...`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retry.retryDelay));
          return executeRequest();
        }
        
        // If we shouldn't retry or reached max retries, throw error
        throw new Error(
          errorData.message || `API request failed with status: ${response.status}`
        );
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response;
    } catch (error) {
      // Network errors or JSON parsing errors
      if (attempts <= retry.maxRetries) {
        console.warn(`Request to ${endpoint} failed (attempt ${attempts}/${retry.maxRetries}). Retrying in ${retry.retryDelay}ms...`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retry.retryDelay));
        return executeRequest();
      }
      
      throw error;
    }
  };
  
  return executeRequest();
}

/**
 * GET request with error handling
 */
export const apiGet = (endpoint, options = {}, retryOptions = {}) => {
  return apiFetch(endpoint, { ...options, method: 'GET' }, retryOptions);
};

/**
 * POST request with error handling
 */
export const apiPost = (endpoint, data = {}, options = {}, retryOptions = {}) => {
  return apiFetch(
    endpoint, 
    { 
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    },
    retryOptions
  );
};

/**
 * PUT request with error handling
 */
export const apiPut = (endpoint, data = {}, options = {}, retryOptions = {}) => {
  return apiFetch(
    endpoint, 
    { 
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    },
    retryOptions
  );
};

/**
 * DELETE request with error handling
 */
export const apiDelete = (endpoint, options = {}, retryOptions = {}) => {
  return apiFetch(endpoint, { ...options, method: 'DELETE' }, retryOptions);
};
