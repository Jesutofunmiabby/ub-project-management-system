import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, User, UserRole } from '../types';
import { config } from '../config/env';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

// Verify JWT token
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check maintenance mode (allow admin access)
    const { getSystemConfig } = await import('../utils/systemConfig');
    const systemConfig = await getSystemConfig();
    
    if (systemConfig.maintenance_mode) {
      // Check if user is admin (only admins can access during maintenance)
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(503).json({
          success: false,
          message: 'System is currently under maintenance. Please try again later.'
        });
        return;
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
        const [rows] = await pool.execute<RowDataPacket[]>(
          'SELECT * FROM users WHERE id = ? AND is_active = true',
          [decoded.userId]
        );

        if (rows.length === 0 || rows[0].role !== 'admin') {
          res.status(503).json({
            success: false,
            message: 'System is currently under maintenance. Only administrators can access the system.'
          });
          return;
        }
      } catch {
        res.status(503).json({
          success: false,
          message: 'System is currently under maintenance. Please try again later.'
        });
        return;
      }
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      
      // Fetch user from database
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? AND is_active = true',
        [decoded.userId]
      );

      if (rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid token. User not found or inactive.'
        });
        return;
      }

      req.user = rows[0] as User;
      next();
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Role-based authorization
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
      return;
    }

    next();
  };
};

// Generate JWT token
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? AND is_active = true',
        [decoded.userId]
      );

      if (rows.length > 0) {
        req.user = rows[0] as User;
      }
    } catch {
      // Token invalid, continue without user
    }
    
    next();
  } catch (error) {
    next();
  }
};

