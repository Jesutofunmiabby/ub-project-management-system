import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread', getUnreadCount);

// Mark all as read
router.put('/read-all', markAllAsRead);

// Clear all notifications
router.delete('/clear', clearAllNotifications);

// Mark single notification as read
router.put('/:notificationId/read', markAsRead);

// Delete single notification
router.delete('/:notificationId', deleteNotification);

export default router;

