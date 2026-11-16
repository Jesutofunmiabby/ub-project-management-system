import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get dashboard (role-specific)
router.get('/', authenticate, getDashboard);

export default router;

