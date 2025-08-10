import React, { useState, useEffect, useCallback } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import AddContactModal from './components/AddContactModal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { apiClient } from './config/api';

const App = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial loading check - test backend connection
  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      console.log('🔄 Testing backend connection...');
      
      // Test backend health endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await apiClient.get('/health', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 'OK' || response.data?.status === 'OK') {
        console.log('✅ Backend connection successful');
        setConnectionStatus('connected');
        setError(null);
        setRetryCount(0);
      } else {
        throw new Error('Backend service not responding properly');
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      setConnectionStatus('failed');
      
      if (error.name === 'AbortError') {
        setError('Connection timeout. Backend is taking too long to respond.');
      } else if (error.message?.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Failed to connect to backend service. The server might be starting up.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChatSelect = useCallback((chat) => {
    try {
      console.log('📱 Selecting chat:', chat?.name || chat?.waId);
      
      if (!chat || !chat.waId) {
        console.error('❌ Invalid chat selected:', chat);
        setError('Invalid contact selected');
        return;
      }

      // Prevent rapid successive clicks
      if (selectedChat?.waId === chat.waId) {
        console.log('ℹ️ Same chat already selected');
        return;
      }

      setSelectedChat(chat);
      setError(null);
      
      // For mobile, ensure proper state management
      if (isMobile) {
        // Small delay to ensure state updates properly
        setTimeout(() => {
          console.log('📱 Mobile chat selection completed');
        }, 100);
      }
      
    } catch (error) {
      console.error('❌ Error selecting chat:', error);
      setError('Failed to select chat');
    }
  }, [selectedChat, isMobile]);

  const handleBackToChats = useCallback(() => {
    try {
      console.log('⬅️ Navigating back to chat list');
      
      setSelectedChat(null);
      setError(null);
      
      // Ensure mobile view switches properly
      if (isMobile) {
        setTimeout(() => {
          console.log('📱 Mobile navigation completed');
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error navigating back:', error);
      setError('Navigation error');
    }
  }, [isMobile]);

  const handleAddContact = useCallback((newContact) => {
    try {
      console.log('➕ Adding new contact:', newContact);
      
      if (!newContact || !newContact.waId) {
        setError('Invalid contact data');
        return;
      }

      setSelectedChat(newContact);
      setShowAddContactModal(false);
      setError(null);
      
      console.log('✅ New contact added successfully:', newContact.name || newContact.waId);
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      setError('Failed to add contact');
    }
  }, []);

  const handleRetryConnection = useCallback(() => {
    const currentRetryCount = retryCount + 1;
    setRetryCount(currentRetryCount);
    
    console.log(`🔄 Retrying connection (attempt ${currentRetryCount})...`);
    setError(null);
    testBackendConnection();
  }, [retryCount, testBackendConnection]);

  // Auto-retry connection with exponential backoff
  useEffect(() => {
    if (connectionStatus === 'failed' && retryCount < 3) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
      console.log(`⏰ Auto-retry in ${delay/1000} seconds...`);
      
      const timer = setTimeout(() => {
        handleRetryConnection();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, retryCount, handleRetryConnection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-whatsapp-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">
            {connectionStatus === 'connecting' ? 'Connecting to WhatsApp Backend...' : 'Loading...'}
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Backend: https://whatsapp-backend-tsoe.onrender.com
          </p>
          {retryCount > 0 && (
            <p className="text-gray-400 text-xs mt-1">
              Retry attempt: {retryCount}/3
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error && connectionStatus === 'failed' && retryCount >= 3) {
    return (
      <div className="flex items-center justify-center h-screen bg-whatsapp-bg px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Backend Connection Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={handleRetryConnection}
              className="w-full px-6 py-3 bg-whatsapp-green text-white rounded-full hover:bg-green-600 transition-colors font-medium"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium"
            >
              Reload Page
            </button>
            <p className="text-xs text-gray-500">
              Backend: https://whatsapp-backend-tsoe.onrender.com
            </p>
            <p className="text-xs text-gray-400">
              If the issue persists, the backend server might be starting up (cold start).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-whatsapp-bg overflow-hidden">
      <div className="flex h-full max-w-screen-2xl mx-auto bg-white shadow-2xl">
        {/* Mobile Header */}
        {isMobile && selectedChat && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-whatsapp-header border-b border-gray-200 px-4 py-3 flex items-center">
            <button
              onClick={handleBackToChats}
              className="mr-4 p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button" // Prevent form submission
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <div className="flex items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3 overflow-hidden">
                {selectedChat.profilePic ? (
                  <img
                    src={selectedChat.profilePic}
                    alt={selectedChat.name || selectedChat.waId}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <span 
                  className="text-white font-medium text-sm"
                  style={{ display: selectedChat.profilePic ? 'none' : 'flex' }}
                >
                  {(selectedChat.name || selectedChat.waId)?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate text-sm">
                  {selectedChat.name || selectedChat.waId}
                </h3>
                <p className="text-xs text-gray-500">
                  {connectionStatus === 'connected' ? 'Online' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className={`
          ${isMobile ? (selectedChat ? 'hidden' : 'block') : 'block'}
          ${isMobile ? 'w-full' : 'w-96 min-w-96'}
          bg-white border-r border-gray-200 flex-shrink-0
        `}>
          <ChatSidebar
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
            onAddContact={() => setShowAddContactModal(true)}
            connectionStatus={connectionStatus}
          />
        </div>

        {/* Chat Window */}
        <div className={`
          flex-1
          ${isMobile ? (selectedChat ? 'block' : 'hidden') : 'block'}
          ${isMobile && selectedChat ? 'pt-16' : ''}
          min-w-0
        `}>
          <ChatWindow
            selectedChat={selectedChat}
            isMobile={isMobile}
            connectionStatus={connectionStatus}
          />
        </div>
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        onAddContact={handleAddContact}
      />

      {/* Error Toast */}
      {error && connectionStatus !== 'failed' && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:max-w-md bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 transform transition-transform">
          <div className="flex items-center">
            <span className="flex-1 text-sm font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-3 text-white hover:text-red-200"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      {connectionStatus === 'connecting' && !loading && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          Reconnecting...
        </div>
      )}
    </div>
  );
};

export default App;
