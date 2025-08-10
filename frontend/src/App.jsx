import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import AddContactModal from './components/AddContactModal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, apiRequest } from './config/api.js';

const App = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
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

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.waId);
    }
  }, [selectedChat]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiRequest(API_ENDPOINTS.CONVERSATIONS);
      
      if (data.success) {
        setConversations(data.data);
        if (data.data.length > 0 && !selectedChat && !isMobile) {
          setSelectedChat(data.data[0]);
        }
      } else {
        setError('Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (waId) => {
    try {
      const data = await apiRequest(API_ENDPOINTS.MESSAGES(waId));
      
      if (data.success) {
        const sortedMessages = (data.data.messages || []).sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        setMessages(sortedMessages);
      } else {
        setError('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to fetch messages');
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!selectedChat || !messageText.trim()) return;

    try {
      const optimisticMessage = {
        _id: `temp-${Date.now()}-${Math.random()}`,
        messageId: `temp-${Date.now()}`,
        text: messageText,
        type: 'outgoing',
        status: 'sending',
        timestamp: new Date().toISOString(),
        messageType: 'text'
      };

      setMessages(prevMessages => [...prevMessages, optimisticMessage]);

      const data = await apiRequest(API_ENDPOINTS.SEND_MESSAGE, {
        method: 'POST',
        body: JSON.stringify({
          waId: selectedChat.waId,
          text: messageText
        }),
      });

      if (data.success) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === optimisticMessage._id 
              ? { ...data.data, status: 'sent' }
              : msg
          )
        );

        setConversations(prevConvs => 
          prevConvs.map(conv => 
            conv.waId === selectedChat.waId 
              ? { ...conv, lastMessage: messageText, lastMessageTime: new Date() }
              : conv
          )
        );

        // Status progression simulation
        setTimeout(() => {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.messageId === data.data.messageId 
                ? { ...msg, status: 'delivered' }
                : msg
            )
          );
        }, 1000);

        setTimeout(() => {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.messageId === data.data.messageId 
                ? { ...msg, status: 'read' }
                : msg
            )
          );
        }, 2000);
      } else {
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg._id !== optimisticMessage._id)
        );
        setError('Failed to send message');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id !== optimisticMessage._id)
      );
      setError('Failed to send message. Please try again.');
      setTimeout(() => setError(null), 3000);
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
    setConversations(prevConvs => [newContact, ...prevConvs]);
    setSelectedChat(newContact);
    setShowAddContactModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-whatsapp-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-whatsapp-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">Loading WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-whatsapp-bg px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchConversations}
            className="px-6 py-3 bg-whatsapp-green text-white rounded-full hover:bg-green-600 transition-colors font-medium"
          >
            Try Again
          </button>
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
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                {selectedChat.profilePic ? (
                  <img
                    src={selectedChat.profilePic}
                    alt={selectedChat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {selectedChat.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate text-sm">
                  {selectedChat.name}
                </h3>
                <p className="text-xs text-gray-500">online</p>
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
            conversations={conversations}
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
            onAddContact={() => setShowAddContactModal(true)}
            onRefresh={fetchConversations}
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
            messages={messages}
            onSendMessage={handleSendMessage}
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
