import { Router } from 'express';
import {
  getDashboard,
  configureAcademicYear,
  getAcademicYears,
  setLecturerCapacity,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  schedulePresentations,
  getPresentationSchedules,
  getAuditLogs,
  assignSupervisor,
  getProjectsWithGrades,
  getSimilarProjects
} from '../controllers/coordinatorController';
import { authenticate, authorize } from '../middleware/auth';
import { academicYearValidation } from '../middleware/validation';

const router = Router();

// All routes require authentication and coordinator role
router.use(authenticate);
router.use(authorize('coordinator'));

// Dashboard
router.get('/dashboard', getDashboard);

// Academic year configuration
router.get('/academic-years', getAcademicYears);
router.post('/academic-years', academicYearValidation, configureAcademicYear);

// User management (CRUD)
router.get('/users', getUsers);
router.get('/users/:userId', getUserById);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId/toggle-status', toggleUserStatus);

// Lecturer capacity
router.put('/lecturers/:lecturerId/capacity', setLecturerCapacity);

// Supervisor assignment
router.post('/projects/:projectId/assign-supervisor', assignSupervisor);

// Assessment (Projects with grades)
router.get('/projects/assessment', getProjectsWithGrades);
router.get('/projects/:projectId/similar', getSimilarProjects);
router.get('/projects/:projectId/similar', getSimilarProjects);

// Presentation scheduling
router.get('/presentations', getPresentationSchedules);
router.post('/presentations', schedulePresentations);

// Audit logs
router.get('/audit-logs', getAuditLogs);

export default router;

