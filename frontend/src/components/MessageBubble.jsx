import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

const MessageBubble = ({ message, isLast, onRetryMessage }) => {
  // Handle different backend data structures for message direction
  const isOutgoing = message.fromMe || message.type === 'outgoing' || message.direction === 'outbound';
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      // Handle invalid dates
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  const getStatusIcon = (status) => {
    const iconClasses = "w-4 h-4 flex-shrink-0";
    
    switch (status) {
      case 'sent':
      case 'queued':
        return <CheckIcon className={`${iconClasses} text-gray-400`} />;
      case 'delivered':
      case 'received':
        return (
          <div className="flex items-center -space-x-1">
            <CheckIcon className={`${iconClasses} text-gray-400`} />
            <CheckIcon className={`${iconClasses} text-gray-400`} />
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center -space-x-1">
            <CheckIcon className={`${iconClasses} text-blue-500`} />
            <CheckIcon className={`${iconClasses} text-blue-500`} />
          </div>
        );
      case 'sending':
      case 'pending':
        return (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'failed':
      case 'undelivered':
        return (
          <div className="w-4 h-4 text-red-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle different message content fields from backend
  const getMessageContent = () => {
    const content = message.body || message.text || message.content || '';
    
    // Handle empty messages gracefully
    if (!content && getMessageType() === 'text') {
      return message.status === 'failed' ? 'Message failed to send' : '';
    }
    
    return content;
  };

  // Get message type from backend data
  const getMessageType = () => {
    return message.messageType || message.type || 'text';
  };

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1 px-2 group animate-fade-in`}>
      <div
        className={`
          message-container relative max-w-[85%] sm:max-w-[70%] md:max-w-md lg:max-w-lg
          ${isOutgoing
            ? message.status === 'failed' || message.status === 'undelivered'
              ? 'bg-red-100 border border-red-300 text-red-800'
              : 'bg-whatsapp-green text-white'
            : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
          }
          rounded-2xl shadow-sm
        `}
        style={{
          borderRadius: isOutgoing 
            ? '18px 18px 4px 18px' 
            : '18px 18px 18px 4px',
          marginBottom: isLast ? '8px' : '0',
          paddingTop: '8px',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: '20px',
          minHeight: '40px'
        }}
      >
        {/* Message Content */}
        <div 
          className="message-text-wrapper"
          style={{
            paddingRight: isOutgoing ? '65px' : '45px',
            minHeight: '16px',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {/* Handle media messages from backend */}
          {getMessageType() === 'image' && (
            <div className="rounded-lg overflow-hidden mb-2 bg-gray-200">
              <img 
                src={message.media?.url || message.imageUrl || message.mediaUrl || '/api/placeholder/300/200'} 
                alt="Shared image" 
                className="w-full h-auto max-w-xs"
                onError={(e) => {
                  e.target.src = '/api/placeholder/300/200';
                }}
              />
            </div>
          )}
          
          {getMessageType() === 'document' && (
            <div className="flex items-center p-3 bg-gray-100 rounded-lg mb-2">
              <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {message.media?.filename || message.fileName || 'Document'}
                </p>
                <p className="text-xs text-gray-500">
                  {message.media?.filesize || message.fileSize || 'Unknown size'}
                </p>
              </div>
            </div>
          )}
          
          {/* Only show text if content exists */}
          {getMessageContent() && (
            <p 
              className={`
                message-text leading-relaxed whitespace-pre-wrap break-words
                ${isOutgoing 
                  ? message.status === 'failed' || message.status === 'undelivered' 
                    ? 'text-red-800' 
                    : 'text-white'
                  : 'text-gray-900'
                }
              `}
              style={{
                fontSize: window.innerWidth < 768 ? '14px' : '15px',
                lineHeight: '1.4',
                margin: 0,
                padding: 0
              }}
            >
              {getMessageContent()}
            </p>
          )}
        </div>
        
        {/* Time and Status */}
        <div 
          className={`
            message-time-container flex items-center justify-end space-x-1
            ${isOutgoing 
              ? message.status === 'failed' || message.status === 'undelivered' 
                ? 'text-red-600' 
                : 'text-green-100'
              : 'text-gray-500'
            }
          `}
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '8px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            lineHeight: '1',
            whiteSpace: 'nowrap'
          }}
        >
          <span 
            className="message-time text-xs font-normal select-none"
            style={{
              fontSize: window.innerWidth < 768 ? '10px' : '11px',
              opacity: 0.8
            }}
          >
            {formatTime(message.timestamp || message.createdAt || message.time)}
          </span>
          {isOutgoing && (
            <div className="message-status flex items-center ml-1">
              {getStatusIcon(message.status)}
            </div>
          )}
        </div>

        {/* Failed message retry button */}
        {message.status === 'failed' && onRetryMessage && (
          <div className="absolute -bottom-6 right-0">
            <button
              onClick={() => onRetryMessage(message)}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Tap to retry
            </button>
          </div>
        )}

        {/* Backend API indicator */}
        {message.source === 'api' && (
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full shadow-sm border border-white" 
            title="API message"
          />
        )}

        {/* Demo/Webhook indicator */}
        {(message.webhookData?.demo_message || message.demo) && (
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full shadow-sm border border-white" 
            title="Demo message"
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
