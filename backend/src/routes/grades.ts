import { Router } from 'express';
import {
  getProjectGrades,
  publishGrades,
  getGradeStatistics,
  updateGrade
} from '../controllers/gradeController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get grades for a project
router.get('/project/:projectId', getProjectGrades);

// Publish/Reveal grades (Coordinator or Lecturer)
router.post('/publish', authorize('coordinator', 'lecturer'), publishGrades);

// Get grade statistics (Coordinator only)
router.get('/statistics', authorize('coordinator'), getGradeStatistics);

// Update grade
router.put('/:gradeId', authorize('lecturer', 'coordinator'), updateGrade);

export default router;

