import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getMessages,
  getConversation,
  sendMessage,
  getUnreadCount,
  markAsRead,
  getContacts,
  broadcastMessage
} from '../controllers/messageController';
import { authenticate, authorize } from '../middleware/auth';
import { messageValidation } from '../middleware/validation';
import { config } from '../config/env';

const router = Router();

// Configure multer for attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(config.upload.dir, 'attachments'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize
  }
});

// All routes require authentication
router.use(authenticate);

// Get messages
router.get('/', getMessages);

// Get unread count
router.get('/unread', getUnreadCount);

// Get contacts
router.get('/contacts', getContacts);

// Get conversation with specific user
router.get('/conversation/:userId', getConversation);

// Send message
router.post('/', messageValidation, upload.single('attachment'), sendMessage);

// Broadcast message (Coordinator only)
router.post('/broadcast', authorize('coordinator'), broadcastMessage);

// Mark message as read
router.put('/:messageId/read', markAsRead);

export default router;

