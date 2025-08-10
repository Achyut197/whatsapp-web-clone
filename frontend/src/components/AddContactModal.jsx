import React, { useState } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, apiRequest } from '../config/api.js';

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
      const data = await apiRequest(API_ENDPOINTS.ADD_CONTACT, {
        method: 'POST',
        body: JSON.stringify({
          waId: formData.waId.replace(/\D/g, ''),
          name: formData.name || `Contact ${formData.waId}`,
          profilePic: formData.profilePic || null
        }),
      });

      if (data.success) {
        onAddContact(data.data);
        setFormData({ waId: '', name: '', profilePic: '' });
        onClose();
      } else {
        setError(data.message || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      setError('Failed to add contact. Please try again.');
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

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-target"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-whatsapp-green text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium touch-target"
              >
                {loading ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
