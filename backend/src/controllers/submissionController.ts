import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest, Submission } from '../types';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs';

// Get submissions for a project
export const getSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const user = req.user!;

    // Check project access
    const [projects] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );

    if (projects.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const project = projects[0];

    // Authorization
    if (user.role === 'student' && project.student_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const [submissions] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, 
             g.marks as graded_marks,
             g.feedback as grade_feedback,
             g.is_published,
             u.first_name as grader_first_name,
             u.last_name as grader_last_name
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      LEFT JOIN users u ON g.grader_id = u.id
      WHERE s.project_id = ?
      ORDER BY s.created_at ASC
    `, [projectId]);

    // If student, hide grades that aren't published
    if (user.role === 'student') {
      submissions.forEach((sub: any) => {
        if (!sub.is_published) {
          delete sub.graded_marks;
          delete sub.grade_feedback;
          delete sub.marks;
        }
      });
    }

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching submissions'
    });
  }
};

// Upload submission document
export const uploadSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    // Get system configuration
    const { getSystemConfig } = await import('../utils/systemConfig');
    const systemConfig = await getSystemConfig();

    // Validate file size
    if (file.size > systemConfig.max_file_size) {
      fs.unlinkSync(file.path);
      const maxSizeMB = (systemConfig.max_file_size / 1024 / 1024).toFixed(2);
      res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${maxSizeMB} MB`
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['.pdf'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      // Delete uploaded file
      fs.unlinkSync(file.path);
      res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
      return;
    }

    // Get submission
    const [submissions] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, p.student_id, p.supervisor_id, p.status as project_status
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ?
    `, [submissionId]);

    if (submissions.length === 0) {
      fs.unlinkSync(file.path);
      res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
      return;
    }

    const submission = submissions[0] as Submission & { student_id: string; supervisor_id: string; project_status: string };

    // Authorization
    if (user.role === 'student' && submission.student_id !== user.id) {
      fs.unlinkSync(file.path);
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Check max resubmissions limit
    const currentSubmissionCount = submission.submission_count || 0;
    if (currentSubmissionCount >= systemConfig.max_resubmissions) {
      fs.unlinkSync(file.path);
      res.status(400).json({
        success: false,
        message: `Maximum resubmission limit (${systemConfig.max_resubmissions}) has been reached. You cannot submit again.`
      });
      return;
    }

    // Check if project is approved (including approved_with_modifications)
    if (!['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(submission.project_status)) {
      fs.unlinkSync(file.path);
      res.status(400).json({
        success: false,
        message: 'Project must be approved before submitting documents'
      });
      return;
    }

    // Check submission window (start and end dates from academic_year_config)
    const [activeYear] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM academic_year_config WHERE is_active = true LIMIT 1'
    );
    
    if (activeYear.length > 0) {
      const config = activeYear[0];
      const now = new Date();
      
      // Map submission types to academic year deadline fields
      const deadlineMap: Record<string, { start: string | null; end: string | null }> = {
        alpha: { start: config.alpha_deadline_start || null, end: config.alpha_deadline_end || config.alpha_deadline || null },
        beta: { start: config.beta_deadline_start || null, end: config.beta_deadline_end || config.beta_deadline || null },
        presentation: { start: config.presentation_start || null, end: config.presentation_end || null },
        final: { start: config.final_deadline_start || null, end: config.final_deadline_end || config.final_deadline || null },
        project_management: { start: config.final_deadline_start || null, end: config.final_deadline_end || config.final_deadline || null }
      };
      
      const deadlines = deadlineMap[submission.submission_type];
      if (deadlines) {
        // If start and end dates are the same (within 1 second tolerance), block submissions (window is effectively closed)
        if (deadlines.start && deadlines.end) {
          const startTime = new Date(deadlines.start).getTime();
          const endTime = new Date(deadlines.end).getTime();
          // Use 1 second tolerance to account for potential time differences
          if (Math.abs(startTime - endTime) < 1000) {
            fs.unlinkSync(file.path);
            res.status(400).json({
              success: false,
              message: `Submission window is closed. The coordinator has set the same start and end date (${new Date(deadlines.start).toLocaleString()}), indicating submissions are currently not accepted. Please contact the coordinator if you need to submit.`
            });
            return;
          }
        }
        
        // Check if submission window is open (use exclusive comparison for proper window)
        if (deadlines.start && now < new Date(deadlines.start)) {
          fs.unlinkSync(file.path);
          res.status(400).json({
            success: false,
            message: `Submission window has not opened yet. Submissions will be accepted starting from ${new Date(deadlines.start).toLocaleString()}`
          });
          return;
        }
        
        if (deadlines.end && now >= new Date(deadlines.end)) {
          fs.unlinkSync(file.path);
          res.status(400).json({
            success: false,
            message: `Submission deadline has passed. The submission window closed on ${new Date(deadlines.end).toLocaleString()}`
          });
          return;
        }
      } else {
        // Fallback to checking deadline from submissions table if no config found
        if (submission.deadline && now > new Date(submission.deadline)) {
          fs.unlinkSync(file.path);
          res.status(400).json({
            success: false,
            message: 'Submission deadline has passed'
          });
          return;
        }
      }
    } else {
      // Fallback: check deadline from submissions table if no active academic year
      if (submission.deadline && new Date() > new Date(submission.deadline)) {
        fs.unlinkSync(file.path);
        res.status(400).json({
          success: false,
          message: 'Submission deadline has passed'
        });
        return;
      }
    }

    // Store relative path from upload directory
    // file.path from multer is absolute, we need to extract relative path
    const uploadDir = config.upload.dir;
    let relativeFilePath = file.path;
    
    // If file.path is absolute and contains uploadDir, extract relative path
    if (path.isAbsolute(file.path)) {
      const normalizedUploadDir = path.normalize(uploadDir);
      const normalizedFilePath = path.normalize(file.path);
      
      if (normalizedFilePath.startsWith(normalizedUploadDir)) {
        // Extract relative path
        relativeFilePath = path.relative(normalizedUploadDir, normalizedFilePath);
        // Normalize to use forward slashes for cross-platform compatibility
        relativeFilePath = relativeFilePath.replace(/\\/g, '/');
      } else {
        // If path doesn't start with uploadDir, just use the filename
        relativeFilePath = path.basename(file.path);
      }
    } else {
      // Already relative, but ensure it doesn't start with uploadDir
      relativeFilePath = relativeFilePath.replace(uploadDir + path.sep, '').replace(uploadDir + '/', '');
    }

    // Update submission - directly set to 'submitted' status (plagiarism check removed)
    await pool.execute<ResultSetHeader>(`
      UPDATE submissions SET
        file_path = ?,
        file_name = ?,
        submission_count = submission_count + 1,
        submitted_at = CURRENT_TIMESTAMP,
        status = 'submitted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      relativeFilePath,
      file.originalname,
      submissionId
    ]);

    // Update project status to in_progress if first submission
    await pool.execute<ResultSetHeader>(
      `UPDATE projects SET status = 'in_progress' WHERE id = ? AND status = 'approved'`,
      [submission.project_id]
    );

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'UPLOAD', 'SUBMISSION', ?, ?, ?)
    `, [uuidv4(), user.id, submissionId, JSON.stringify({ filename: file.originalname }), req.ip]);

    // Notify supervisor of new submission
    if (submission.supervisor_id) {
      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type, link)
        VALUES (?, ?, 'New Submission', ?, 'info', ?)
      `, [
        uuidv4(),
        submission.supervisor_id,
        `A new ${submission.submission_type} submission is ready for review from your supervisee.`,
        `/lecturer/grade`
      ]);
    }

    // Notify student of successful submission
    await pool.execute<ResultSetHeader>(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, 'Submission Successful', ?, 'success', ?)
    `, [
      uuidv4(),
      user.id,
      `Your ${submission.submission_type} submission has been sent to your supervisor for review.`,
      `/student/submission`
    ]);

    res.json({
      success: true,
      message: 'Document uploaded successfully and sent to your supervisor',
      data: {
        status: 'submitted',
        submissionCount: submission.submission_count + 1
      }
    });
  } catch (error) {
    console.error('Upload submission error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while uploading the submission'
    });
  }
};

// Grade constraints for each submission type
const gradeConstraints: Record<string, number> = {
  alpha: 6,
  beta: 4,
  presentation: 20,
  project_management: 10,
  final: 60,
};

// Grade submission (Lecturer)
export const gradeSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const user = req.user!;
    const { marks, feedback, rubric_scores } = req.body;

    if (user.role !== 'lecturer' && user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only lecturers can grade submissions'
      });
      return;
    }

    // Get submission with project info
    const [submissions] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, p.supervisor_id, p.id as project_id, p.student_id
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ?
    `, [submissionId]);

    if (submissions.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
      return;
    }

    const submission = submissions[0];

    // Check if lecturer is supervisor or coordinator
    if (user.role === 'lecturer' && submission.supervisor_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Only the assigned supervisor can grade this submission'
      });
      return;
    }

    // Get the maximum marks based on submission type
    const maxMarks = gradeConstraints[submission.submission_type] || submission.max_marks;

    // Validate marks against constraints
    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      res.status(400).json({
        success: false,
        message: `Marks for ${submission.submission_type} must be between 0 and ${maxMarks}`
      });
      return;
    }

    // Validate decimal places (max 2)
    const decimalStr = marks.toString();
    const decimalParts = decimalStr.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      res.status(400).json({
        success: false,
        message: 'Marks can only have up to 2 decimal places'
      });
      return;
    }

    // Round to 2 decimal places for consistency
    const roundedMarks = Math.round(marks * 100) / 100;

    // Check if already graded
    const [existingGrades] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM grades WHERE submission_id = ?',
      [submissionId]
    );

    if (existingGrades.length > 0) {
      // Update existing grade
      await pool.execute<ResultSetHeader>(`
        UPDATE grades SET
          marks = ?,
          feedback = ?,
          rubric_scores = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE submission_id = ?
      `, [roundedMarks, feedback, JSON.stringify(rubric_scores || {}), submissionId]);
    } else {
      // Create new grade
      await pool.execute<ResultSetHeader>(`
        INSERT INTO grades (id, submission_id, project_id, grader_id, marks, max_marks, feedback, rubric_scores)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), submissionId, submission.project_id, user.id, roundedMarks, maxMarks, feedback, JSON.stringify(rubric_scores || {})]);
    }

    // Update submission status
    await pool.execute<ResultSetHeader>(`
      UPDATE submissions SET
        marks = ?,
        feedback = ?,
        status = 'graded',
        graded_by = ?,
        graded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [roundedMarks, feedback, user.id, submissionId]);

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'GRADE', 'SUBMISSION', ?, ?, ?)
    `, [uuidv4(), user.id, submissionId, JSON.stringify({ marks: roundedMarks, feedback }), req.ip]);

    // Notify the student that their submission has been graded (grade saved but not yet revealed)
    await pool.execute<ResultSetHeader>(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, 'Submission Graded', ?, 'info', ?)
    `, [
      uuidv4(),
      submission.student_id,
      `Your ${submission.submission_type.replace('_', ' ')} submission has been graded. Your lecturer will reveal the grade when ready.`,
      '/student/grades'
    ]);

    res.json({
      success: true,
      message: 'Submission graded successfully'
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while grading the submission'
    });
  }
};

// Get submission details with plagiarism history
export const getSubmissionDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const user = req.user!;

    const [submissions] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, 
             p.student_id, p.supervisor_id, p.title as project_title,
             u.first_name as student_first_name, u.last_name as student_last_name
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      JOIN users u ON p.student_id = u.id
      WHERE s.id = ?
    `, [submissionId]);

    if (submissions.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
      return;
    }

    const submission = submissions[0];

    // Authorization
    if (user.role === 'student' && submission.student_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Get grade if exists
    const [grades] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM grades WHERE submission_id = ?',
      [submissionId]
    );

    res.json({
      success: true,
      data: {
        ...submission,
        grade: grades.length > 0 ? grades[0] : null
      }
    });
  } catch (error) {
    console.error('Get submission details error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching submission details'
    });
  }
};

// Get pending submissions for lecturer review
export const getPendingReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    if (user.role !== 'lecturer' && user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    let query = `
      SELECT s.*, 
             p.title as project_title, p.student_id,
             u.first_name as student_first_name, 
             u.last_name as student_last_name,
             u.student_id as student_matric
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      JOIN users u ON p.student_id = u.id
      WHERE s.status = 'submitted'
    `;

    if (user.role === 'lecturer') {
      query += ` AND p.supervisor_id = ?`;
    }

    query += ' ORDER BY s.submitted_at ASC';

    const params = user.role === 'lecturer' ? [user.id] : [];
    const [submissions] = await pool.execute<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching pending reviews'
    });
  }
};

// Plagiarism check has been disabled for direct submission to supervisor

