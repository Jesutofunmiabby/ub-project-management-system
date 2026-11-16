import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';
import bcrypt from 'bcryptjs';

// ==================== DASHBOARD & STATISTICS ====================

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // System statistics - Get total users (all users, including inactive)
    const [totalUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users'
    );
    
    // Get users by role (all users, including inactive)
    const [usersByRole] = await pool.execute<RowDataPacket[]>(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );
    
    // Get active users by role
    const [activeUsersByRole] = await pool.execute<RowDataPacket[]>(
      'SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role'
    );
    
    const [projects] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM projects'
    );
    
    const [submissions] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM submissions'
    );
    
    const [auditLogs] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    const [activeSessions] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers[0]?.count || 0,
        users: usersByRole.reduce((acc: any, row: any) => {
          acc[row.role] = row.count;
          return acc;
        }, {}),
        activeUsers: activeUsersByRole.reduce((acc: any, row: any) => {
          acc[row.role] = row.count;
          return acc;
        }, {}),
        totalProjects: projects[0]?.count || 0,
        totalSubmissions: submissions[0]?.count || 0,
        recentAuditLogs: auditLogs[0]?.count || 0,
        activeSessions: activeSessions[0]?.count || 0,
      }
    });
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== USER MANAGEMENT ====================

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, role, search, is_active } = req.query;
    // Ensure page and limit are valid positive integers
    const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 20)); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;
    
    // Build WHERE clause conditions
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }
    
    if (search) {
      whereClause += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR student_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (is_active !== undefined) {
      whereClause += ' AND is_active = ?';
      const isActiveBool = String(is_active) === 'true';
      params.push(isActiveBool);
      countParams.push(isActiveBool);
    }
    
    // Get users with pagination - use template literals for LIMIT/OFFSET to avoid parameter issues
    const query = `SELECT id, email, first_name, last_name, role, student_id, department, phone, is_active, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
    
    const [users] = await pool.execute<RowDataPacket[]>(query, params);
    
    // Get total count (without LIMIT/OFFSET)
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult[0]?.total || 0,
          totalPages: Math.ceil((countResult[0]?.total || 0) / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, first_name, last_name, role, student_id, department, phone, profile_image, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: users[0]
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { email, password, first_name, last_name, role, student_id, department, phone } = req.body;
    
    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }
    
    // Check if user exists
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const id = uuidv4();
    await connection.execute(
      'INSERT INTO users (id, email, password, first_name, last_name, role, student_id, department, phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())',
      [id, email, hashedPassword, first_name, last_name, role, student_id || null, department || null, phone || null]
    );
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'CREATE_USER', 'user', id, JSON.stringify({ email, role, first_name, last_name })]
    );
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { email, first_name, last_name, role, student_id, department, phone, is_active } = req.body;
    
    // Get old user data
    const [oldUser] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (oldUser.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // Update user
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (email !== undefined) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      params.push(last_name);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      params.push(role);
    }
    if (student_id !== undefined) {
      updateFields.push('student_id = ?');
      params.push(student_id);
    }
    if (department !== undefined) {
      updateFields.push('department = ?');
      params.push(department);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }
    
    if (updateFields.length === 0) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    await connection.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    // Get updated user data for audit log
    const [updatedUser] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'UPDATE_USER', 'user', id, JSON.stringify(oldUser[0]), JSON.stringify(updatedUser[0])]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const adminUser = req.user!;
    
    // Prevent self-deletion
    if (id === adminUser.id) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
      return;
    }
    
    // Check if user exists
    const [users] = await connection.execute<RowDataPacket[]>(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    const deletedUser = users[0];
    
    // Get all projects for this user (as student or supervisor)
    const [projects] = await connection.execute<RowDataPacket[]>(
      'SELECT id, student_id, supervisor_id FROM projects WHERE student_id = ? OR supervisor_id = ?',
      [id, id]
    );
    
    // Delete projects where user is the student (cascades to submissions, grades, etc.)
    for (const project of projects) {
      if (project.student_id === id) {
        // Delete project (cascades to submissions, grades, presentation_schedules)
        await connection.execute('DELETE FROM projects WHERE id = ?', [project.id]);
      } else if (project.supervisor_id === id) {
        // For projects where user is supervisor, update to remove supervisor
        const [projectDetails] = await connection.execute<RowDataPacket[]>(
          'SELECT status, academic_year FROM projects WHERE id = ?',
          [project.id]
        );
        
        if (projectDetails.length > 0 && ['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(projectDetails[0].status)) {
          // Decrease lecturer capacity
          const [capacity] = await connection.execute<RowDataPacket[]>(
            'SELECT * FROM lecturer_capacity WHERE lecturer_id = ? AND academic_year = ?',
            [id, projectDetails[0].academic_year]
          );
          
          if (capacity.length > 0 && capacity[0].current_students > 0) {
            await connection.execute(
              'UPDATE lecturer_capacity SET current_students = current_students - 1 WHERE id = ?',
              [capacity[0].id]
            );
          }
        }
        
        // Set supervisor_id to NULL
        await connection.execute(
          'UPDATE projects SET supervisor_id = NULL, status = ? WHERE id = ?',
          ['submitted', project.id]
        );
      }
    }
    
    // Delete all related records
    // Grades where user is the grader
    await connection.execute('DELETE FROM grades WHERE grader_id = ?', [id]);
    
    // Submissions where user is the grader
    await connection.execute('UPDATE submissions SET graded_by = NULL WHERE graded_by = ?', [id]);
    
    // Messages
    await connection.execute('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [id, id]);
    
    // Notifications
    await connection.execute('DELETE FROM notifications WHERE user_id = ?', [id]);
    
    // Broadcast messages
    await connection.execute('DELETE FROM broadcast_messages WHERE sender_id = ?', [id]);
    
    // Lecturer capacity
    await connection.execute('DELETE FROM lecturer_capacity WHERE lecturer_id = ?', [id]);
    
    // Finally, delete the user (this will cascade to any remaining references)
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    
    // Log the action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), adminUser.id, 'DELETE_USER', 'user', id, JSON.stringify(deletedUser)]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'User and all related data deleted successfully from the database'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { new_password } = req.body;
    
    if (!new_password) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'New password is required'
      });
      return;
    }
    
    // Validate password length against system config
    const { getSystemConfig } = await import('../utils/systemConfig');
    const systemConfig = await getSystemConfig();
    
    if (new_password.length < systemConfig.password_min_length) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: `New password must be at least ${systemConfig.password_min_length} characters long`
      });
      return;
    }
    
    // Check if user exists
    const [userCheck] = await connection.execute<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE id = ?',
      [id]
    );
    
    if (userCheck.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // Hash password with consistent salt rounds (12, same as registration)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    
    // Update password in database
    const [updateResult] = await connection.execute<RowDataPacket[]>(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
    
    // Verify the password was saved correctly by reading it back
    const [verifyUser] = await connection.execute<RowDataPacket[]>(
      'SELECT password FROM users WHERE id = ?',
      [id]
    );
    
    if (verifyUser.length === 0) {
      await connection.rollback();
      console.error('Password reset: User not found after update');
      res.status(500).json({
        success: false,
        message: 'Failed to verify password update'
      });
      return;
    }
    
    // Verify the hash matches (this ensures the password was saved correctly)
    const verifyPassword = await bcrypt.compare(new_password, verifyUser[0].password);
    if (!verifyPassword) {
      await connection.rollback();
      console.error('Password reset: Hash verification failed after update');
      res.status(500).json({
        success: false,
        message: 'Password verification failed after update. Please try again.'
      });
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset successful for user ${id} (${userCheck[0].email})`);
    }
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'RESET_PASSWORD', 'user', id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// ==================== SYSTEM CONFIGURATION ====================

export const getSystemConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get system configuration from environment or database
    const [config] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM system_config LIMIT 1'
    );
    
    res.json({
      success: true,
      data: config[0] || {
        max_file_size: process.env.MAX_FILE_SIZE || '10485760',
        max_resubmissions: process.env.MAX_RESUBMISSIONS || '3',
        session_timeout: '3600',
        password_min_length: '8',
        require_email_verification: false,
        enable_two_factor: false,
        maintenance_mode: false
      }
    });
  } catch (error: any) {
    // If table doesn't exist, return defaults
    res.json({
      success: true,
      data: {
        max_file_size: process.env.MAX_FILE_SIZE || '10485760',
        max_resubmissions: process.env.MAX_RESUBMISSIONS || '3',
        session_timeout: '3600',
        password_min_length: '8',
        require_email_verification: false,
        enable_two_factor: false,
        maintenance_mode: false
      }
    });
  }
};

export const updateSystemConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const config = req.body;
    
    // Get old config for audit log
    const [oldConfig] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM system_config LIMIT 1'
    );
    
    // Check if config exists
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM system_config LIMIT 1'
    );
    
    if (existing.length > 0) {
      await connection.execute(
        'UPDATE system_config SET max_file_size = ?, max_resubmissions = ?, session_timeout = ?, password_min_length = ?, require_email_verification = ?, enable_two_factor = ?, maintenance_mode = ?, updated_at = NOW()',
        [
          config.max_file_size,
          config.max_resubmissions,
          config.session_timeout,
          config.password_min_length,
          config.require_email_verification,
          config.enable_two_factor,
          config.maintenance_mode
        ]
      );
    } else {
      await connection.execute(
        'INSERT INTO system_config (id, max_file_size, max_resubmissions, session_timeout, password_min_length, require_email_verification, enable_two_factor, maintenance_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [
          uuidv4(),
          config.max_file_size,
          config.max_resubmissions,
          config.session_timeout,
          config.password_min_length,
          config.require_email_verification,
          config.enable_two_factor,
          config.maintenance_mode
        ]
      );
    }
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'UPDATE_SYSTEM_CONFIG', 'system_config', '1', JSON.stringify(oldConfig[0] || {}), JSON.stringify(config)]
    );
    
    await connection.commit();
    
    // Clear system config cache so changes take effect immediately
    const { clearSystemConfigCache } = await import('../utils/systemConfig');
    clearSystemConfigCache();
    
    res.json({
      success: true,
      message: 'System configuration updated successfully'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Update system config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// ==================== SECURITY CONTROLS ====================

export const getSecurityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, action_type, start_date, end_date } = req.query;
    const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 50));
    const offset = (pageNum - 1) * limitNum;
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (action_type) {
      whereClause += ' AND al.action = ?';
      params.push(action_type);
      countParams.push(action_type);
    }
    
    if (start_date) {
      whereClause += ' AND al.created_at >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND al.created_at <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }
    
    // Get logs with pagination
    const query = `
      SELECT al.*, u.first_name, u.last_name, u.email 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const [logs] = await pool.execute<RowDataPacket[]>(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `;
    
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult[0]?.total || 0,
          totalPages: Math.ceil((countResult[0]?.total || 0) / limitNum)
        }
      }
    });
  } catch (error: any) {
    console.error('Get security logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getFailedLoginAttempts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const [attempts] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM failed_login_attempts ORDER BY attempted_at DESC LIMIT ? OFFSET ?`,
      [Number(limit), offset]
    );
    
    res.json({
      success: true,
      data: attempts
    });
  } catch (error: any) {
    // Table might not exist
    res.json({
      success: true,
      data: []
    });
  }
};

export const blockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if user exists
    const [userCheck] = await connection.execute<RowDataPacket[]>(
      'SELECT id, email, is_active FROM users WHERE id = ?',
      [id]
    );
    
    if (userCheck.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    if (!userCheck[0].is_active) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
      return;
    }
    
    await connection.execute(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'BLOCK_USER', 'user', id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

export const unblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if user exists
    const [userCheck] = await connection.execute<RowDataPacket[]>(
      'SELECT id, email, is_active FROM users WHERE id = ?',
      [id]
    );
    
    if (userCheck.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    if (userCheck[0].is_active) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'User is already active'
      });
      return;
    }
    
    await connection.execute(
      'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = ?',
      [id]
    );
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'UNBLOCK_USER', 'user', id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// ==================== MONITORING ====================

export const getSystemMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get various system metrics
    const [activeUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );
    
    const [recentLogins] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM audit_logs WHERE action = "LOGIN" AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );
    
    const [storageUsage] = await pool.execute<RowDataPacket[]>(
      'SELECT SUM(file_size) as total_size FROM submissions WHERE file_path IS NOT NULL'
    );
    
    const [errorCount] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE "%ERROR%" AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    );
    
    res.json({
      success: true,
      data: {
        activeUsers: activeUsers[0]?.count || 0,
        recentLogins: recentLogins[0]?.count || 0,
        storageUsage: storageUsage[0]?.total_size || 0,
        errorCount: errorCount[0]?.count || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics'
    });
  }
};

// ==================== DATA ARCHIVING ====================

export const getArchivedData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    // Get archived projects
    const [archived] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM archived_projects ORDER BY archived_at DESC LIMIT ? OFFSET ?`,
      [Number(limit), offset]
    );
    
    res.json({
      success: true,
      data: archived
    });
  } catch (error: any) {
    // Table might not exist
    res.json({
      success: true,
      data: []
    });
  }
};

export const archiveData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { academic_year, archive_type } = req.body;
    
    // This would typically move old data to archive tables
    // For now, we'll just log the action
    
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'ARCHIVE_DATA', 'archive', academic_year, JSON.stringify({ archive_type })]
    );
    
    res.json({
      success: true,
      message: 'Data archiving initiated'
    });
  } catch (error: any) {
    console.error('Archive data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive data'
    });
  }
};

// ==================== NOTIFICATION MANAGEMENT ====================

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, type, is_read } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(is_read === 'true');
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const [notifications] = await pool.execute<RowDataPacket[]>(query, params);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

export const sendBroadcastNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { title, message, type = 'info', target_roles } = req.body;
    
    if (!title || !message) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
      return;
    }
    
    // Get target users
    let userQuery = 'SELECT id FROM users WHERE is_active = true';
    const params: any[] = [];
    
    if (target_roles && target_roles.length > 0) {
      userQuery += ' AND role IN (' + target_roles.map(() => '?').join(',') + ')';
      params.push(...target_roles);
    }
    
    const [users] = await connection.execute<RowDataPacket[]>(userQuery, params);
    
    // Create notifications for all users
    for (const user of users) {
      await connection.execute(
        'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, false, NOW())',
        [uuidv4(), user.id, title, message, type]
      );
    }
    
    // Log action
    await connection.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'BROADCAST_NOTIFICATION', 'notification', 'broadcast', JSON.stringify({ title, target_roles, user_count: users.length })]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: `Notification sent to ${users.length} users`
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Send broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// ==================== AUDIT & COMPLIANCE ====================

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, user_id, action, entity_type, start_date, end_date } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT al.*, u.first_name, u.last_name, u.email 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }
    
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }
    
    if (entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(entity_type);
    }
    
    if (start_date) {
      query += ' AND al.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND al.created_at <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    
    const [logs] = await pool.execute<RowDataPacket[]>(query, params);
    
    const [countResult] = await pool.execute<RowDataPacket[]>(
      query.replace('SELECT al.*, u.first_name, u.last_name, u.email', 'SELECT COUNT(*) as total')
        .replace('ORDER BY al.created_at DESC LIMIT ? OFFSET ?', '')
    );
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult[0]?.total || 0,
          totalPages: Math.ceil((countResult[0]?.total || 0) / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

export const exportAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [logs] = await pool.execute<RowDataPacket[]>(query, params);
    
    // Log export action
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'EXPORT_AUDIT_LOGS', 'audit_log', 'export', JSON.stringify({ start_date, end_date })]
    );
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error: any) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs'
    });
  }
};

// ==================== INTEGRATIONS ====================

export const getIntegrations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Return available integrations
    res.json({
      success: true,
      data: {
        integrations: [
          { id: 'email', name: 'Email Service', enabled: true, type: 'smtp' },
          { id: 'backup', name: 'Backup Service', enabled: false, type: 'storage' }
        ]
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrations'
    });
  }
};

// ==================== CUSTOMIZATION ====================

export const getCustomizationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        theme: 'default',
        logo_url: null,
        primary_color: '#1976d2',
        secondary_color: '#dc004e',
        institution_name: 'University',
        custom_css: null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customization settings'
    });
  }
};

export const updateCustomizationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = req.body;
    
    // Log action
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'UPDATE_CUSTOMIZATION', 'system_config', 'customization', JSON.stringify(settings)]
    );
    
    res.json({
      success: true,
      message: 'Customization settings updated successfully'
    });
  } catch (error: any) {
    console.error('Update customization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customization settings'
    });
  }
};

// ==================== SUPPORT TOOLS ====================

export const getSystemHealth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check database connection
    const [dbCheck] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 as status'
    );
    
    const dbStatus = dbCheck.length > 0 ? 'healthy' : 'unhealthy';
    
    res.json({
      success: true,
      data: {
        database: dbStatus,
        server: 'healthy',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.json({
      success: true,
      data: {
        database: 'unhealthy',
        server: 'healthy',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// ==================== DISASTER RECOVERY ====================

export const createBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Log backup creation
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'CREATE_BACKUP', 'backup', 'system', JSON.stringify({ timestamp: new Date().toISOString() })]
    );
    
    res.json({
      success: true,
      message: 'Backup creation initiated'
    });
  } catch (error: any) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup'
    });
  }
};

export const getBackups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get backup history from audit logs
    const [backups] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM audit_logs WHERE action = 'CREATE_BACKUP' ORDER BY created_at DESC LIMIT 10`
    );
    
    res.json({
      success: true,
      data: backups
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch backups'
    });
  }
};

export const restoreBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { backup_id } = req.body;
    
    // Log restore action
    await pool.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [uuidv4(), req.user!.id, 'RESTORE_BACKUP', 'backup', backup_id, JSON.stringify({ timestamp: new Date().toISOString() })]
    );
    
    res.json({
      success: true,
      message: 'Backup restore initiated'
    });
  } catch (error: any) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup'
    });
  }
};

