import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validationResult } from 'express-validator';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';

// Get all messages for user
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { folder = 'inbox', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query: string;
    let countQuery: string;

    if (folder === 'sent') {
      query = `
        SELECT m.*, 
               u.first_name as receiver_first_name,
               u.last_name as receiver_last_name,
               u.email as receiver_email
        FROM messages m
        JOIN users u ON m.receiver_id = u.id
        WHERE m.sender_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as total FROM messages WHERE sender_id = ?';
    } else {
      query = `
        SELECT m.*, 
               u.first_name as sender_first_name,
               u.last_name as sender_last_name,
               u.email as sender_email
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.receiver_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as total FROM messages WHERE receiver_id = ?';
    }

    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, [user.id]);
    const total = countResult[0].total;

    const [messages] = await pool.execute<RowDataPacket[]>(query, [user.id, Number(limit), offset]);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching messages'
    });
  }
};

// Get conversation with a specific user
export const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.params;
    const page = parseInt(String(req.query.page || 1), 10);
    const limit = parseInt(String(req.query.limit || 50), 10);
    const offset = (page - 1) * limit;

    // Use query instead of execute for LIMIT/OFFSET to avoid parameter issues
    // Parameters are safely sanitized as integers
    const [messages] = await pool.query<RowDataPacket[]>(`
      SELECT m.*, 
             CASE WHEN m.sender_id = ? THEN 'sent' ELSE 'received' END as direction,
             sender.first_name as sender_first_name,
             sender.last_name as sender_last_name,
             receiver.first_name as receiver_first_name,
             receiver.last_name as receiver_last_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [user.id, user.id, userId, userId, user.id]);

    // Mark received messages as read
    await pool.execute<ResultSetHeader>(`
      UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE receiver_id = ? AND sender_id = ? AND is_read = false
    `, [user.id, userId]);

    res.json({
      success: true,
      data: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching conversation'
    });
  }
};

// Send message
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
      return;
    }

    const user = req.user!;
    const { receiver_id, subject, content, project_id } = req.body;

    // Verify receiver exists
    const [receivers] = await pool.execute<RowDataPacket[]>(
      'SELECT id, first_name, last_name, email FROM users WHERE id = ? AND is_active = true',
      [receiver_id]
    );

    if (receivers.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
      return;
    }

    const receiver = receivers[0];

    // If student, can only message their supervisor
    if (user.role === 'student') {
      const [projects] = await pool.execute<RowDataPacket[]>(
        'SELECT supervisor_id FROM projects WHERE student_id = ? AND supervisor_id = ?',
        [user.id, receiver_id]
      );

      if (projects.length === 0) {
        res.status(403).json({
          success: false,
          message: 'Students can only message their assigned supervisor'
        });
        return;
      }
    }

    const messageId = uuidv4();
    let attachmentPath = null;

    // Handle file attachment if present
    if (req.file) {
      attachmentPath = req.file.path;
    }

    await pool.execute<ResultSetHeader>(`
      INSERT INTO messages (id, sender_id, receiver_id, project_id, subject, content, attachment_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [messageId, user.id, receiver_id, project_id || null, subject || null, content, attachmentPath]);

    // Create notification for receiver
    await pool.execute<ResultSetHeader>(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, 'New Message', ?, 'info', ?)
    `, [
      uuidv4(),
      receiver_id,
      `You have a new message from ${user.first_name} ${user.last_name}`,
      `/messages/${user.id}`
    ]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: messageId,
        receiver: {
          id: receiver.id,
          name: `${receiver.first_name} ${receiver.last_name}`
        }
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending the message'
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const [result] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as unread FROM messages WHERE receiver_id = ? AND is_read = false',
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

// Mark message as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { messageId } = req.params;

    await pool.execute<ResultSetHeader>(`
      UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND receiver_id = ?
    `, [messageId, user.id]);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking message as read'
    });
  }
};

// Get contacts (for new message)
export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let contacts: RowDataPacket[] = [];

    if (user.role === 'student') {
      // Student can only contact their supervisor
      const [supervisors] = await pool.execute<RowDataPacket[]>(`
        SELECT u.id, u.first_name, u.last_name, u.email, 'supervisor' as relationship
        FROM users u
        JOIN projects p ON u.id = p.supervisor_id
        WHERE p.student_id = ? AND u.is_active = true
      `, [user.id]);
      contacts = supervisors;
    } else if (user.role === 'lecturer') {
      // Lecturer can contact their supervisees and coordinator
      const [result] = await pool.execute<RowDataPacket[]>(`
        SELECT u.id, u.first_name, u.last_name, u.email, 'supervisee' as relationship
        FROM users u
        JOIN projects p ON u.id = p.student_id
        WHERE p.supervisor_id = ? AND u.is_active = true
        UNION
        SELECT u.id, u.first_name, u.last_name, u.email, 'coordinator' as relationship
        FROM users u
        WHERE u.role = 'coordinator' AND u.is_active = true
      `, [user.id]);
      contacts = result;
    } else {
      // Coordinator can contact everyone
      const [result] = await pool.execute<RowDataPacket[]>(`
        SELECT id, first_name, last_name, email, role as relationship
        FROM users
        WHERE is_active = true AND id != ?
        ORDER BY role, last_name, first_name
      `, [user.id]);
      contacts = result;
    }

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching contacts'
    });
  }
};

// Broadcast message (Coordinator only)
export const broadcastMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { subject, content, targetRoles } = req.body;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can send broadcast messages'
      });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
      return;
    }

    // Get target users
    let query = 'SELECT id FROM users WHERE is_active = true AND id != ?';
    const params: any[] = [user.id];

    if (targetRoles && Array.isArray(targetRoles) && targetRoles.length > 0) {
      query += ` AND role IN (${targetRoles.map(() => '?').join(',')})`;
      params.push(...targetRoles);
    }

    const [users] = await pool.execute<RowDataPacket[]>(query, params);

    // Create notifications for all users
    const notificationId = uuidv4();
    for (const targetUser of users) {
      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, ?, ?, 'info')
      `, [uuidv4(), targetUser.id, subject || 'Announcement', content]);
    }

    // Store broadcast in a separate table for history
    await pool.execute<ResultSetHeader>(`
      INSERT INTO broadcast_messages (id, sender_id, subject, content, target_roles, recipient_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [notificationId, user.id, subject, content, JSON.stringify(targetRoles || []), users.length]);

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'BROADCAST', 'MESSAGE', ?, ?, ?)
    `, [uuidv4(), user.id, notificationId, JSON.stringify({ recipientCount: users.length }), req.ip]);

    res.json({
      success: true,
      message: `Broadcast sent to ${users.length} users`,
      data: { recipientCount: users.length }
    });
  } catch (error) {
    console.error('Broadcast message error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending broadcast'
    });
  }
};

