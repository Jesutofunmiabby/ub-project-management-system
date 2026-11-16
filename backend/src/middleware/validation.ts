import { body, param, query, ValidationChain } from 'express-validator';

// User validation rules
export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .isIn(['student', 'lecturer', 'coordinator'])
    .withMessage('Invalid role specified'),
  body('student_id')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Student ID must be between 5 and 20 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name must not exceed 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Project validation rules
export const projectValidation: ValidationChain[] = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Project title must be between 10 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 200 })
    .withMessage('Project description must be at least 200 characters'),
  body('problem_statement')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Problem statement must be at least 50 characters'),
  body('objectives')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Objectives must be at least 50 characters'),
  body('methodology')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Methodology must be at least 50 characters'),
  body('supervisor_preference_1')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '' || value === null || value === undefined) {
        return true; // Empty values are allowed
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    })
    .withMessage('Invalid supervisor ID format'),
  body('supervisor_preference_2')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '' || value === null || value === undefined) {
        return true; // Empty values are allowed
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    })
    .withMessage('Invalid supervisor ID format'),
  body('supervisor_preference_3')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '' || value === null || value === undefined) {
        return true; // Empty values are allowed
      }
      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    })
    .withMessage('Invalid supervisor ID format'),
  body('originality_declared')
    .custom((value) => {
      // Accept boolean true, string "true", or 1
      if (value === true || value === 'true' || value === 1 || value === '1') {
        return true;
      }
      throw new Error('You must declare the originality of your work');
    })
];

// Grade validation rules
export const gradeValidation: ValidationChain[] = [
  body('marks')
    .isFloat({ min: 0 })
    .withMessage('Marks must be a positive number'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Feedback must not exceed 2000 characters'),
  body('rubric_scores')
    .optional()
    .isObject()
    .withMessage('Rubric scores must be an object')
];

// Message validation rules
export const messageValidation: ValidationChain[] = [
  body('receiver_id')
    .isUUID()
    .withMessage('Invalid receiver ID'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must not exceed 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters')
];

// Academic year configuration validation
export const academicYearValidation: ValidationChain[] = [
  body('year')
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Academic year must be in format YYYY/YYYY (e.g., 2024/2025)'),
  body('topic_submission_start')
    .isISO8601()
    .withMessage('Invalid date format for topic submission start'),
  body('topic_submission_end')
    .isISO8601()
    .withMessage('Invalid date format for topic submission end')
    .custom((value, { req }) => {
      // Only validate if both dates are valid ISO8601 strings
      if (req.body.topic_submission_start && value) {
        const startDate = new Date(req.body.topic_submission_start);
        const endDate = new Date(value);
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return true; // Let ISO8601 validation handle invalid dates
        }
        // End date/time must be strictly greater than start date/time
        // This allows same-day dates if end time is after start time
        if (endDate.getTime() <= startDate.getTime()) {
          throw new Error('Topic submission end date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.');
        }
      }
      return true;
    }),
  // Old deadline fields are now optional (for backward compatibility)
  body('alpha_deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for alpha deadline'),
  body('beta_deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for beta deadline'),
  body('presentation_start')
    .isISO8601()
    .withMessage('Invalid date format for presentation start'),
  body('presentation_end')
    .isISO8601()
    .withMessage('Invalid date format for presentation end')
    .custom((value, { req }) => {
      // Only validate if both dates are valid ISO8601 strings
      if (req.body.presentation_start && value) {
        const startDate = new Date(req.body.presentation_start);
        const endDate = new Date(value);
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return true; // Let ISO8601 validation handle invalid dates
        }
        // End date/time must be strictly greater than start date/time
        // This allows same-day dates if end time is after start time
        if (endDate.getTime() <= startDate.getTime()) {
          throw new Error('Presentation end date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.');
        }
      }
      return true;
    }),
  body('final_deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for final deadline'),
  // New start/end date fields
  body('alpha_deadline_start')
    .isISO8601()
    .withMessage('Invalid date format for alpha deadline start'),
  body('alpha_deadline_end')
    .isISO8601()
    .withMessage('Invalid date format for alpha deadline end')
    .custom((value, { req }) => {
      // Only validate if both dates are valid ISO8601 strings
      if (req.body.alpha_deadline_start && value) {
        const startDate = new Date(req.body.alpha_deadline_start);
        const endDate = new Date(value);
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return true; // Let ISO8601 validation handle invalid dates
        }
        // End date/time must be strictly greater than start date/time
        // This allows same-day dates if end time is after start time
        if (endDate.getTime() <= startDate.getTime()) {
          throw new Error('Alpha deadline end date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.');
        }
      }
      return true;
    }),
  body('beta_deadline_start')
    .isISO8601()
    .withMessage('Invalid date format for beta deadline start'),
  body('beta_deadline_end')
    .isISO8601()
    .withMessage('Invalid date format for beta deadline end')
    .custom((value, { req }) => {
      // Only validate if both dates are valid ISO8601 strings
      if (req.body.beta_deadline_start && value) {
        const startDate = new Date(req.body.beta_deadline_start);
        const endDate = new Date(value);
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return true; // Let ISO8601 validation handle invalid dates
        }
        // End date/time must be strictly greater than start date/time
        // This allows same-day dates if end time is after start time
        if (endDate.getTime() <= startDate.getTime()) {
          throw new Error('Beta deadline end date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.');
        }
      }
      return true;
    }),
  body('final_deadline_start')
    .isISO8601()
    .withMessage('Invalid date format for final deadline start'),
  body('final_deadline_end')
    .isISO8601()
    .withMessage('Invalid date format for final deadline end')
    .custom((value, { req }) => {
      // Only validate if both dates are valid ISO8601 strings
      if (req.body.final_deadline_start && value) {
        const startDate = new Date(req.body.final_deadline_start);
        const endDate = new Date(value);
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return true; // Let ISO8601 validation handle invalid dates
        }
        // End date/time must be strictly greater than start date/time
        // This allows same-day dates if end time is after start time
        if (endDate.getTime() <= startDate.getTime()) {
          throw new Error('Final deadline end date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.');
        }
      }
      return true;
    }),
  body('max_supervisor_load')
    .isInt({ min: 1, max: 50 })
    .withMessage('Max supervisor load must be between 1 and 50')
];

// Pagination validation
export const paginationValidation: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// UUID parameter validation
export const uuidParamValidation = (paramName: string): ValidationChain[] => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName} format`)
];

