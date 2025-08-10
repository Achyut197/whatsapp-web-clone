// API Configuration for WhatsApp Frontend
const API_CONFIG = {
  // ✅ Use VITE environment variables
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-backend-tsoe.onrender.com',
  
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    CONVERSATIONS: '/api/conversations',
    MESSAGES: '/api/messages',
    CONTACTS: '/api/contacts',
    SEND_MESSAGE: '/api/messages/send'
  },
  
  // Request configuration
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const apiClient = {
  baseURL: API_CONFIG.BASE_URL,
  
  get: async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      console.log(`🌐 API GET: ${API_CONFIG.BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      console.error('API GET Error:', error);
      throw error;
    }
  },
  
  post: async (endpoint, data, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      console.log(`🌐 API POST: ${API_CONFIG.BASE_URL}${endpoint}`, data);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      console.error('API POST Error:', error);
      throw error;
    }
  }
};

// Debug function to check environment variables
export const debugEnvVars = () => {
  console.log('🐛 Environment Variables:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  });
  
  console.log('🔗 API Configuration:', {
    baseURL: API_CONFIG.BASE_URL,
    endpoints: API_CONFIG.ENDPOINTS,
    timeout: API_CONFIG.TIMEOUT
  });
};

export default API_CONFIG;
