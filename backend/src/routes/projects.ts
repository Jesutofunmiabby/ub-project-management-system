import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  reviewProject,
  getAvailableLecturers,
  checkDuplicate
} from '../controllers/projectController';
import { authenticate, authorize } from '../middleware/auth';
import { projectValidation, uuidParamValidation, paginationValidation } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all projects (filtered by role)
router.get('/', paginationValidation, getProjects);

// Get available lecturers for supervision
router.get('/lecturers/available', getAvailableLecturers);

// Check for duplicate topics
router.post('/check-duplicate', checkDuplicate);

// Get single project
router.get('/:id', uuidParamValidation('id'), getProject);

// Create new project (Students only)
router.post('/', authorize('student'), projectValidation, createProject);

// Update project
router.put('/:id', uuidParamValidation('id'), updateProject);

// Review project (Lecturers and Coordinators)
router.post('/:id/review', authorize('lecturer', 'coordinator'), uuidParamValidation('id'), reviewProject);

export default router;

