import { Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';

// Get all notifications for user
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const page = parseInt(String(req.query.page || 1), 10);
    const limit = parseInt(String(req.query.limit || 20), 10);
    const offset = (page - 1) * limit;
    const { unread_only } = req.query;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = ?
    `;
    const params: any[] = [user.id];

    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }

    // Get count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countResult[0].total;

    // Use query instead of execute for LIMIT/OFFSET to avoid parameter issues
    // Parameters are safely sanitized as integers
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [notifications] = await pool.query<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching notifications'
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const [result] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = false',
      [user.id]
    );

    res.json({
      success: true,
      data: { unread: result[0].unread }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching unread count'
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { notificationId } = req.params;

    await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
      [notificationId, user.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking notification as read'
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false',
      [user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking notifications as read'
    });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { notificationId } = req.params;

    await pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, user.id]
    );

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting notification'
    });
  }
};

// Clear all notifications
export const clearAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    await pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE user_id = ?',
      [user.id]
    );

    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while clearing notifications'
    });
  }
};

