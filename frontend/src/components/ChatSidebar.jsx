import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  EllipsisVerticalIcon, 
  UserPlusIcon,
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '../config/api'; // Import your API client

const ChatSidebar = ({ selectedChat, onChatSelect, onAddContact }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch conversations from backend
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get('/api/conversations');
        
        if (response.success) {
          setConversations(response.data);
        } else {
          setError('Failed to load conversations');
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Unable to connect to backend');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Refresh function
  const handleRefresh = async () => {
    try {
      setError(null);
      const response = await apiClient.get('/api/conversations');
      
      if (response.success) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error('Error refreshing conversations:', err);
      setError('Unable to refresh conversations');
    }
  };

  // Update filtered conversations whenever conversations or search term changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conversation => {
        const nameMatch = conversation.name && 
          conversation.name.toLowerCase().includes(searchQuery.toLowerCase());
        const phoneMatch = conversation.waId && 
          conversation.waId.includes(searchQuery);
        const lastMessageMatch = conversation.lastMessage && 
          conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
        
        return nameMatch || phoneMatch || lastMessageMatch;
      });
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffInHours = (now - msgTime) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return msgTime.toLocaleDateString([], { weekday: 'short' });
    } else {
      return msgTime.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 text-gray-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="bg-whatsapp-header border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">WhatsApp</h1>
            <button 
              onClick={onAddContact}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            >
              <UserPlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-green mx-auto mb-4"></div>
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-whatsapp-header border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">You</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">WhatsApp</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onAddContact}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors touch-target"
              title="New chat"
            >
              <UserPlusIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors touch-target"
              title="Refresh"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full pl-10 pr-10 py-2.5 bg-whatsapp-search rounded-lg text-sm border-none outline-none focus:bg-white focus:shadow-md transition-all"
            style={{ fontSize: window.innerWidth < 768 ? '16px' : '14px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 touch-target"
              title="Clear search"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Counter */}
        {searchQuery && (
          <div className="mt-2 px-1">
            <span className="text-xs text-gray-500">
              {filteredConversations.length} of {conversations.length} conversations
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mt-4 border-b border-gray-200">
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              activeTab === 'chats'
                ? 'text-whatsapp-green border-b-2 border-whatsapp-green'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('chats')}
          >
            All
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              activeTab === 'unread'
                ? 'text-whatsapp-green border-b-2 border-whatsapp-green'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('unread')}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          filteredConversations
            .filter(conv => activeTab === 'chats' || (conv.unreadCount && conv.unreadCount > 0))
            .map((conversation, index) => (
            <div
              key={conversation._id || conversation.waId}
              className={`
                flex items-center px-4 py-3 cursor-pointer border-b border-gray-100 transition-all duration-200
                hover:bg-gray-50 active:bg-gray-100 touch-target
                ${selectedChat?.waId === conversation.waId 
                  ? 'bg-whatsapp-selected border-r-4 border-r-whatsapp-green' 
                  : ''
                }
              `}
              onClick={() => onChatSelect(conversation)}
            >
              {/* Profile Picture */}
              <div className="relative mr-3">
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                  {conversation.profilePic ? (
                    <img
                      src={conversation.profilePic}
                      alt={conversation.name || conversation.waId}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span 
                    className="text-gray-600 font-semibold text-lg"
                    style={{ display: conversation.profilePic ? 'none' : 'flex' }}
                  >
                    {(conversation.name || conversation.waId).charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate flex-1 text-base">
                    {searchQuery ? 
                      highlightText(truncateText(conversation.name || conversation.waId, 20), searchQuery) :
                      truncateText(conversation.name || conversation.waId, 20)
                    }
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTime(conversation.lastMessageTime || conversation.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    {conversation.type === 'outgoing' && (
                      <svg className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <p className="text-sm text-gray-600 truncate">
                      {searchQuery && conversation.lastMessage ?
                        highlightText(truncateText(conversation.lastMessage, 30), searchQuery) :
                        truncateText(conversation.lastMessage || 'Click to start messaging', 30)
                      }
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="flex items-center ml-2">
                      <span className="bg-whatsapp-green text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            {searchQuery ? (
              <>
                <MagnifyingGlassIcon className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No chats found</h3>
                <p className="text-sm text-center px-4">
                  Try searching for a different contact or message
                </p>
              </>
            ) : (
              <>
                <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No conversations</h3>
                <p className="text-sm text-center px-4 mb-4">
                  Start a conversation by adding a new contact
                </p>
                <button
                  onClick={onAddContact}
                  className="px-6 py-2 bg-whatsapp-green text-white rounded-full hover:bg-green-600 transition-colors font-medium text-sm"
                >
                  New Chat
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
