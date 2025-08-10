// API Configuration for WhatsApp Frontend
const API_CONFIG = {
  // Production backend URL from Render
  BASE_URL: process.env.REACT_APP_API_URL || 'https://whatsapp-backend-tsoe.onrender.com',
  
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
  
  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },
  
  post: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }
};

export default API_CONFIG;
