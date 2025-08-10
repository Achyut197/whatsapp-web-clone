const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://whatsapp-backend-tsoe.onrender.com',
  ENDPOINTS: {
    HEALTH: '/health',
    CONVERSATIONS: '/api/conversations',
    MESSAGES: '/api/messages',
    CONTACTS: '/api/contacts',
    SEND_MESSAGE: '/api/messages/send'
  },
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const apiClient = {
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
      
      const data = await response.json();
      
      // ✅ Enhanced error handling for data structure
      if (!data.success) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      console.error('API GET Error:', error);
      throw error;
    }
  },
  
  post: async (endpoint, requestData, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      console.log(`🌐 API POST: ${API_CONFIG.BASE_URL}${endpoint}`, requestData);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(requestData),
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // ✅ Enhanced error handling
      if (!data.success) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
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

export default API_CONFIG;
