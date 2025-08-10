const resolveBaseUrl = () => {
  // Prefer explicit env var first
  const envBase = import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).trim();
  if (envBase) return envBase.replace(/\/$/, '');

  // In dev, default to local backend
  if (import.meta.env.DEV) {
    return 'http://localhost:10000';
  }

  // In production, try same-origin backend, otherwise fallback to known deployment
  try {
    const origin = window.location.origin;
    return origin || 'https://whatsapp-backend-tsoe.onrender.com';
  } catch {
    return 'https://whatsapp-backend-tsoe.onrender.com';
  }
};

const API_CONFIG = {
  BASE_URL: resolveBaseUrl(),
  ENDPOINTS: {
    HEALTH: '/health',
    CONVERSATIONS: '/api/conversations',
    MESSAGES: '/api/messages',
    CONTACTS: '/api/contacts',
    SEND_MESSAGE: '/api/messages/send'
  },
  TIMEOUT: 15000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const debugEnvVars = () => {
  // Safe debug logging for dev
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.table({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '(not set)',
    Resolved_BASE_URL: API_CONFIG.BASE_URL,
    Mode: import.meta.env.MODE,
  });
};

export const apiClient = {
  get: async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      const url = `${API_CONFIG.BASE_URL}${endpoint}`;
      console.log(`🌐 API GET: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text ? `- ${text}` : ''}`);
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
      const url = `${API_CONFIG.BASE_URL}${endpoint}`;
      console.log(`🌐 API POST: ${url}`, requestData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(requestData),
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text ? `- ${text}` : ''}`);
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
