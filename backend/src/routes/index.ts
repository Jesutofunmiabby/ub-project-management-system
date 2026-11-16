import { Router } from 'express';
import authRoutes from './auth';
import projectRoutes from './projects';
import submissionRoutes from './submissions';
import gradeRoutes from './grades';
import messageRoutes from './messages';
import notificationRoutes from './notifications';
import coordinatorRoutes from './coordinator';
import dashboardRoutes from './dashboard';
import uploadRoutes from './uploads';
import adminRoutes from './admin';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/submissions', submissionRoutes);
router.use('/grades', gradeRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/coordinator', coordinatorRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);

export default router;

