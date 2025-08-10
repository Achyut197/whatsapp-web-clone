import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  addNewContact
} from '../controllers/messageController.js';

const router = express.Router();

// Get all conversations
router.get('/conversations', getConversations);

// Get messages for a specific contact
router.get('/messages/:waId', getMessages);

// Send a new message
router.post('/send', sendMessage);

// Mark messages as read
router.post('/mark-read/:waId', markAsRead);

// Add new contact
router.post('/add-contact', addNewContact);

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API routes are working',
    timestamp: new Date().toISOString()
  });
});

export default router;
