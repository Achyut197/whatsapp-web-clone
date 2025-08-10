import React, { useState } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../config/api'; // Use your existing API client

const AddContactModal = ({ isOpen, onClose, onAddContact }) => {
  const [formData, setFormData] = useState({
    waId: '',
    name: '',
    profilePic: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const formatPhoneNumber = (phone) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with country code (add 91 for India if not present)
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      return '91' + cleaned;
    }
    
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.waId) {
      setError('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(formData.waId)) {
      setError('Please enter a valid phone number (10-15 digits)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedWaId = formatPhoneNumber(formData.waId);
      
      const response = await apiClient.post('/api/contacts', {
        waId: formattedWaId,
        name: formData.name || `Contact ${formattedWaId}`,
        profilePic: formData.profilePic || null
      });

      if (response.success) {
        // Notify parent component about new contact
        if (onAddContact) {
          onAddContact(response.data);
        }
        
        // Reset form and close modal
        setFormData({ waId: '', name: '', profilePic: '' });
        onClose();
        
        // Show success message (optional)
        console.log('Contact added successfully:', response.data);
      } else {
        setError(response.message || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      
      // Handle specific error cases
      if (error.message.includes('already exists')) {
        setError('This contact already exists');
      } else if (error.message.includes('invalid phone')) {
        setError('Invalid phone number format');
      } else {
        setError('Failed to add contact. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ waId: '', name: '', profilePic: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="font-semibold text-gray-900 flex items-center text-xl">
              <UserPlusIcon className="w-6 h-6 mr-3 text-whatsapp-green" />
              Add New Contact
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 touch-target"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number */}
            <div>
              <label htmlFor="waId" className="block font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="waId"
                name="waId"
                value={formData.waId}
                onChange={handleInputChange}
                placeholder="919876543210"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-green focus:border-transparent text-gray-900 text-base"
                style={{ fontSize: window.innerWidth < 768 ? '16px' : '15px' }}
                required
                disabled={loading}
              />
              <p className="text-gray-500 mt-1 text-sm">
                Enter phone number with country code (e.g., 919876543210)
              </p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block font-medium text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-green focus:border-transparent text-gray-900 text-base"
                style={{ fontSize: window.innerWidth < 768 ? '16px' : '15px' }}
                disabled={loading}
              />
              <p className="text-gray-500 mt-1 text-sm">
                Optional: Will use phone number if not provided
              </p>
            </div>

            {/* Profile Picture URL */}
            <div>
              <label htmlFor="profilePic" className="block font-medium text-gray-700 mb-2">
                Profile Picture URL
              </label>
              <input
                type="url"
                id="profilePic"
                name="profilePic"
                value={formData.profilePic}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-green focus:border-transparent text-gray-900 text-base"
                style={{ fontSize: window.innerWidth < 768 ? '16px' : '15px' }}
                disabled={loading}
              />
              <p className="text-gray-500 mt-1 text-sm">
                Optional: URL to profile image
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Success Preview */}
            {formData.waId && !error && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 text-sm">
                  <strong>Contact Preview:</strong>
                </p>
                <p className="text-green-600 text-sm mt-1">
                  📱 {formatPhoneNumber(formData.waId)}
                </p>
                {formData.name && (
                  <p className="text-green-600 text-sm">
                    👤 {formData.name}
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.waId}
                className="flex-1 px-6 py-3 bg-whatsapp-green text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium touch-target flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Contact'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
