import crypto from 'crypto';

// Generate unique message ID
export const generateMessageId = () => {
  return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// Format phone number
export const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  return cleaned;
};

// Validate WhatsApp ID format
export const isValidWaId = (waId) => {
  const waIdRegex = /^[1-9]\d{7,14}$/;
  return waIdRegex.test(waId);
};
