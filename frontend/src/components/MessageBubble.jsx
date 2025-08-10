import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

const MessageBubble = ({ message, isLast }) => {
  const isOutgoing = message.type === 'outgoing';
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status) => {
    const iconClasses = "w-4 h-4 flex-shrink-0";
    
    switch (status) {
      case 'sent':
        return <CheckIcon className={`${iconClasses} text-gray-400`} />;
      case 'delivered':
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
        return (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'failed':
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

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1 px-2 group animate-fade-in`}>
      <div
        className={`
          message-container relative max-w-[85%] sm:max-w-[70%] md:max-w-md lg:max-w-lg
          ${isOutgoing
            ? message.status === 'failed'
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
          {message.messageType === 'image' && (
            <div className="rounded-lg overflow-hidden mb-2 bg-gray-200">
              <img 
                src={message.imageUrl || '/api/placeholder/300/200'} 
                alt="Shared image" 
                className="w-full h-auto max-w-xs"
              />
            </div>
          )}
          
          {message.messageType === 'document' && (
            <div className="flex items-center p-3 bg-gray-100 rounded-lg mb-2">
              <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{message.fileName || 'Document'}</p>
                <p className="text-xs text-gray-500">{message.fileSize || 'Unknown size'}</p>
              </div>
            </div>
          )}
          
          <p 
            className={`
              message-text leading-relaxed whitespace-pre-wrap break-words
              ${isOutgoing 
                ? message.status === 'failed' ? 'text-red-800' : 'text-white'
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
            {message.text}
          </p>
        </div>
        
        {/* Time and Status */}
        <div 
          className={`
            message-time-container flex items-center justify-end space-x-1
            ${isOutgoing 
              ? message.status === 'failed' ? 'text-red-600' : 'text-green-100'
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
            {formatTime(message.timestamp)}
          </span>
          {isOutgoing && (
            <div className="message-status flex items-center ml-1">
              {getStatusIcon(message.status)}
            </div>
          )}
        </div>

        {/* Demo indicator */}
        {message.webhookData?.demo_message && (
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
