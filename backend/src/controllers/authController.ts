import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { validationResult } from 'express-validator';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { generateToken } from '../middleware/auth';
import { AuthRequest, User } from '../types';

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
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

    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      role, 
      student_id, 
      department, 
      phone 
    } = req.body;

    // Check if email already exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
      return;
    }

    // Check if student_id already exists (for students)
    if (role === 'student' && student_id) {
      const [existingStudents] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE student_id = ?',
        [student_id]
      );

      if (existingStudents.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Student ID is already registered'
        });
        return;
      }
    }

    // Validate password length against system config
    const { getSystemConfig } = await import('../utils/systemConfig');
    const systemConfig = await getSystemConfig();
    
    if (password.length < systemConfig.password_min_length) {
      res.status(400).json({
        success: false,
        message: `Password must be at least ${systemConfig.password_min_length} characters long`
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = uuidv4();
    await pool.execute<ResultSetHeader>(
      `INSERT INTO users (id, email, password, first_name, last_name, role, student_id, department, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, first_name, last_name, role, student_id || null, department || null, phone || null]
    );

    // If lecturer, create capacity entry using configured max_supervisor_load
    if (role === 'lecturer') {
      const [activeYear] = await pool.execute<RowDataPacket[]>(
        'SELECT year, max_supervisor_load FROM academic_year_config WHERE is_active = true LIMIT 1'
      );
      
      if (activeYear.length > 0) {
        const maxStudents = activeYear[0].max_supervisor_load || 10;
        await pool.execute<ResultSetHeader>(
          `INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students, is_available)
           VALUES (?, ?, ?, ?, 0, true)`,
          [uuidv4(), userId, activeYear[0].year, maxStudents]
        );
      }
    }

    // Generate token
    const token = generateToken(userId);

    // Log the registration
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
       VALUES (?, ?, 'CREATE', 'USER', ?, ?, ?)`,
      [uuidv4(), userId, userId, JSON.stringify({ email, role }), req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: userId,
          email,
          first_name,
          last_name,
          role,
          student_id,
          department
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
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

    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    const user = users[0] as User;

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate token
    const token = generateToken(user.id);

    // Log the login
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES (?, ?, 'LOGIN', 'USER', ?, ?, ?)`,
      [uuidv4(), user.id, user.id, req.ip, req.headers['user-agent']]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          student_id: user.student_id,
          department: user.department,
          profile_image: user.profile_image
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { password, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { first_name, last_name, phone, department } = req.body;
    const userId = req.user.id;

    await pool.execute<ResultSetHeader>(
      `UPDATE users SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        department = COALESCE(?, department),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [first_name, last_name, phone, department, userId]
    );

    // Log the update
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
       VALUES (?, ?, 'UPDATE', 'USER', ?, ?, ?)`,
      [uuidv4(), userId, userId, JSON.stringify({ first_name, last_name, phone, department }), req.ip]
    );

    // Fetch updated user
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, first_name, last_name, role, student_id, department, phone, profile_image FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: users[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile'
    });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, req.user.password);
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Validate new password length against system config
    const { getSystemConfig } = await import('../utils/systemConfig');
    const systemConfig = await getSystemConfig();
    
    if (new_password.length < systemConfig.password_min_length) {
      res.status(400).json({
        success: false,
        message: `New password must be at least ${systemConfig.password_min_length} characters long`
      });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    await pool.execute<ResultSetHeader>(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );

    // Log the password change
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address)
       VALUES (?, ?, 'PASSWORD_CHANGE', 'USER', ?, ?)`,
      [uuidv4(), userId, userId, req.ip]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing password'
    });
  }
};

// Logout (for audit purposes)
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await pool.execute<ResultSetHeader>(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address)
         VALUES (?, ?, 'LOGOUT', 'USER', ?, ?)`,
        [uuidv4(), req.user.id, req.user.id, req.ip]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout'
    });
  }
};

