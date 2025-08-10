import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  FaceSmileIcon, 
  MicrophoneIcon,
  PhoneIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import MessageBubble from './MessageBubble';
import { apiClient } from '../config/api';

const ChatWindow = ({ selectedChat, isMobile }) => {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat && !isMobile) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [selectedChat, isMobile]);

  // Fetch messages when selectedChat changes
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat]);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching messages for:', {
        waId: selectedChat.waId,
        name: selectedChat.name,
        endpoint: `/api/messages/${selectedChat.waId}`
      });
      
      const response = await apiClient.get(`/api/messages/${selectedChat.waId}`);
      
      console.log('📡 Full API Response:', response);
      
      // Handle different response structures
      let messagesList = [];
      
      if (response.success) {
        // ✅ FIXED: Use response.messages instead of response.data
        messagesList = response.messages || response.data || [];
        
        console.log('📨 Messages extracted:', {
          count: messagesList.length,
          messages: messagesList
        });
        
        setMessages(messagesList);
        
        if (messagesList.length === 0) {
          console.log('ℹ️ No messages found for this contact');
        }
      } else {
        console.error('❌ API returned success: false');
        setError(response.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      setError(`Unable to load messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    adjustTextareaHeight();
    
    // Simulate typing indicator
    if (!isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Optimistically add message to UI
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      body: messageText,
      fromMe: true,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setIsTyping(false);

    try {
      const response = await apiClient.post('/api/messages/send', {
        to: selectedChat.waId,
        body: messageText
      });

      console.log('📤 Send message response:', response);

      if (response.success) {
        // ✅ FIXED: Handle the actual message structure from backend
        const sentMessage = response.message || response.data || {
          _id: `sent-${Date.now()}`,
          body: messageText,
          fromMe: true,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        
        // Replace temp message with actual message from backend
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessage._id 
              ? { ...sentMessage, status: 'sent' }
              : msg
          )
        );
      } else {
        // Mark message as failed
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessage._id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
        setError('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessage._id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      setError('Unable to send message');
    } finally {
      setSending(false);
      
      if (!isMobile) {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const retryFailedMessage = async (failedMessage) => {
    if (sending) return;
    
    setSending(true);
    setMessages(prev => 
      prev.map(msg => 
        msg._id === failedMessage._id 
          ? { ...msg, status: 'sending' }
          : msg
      )
    );

    try {
      const response = await apiClient.post('/api/messages/send', {
        to: selectedChat.waId,
        body: failedMessage.body
      });

      if (response.success) {
        const sentMessage = response.message || response.data || failedMessage;
        setMessages(prev => 
          prev.map(msg => 
            msg._id === failedMessage._id 
              ? { ...sentMessage, status: 'sent' }
              : msg
          )
        );
      } else {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === failedMessage._id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
      }
    } catch (err) {
      console.error('Error retrying message:', err);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === failedMessage._id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-whatsapp-bg">
        <div className="text-center max-w-md px-8">
          <div className="w-72 h-72 mx-auto mb-8 opacity-10">
            <svg viewBox="0 0 303 172" className="w-full h-full">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0f2f5"/>
                  <stop offset="100%" stopColor="#e1e7ed"/>
                </linearGradient>
              </defs>
              <path fill="url(#grad1)" d="M229.565 160.564c0-6.326 5.129-11.454 11.455-11.454h50.009c6.326 0 11.455 5.128 11.455 11.454v0c0 6.326-5.129 11.455-11.455 11.455H241.02c-6.326 0-11.455-5.129-11.455-11.455z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-light text-gray-800 mb-4">
            WhatsApp Web
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Send and receive messages without keeping your phone online.<br/>
            Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">
              💡 <strong>Get started:</strong> Select a conversation from the sidebar to begin messaging
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      {!isMobile && (
        <div className="bg-whatsapp-header border-b border-gray-200 px-4 py-3 flex items-center shadow-sm">
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3 overflow-hidden">
              {selectedChat.profilePic ? (
                <img
                  src={selectedChat.profilePic}
                  alt={selectedChat.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span 
                className="text-gray-600 font-semibold text-sm"
                style={{ display: selectedChat.profilePic ? 'none' : 'flex' }}
              >
                {selectedChat.name?.charAt(0)?.toUpperCase() || selectedChat.waId?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base truncate">
                {selectedChat.name || selectedChat.waId}
              </h3>
              <p className="text-sm text-gray-500">
                {isTyping ? (
                  <span className="text-whatsapp-green">typing...</span>
                ) : (
                  'last seen recently'
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button 
              onClick={fetchMessages}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors touch-target"
              title="Refresh messages"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors touch-target">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors touch-target">
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors touch-target">
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 m-4">
          <div className="flex items-center">
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-2 bg-whatsapp-chat"
        style={{ 
          backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJncmFpbiIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8cGF0aCBkPSJNMCAwaDEwMHYxMDBIMHoiIGZpbGw9IiNmMGYyZjUiLz4KICAgICAgPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSIjZTRlNmVhIiBvcGFjaXR5PSIwLjMiLz4KICAgICAgPGNpcmNsZSBjeD0iODAiIGN5PSI4MCIgcj0iMC41IiBmaWxsPSIjZTRlNmVhIiBvcGFjaXR5PSIwLjMiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmFpbikiLz4KPC9zdmc+")',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-green mx-auto mb-4"></div>
              <p className="text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-sm max-w-sm">
              <div className="text-4xl mb-3">👋</div>
              <h3 className="font-semibold text-gray-800 mb-2">Start the conversation</h3>
              <p className="text-gray-600 text-sm">
                Send a message to begin your chat with {selectedChat.name || selectedChat.waId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 py-4">
            {messages.map((message, index) => (
              <div key={message._id || message.messageId || `msg-${index}`}>
                <MessageBubble 
                  message={message}
                  isLast={index === messages.length - 1}
                  onRetryMessage={retryFailedMessage}
                />
                {message.status === 'failed' && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => retryFailedMessage(message)}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                      disabled={sending}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-whatsapp-header border-t border-gray-200 px-4 py-3">
        <div className="flex items-end space-x-3">
          {/* Attachment Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all duration-200 touch-target"
            title="Attach"
          >
            <PaperClipIcon className="w-6 h-6" />
          </button>
          
          {/* Message Input Container */}
          <div className="flex-1 relative bg-white rounded-3xl shadow-sm border border-gray-300 min-h-[44px] max-h-[120px] flex items-end">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message"
              rows="1"
              disabled={sending}
              className="flex-1 px-4 py-3 bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500 text-[15px] leading-5 max-h-[120px] overflow-y-auto disabled:opacity-50"
              style={{ 
                fontSize: window.innerWidth < 768 ? '16px' : '15px',
                lineHeight: '1.25'
              }}
            />
            
            <button
              type="button"
              className="flex-shrink-0 p-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 touch-target"
              title="Emoji"
            >
              <FaceSmileIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Send Button or Voice Note */}
          {newMessage.trim() ? (
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sending}
              className="flex-shrink-0 w-12 h-12 bg-whatsapp-green text-white rounded-full hover:bg-green-600 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-lg touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              className="flex-shrink-0 w-12 h-12 bg-whatsapp-green text-white rounded-full hover:bg-green-600 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-lg touch-target"
              title="Voice message"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
