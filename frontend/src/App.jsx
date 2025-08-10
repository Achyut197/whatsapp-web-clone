import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import AddContactModal from './components/AddContactModal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { apiClient } from './config/api'; // Use your existing API client

const App = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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

  const testBackendConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Test backend health endpoint
      const response = await apiClient.get('/health');
      
      if (response.status === 'OK') {
        console.log('✅ Backend connection successful');
        setError(null);
      } else {
        setError('Backend service not responding properly');
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      setError('Failed to connect to backend service. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    setError(null);
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
  };

  const handleAddContact = (newContact) => {
    // The ChatSidebar will refresh its conversations automatically
    setSelectedChat(newContact);
    setShowAddContactModal(false);
    
    // Clear any existing errors
    setError(null);
    
    console.log('✅ New contact added:', newContact);
  };

  const handleRetryConnection = () => {
    setError(null);
    testBackendConnection();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-whatsapp-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">Connecting to WhatsApp Backend...</p>
          <p className="text-gray-500 text-xs mt-2">Testing connection to https://whatsapp-backend-tsoe.onrender.com</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-whatsapp-bg px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Backend Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={handleRetryConnection}
              className="w-full px-6 py-3 bg-whatsapp-green text-white rounded-full hover:bg-green-600 transition-colors font-medium"
            >
              Retry Connection
            </button>
            <p className="text-xs text-gray-500">
              Backend: https://whatsapp-backend-tsoe.onrender.com
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
                      e.target.nextSibling.style.display = 'flex';
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
                <p className="text-xs text-gray-500">WhatsApp contact</p>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className={`
          ${isMobile ? (selectedChat ? 'hidden' : 'block') : 'block'}
          ${isMobile ? 'w-full' : 'w-96 min-w-96'}
          bg-white border-r border-gray-200
        `}>
          <ChatSidebar
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
            onAddContact={() => setShowAddContactModal(true)}
          />
        </div>

        {/* Chat Window */}
        <div className={`
          flex-1
          ${isMobile ? (selectedChat ? 'block' : 'hidden') : 'block'}
          ${isMobile && selectedChat ? 'pt-16' : ''}
        `}>
          <ChatWindow
            selectedChat={selectedChat}
            isMobile={isMobile}
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
      {error && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:max-w-md bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 transform transition-transform">
          <div className="flex items-center">
            <span className="flex-1 text-sm font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-3 text-white hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
