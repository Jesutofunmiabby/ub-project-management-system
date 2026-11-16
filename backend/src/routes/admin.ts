import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// System Configuration
router.get('/system/config', adminController.getSystemConfig);
router.put('/system/config', adminController.updateSystemConfig);

// Security Controls
router.get('/security/logs', adminController.getSecurityLogs);
router.get('/security/failed-logins', adminController.getFailedLoginAttempts);
router.post('/security/users/:id/block', adminController.blockUser);
router.post('/security/users/:id/unblock', adminController.unblockUser);

// Monitoring
router.get('/monitoring/metrics', adminController.getSystemMetrics);

// Data Archiving
router.get('/archive', adminController.getArchivedData);
router.post('/archive', adminController.archiveData);

// Notification Management
router.get('/notifications', adminController.getNotifications);
router.post('/notifications/broadcast', adminController.sendBroadcastNotification);

// Audit & Compliance
router.get('/audit/logs', adminController.getAuditLogs);
router.get('/audit/export', adminController.exportAuditLogs);

// Integrations
router.get('/integrations', adminController.getIntegrations);

// Customization
router.get('/customization', adminController.getCustomizationSettings);
router.put('/customization', adminController.updateCustomizationSettings);

// Support Tools
router.get('/support/health', adminController.getSystemHealth);

// Disaster Recovery
router.get('/backup', adminController.getBackups);
router.post('/backup', adminController.createBackup);
router.post('/backup/restore', adminController.restoreBackup);

export default router;

