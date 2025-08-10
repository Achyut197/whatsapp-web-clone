// API Configuration for different environments
const getApiBaseUrl = () => {
  // Check if we're in production
  if (import.meta.env.PROD) {
    // Use environment variable or fallback to your production backend URL
    return import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-backend-xxxx.onrender.com';
  }
  
  // Development environment
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints configuration
export const API_ENDPOINTS = {
  // Health check
  HEALTH: `${API_BASE_URL}/health`,
  
  // Main API endpoints
  CONVERSATIONS: `${API_BASE_URL}/api/conversations`,
  MESSAGES: (waId) => `${API_BASE_URL}/api/messages/${waId}`,
  SEND_MESSAGE: `${API_BASE_URL}/api/send`,
  ADD_CONTACT: `${API_BASE_URL}/api/add-contact`,
  MARK_READ: (waId) => `${API_BASE_URL}/api/mark-read/${waId}`,
};

// API utility function
export const apiRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for CORS
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export default API_BASE_URL;
