import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { getAuthHeaders } from './utils/auth'

// Intercept all fetch requests to inject authentication headers for /api/ routes
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.includes('/api/')) {
    config = config || {};
    
    // Skip adding auth headers for the login route itself
    if (!resource.includes('/api/auth/login')) {
      let finalHeaders = getAuthHeaders();
      
      if (config.headers) {
        if (config.headers instanceof Headers) {
          const headersObj = {};
          config.headers.forEach((value, key) => { headersObj[key] = value });
          finalHeaders = { ...finalHeaders, ...headersObj };
        } else {
          finalHeaders = { ...finalHeaders, ...config.headers };
        }
      }
      
      config.headers = finalHeaders;
    }
  }
  
  return originalFetch(resource, config);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
