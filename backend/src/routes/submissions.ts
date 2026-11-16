import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getSubmissions,
  uploadSubmission,
  gradeSubmission,
  getSubmissionDetails,
  getPendingReviews
} from '../controllers/submissionController';
import { authenticate, authorize } from '../middleware/auth';
import { config } from '../config/env';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get submissions for a project
router.get('/project/:projectId', getSubmissions);

// Get pending reviews (Lecturers)
router.get('/pending', authorize('lecturer', 'coordinator'), getPendingReviews);

// Get submission details
router.get('/:submissionId', getSubmissionDetails);

// Upload submission document
router.post('/:submissionId/upload', authorize('student'), upload.single('document'), uploadSubmission);

// Grade submission (Lecturers)
router.post('/:submissionId/grade', authorize('lecturer', 'coordinator'), gradeSubmission);

export default router;

