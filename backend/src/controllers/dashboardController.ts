import { Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';

// Get dashboard data based on user role
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    switch (user.role) {
      case 'student':
        await getStudentDashboard(req, res);
        break;
      case 'lecturer':
        await getLecturerDashboard(req, res);
        break;
      case 'coordinator':
        // Coordinator dashboard is in coordinatorController
        res.redirect('/api/coordinator/dashboard');
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Invalid user role'
        });
    }
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching dashboard data'
    });
  }
};

// Student dashboard
const getStudentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Get active academic year
  const [activeYear] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM academic_year_config WHERE is_active = true LIMIT 1'
  );

  // Get student's project
  const [projects] = await pool.execute<RowDataPacket[]>(`
    SELECT p.*, 
           l.first_name as supervisor_first_name,
           l.last_name as supervisor_last_name,
           l.email as supervisor_email
    FROM projects p
    LEFT JOIN users l ON p.supervisor_id = l.id
    WHERE p.student_id = ?
    ORDER BY p.created_at DESC
    LIMIT 1
  `, [user.id]);

  const project = projects.length > 0 ? projects[0] : null;

  // Get submissions with marks from both submissions table and grades table
  // Also include start/end dates from academic_year_config for submission window validation
  let submissions: RowDataPacket[] = [];
  if (project && activeYear.length > 0) {
    const config = activeYear[0];
    const [subs] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, 
             COALESCE(s.marks, g.marks) as marks,
             s.feedback,
             g.is_published,
             s.graded_at
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.project_id = ?
      ORDER BY s.created_at ASC
    `, [project.id]);
    
    // Add start/end dates from academic_year_config based on submission type
    submissions = subs.map((sub: any) => {
      let startDate = null;
      let endDate = sub.deadline; // Default to deadline from submissions table
      
      // Map submission types to academic year deadline fields
      const deadlineMap: Record<string, { start: string | null; end: string | null }> = {
        alpha: { start: config.alpha_deadline_start || null, end: config.alpha_deadline_end || config.alpha_deadline || null },
        beta: { start: config.beta_deadline_start || null, end: config.beta_deadline_end || config.beta_deadline || null },
        presentation: { start: config.presentation_start || null, end: config.presentation_end || null },
        final: { start: config.final_deadline_start || null, end: config.final_deadline_end || config.final_deadline || null },
        project_management: { start: config.final_deadline_start || null, end: config.final_deadline_end || config.final_deadline || null }
      };
      
      const deadlines = deadlineMap[sub.submission_type];
      if (deadlines) {
        startDate = deadlines.start;
        endDate = deadlines.end || sub.deadline;
      }
      
      return {
        ...sub,
        submission_start_date: startDate,
        submission_end_date: endDate
      };
    });
  } else if (project) {
    // If no active year, just get submissions without start/end dates
    const [subs] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, 
             COALESCE(s.marks, g.marks) as marks,
             s.feedback,
             g.is_published,
             s.graded_at
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.project_id = ?
      ORDER BY s.created_at ASC
    `, [project.id]);
    submissions = subs;
  }

  // Get unread messages count
  const [messages] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = false',
    [user.id]
  );

  // Get unread notifications count
  const [notifications] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
    [user.id]
  );

  // Get upcoming deadlines
  const deadlines: { type: string; date: Date; status: string }[] = [];
  if (activeYear.length > 0) {
    const config = activeYear[0];
    
    if (!project) {
      const submissionEnd = new Date(config.topic_submission_end);
      if (submissionEnd > new Date()) {
        deadlines.push({
          type: 'Topic Submission',
          date: submissionEnd,
          status: 'pending'
        });
      }
    } else {
      submissions.forEach((sub: any) => {
        const deadline = new Date(sub.deadline);
        if (deadline > new Date() || sub.status === 'pending') {
          deadlines.push({
            type: sub.submission_type.charAt(0).toUpperCase() + sub.submission_type.slice(1),
            date: deadline,
            status: sub.status
          });
        }
      });
    }
  }

  // Get presentation schedule if exists
  let presentationSchedule = null;
  if (project) {
    const [schedule] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM presentation_schedules WHERE project_id = ?',
      [project.id]
    );
    presentationSchedule = schedule.length > 0 ? schedule[0] : null;
  }

  // Calculate grades summary
  let gradesSummary = null;
  if (project) {
    const publishedGrades = submissions.filter((s: any) => s.is_published && s.marks !== null);
    if (publishedGrades.length > 0) {
      const totalMarks = publishedGrades.reduce((sum: number, s: any) => sum + (s.marks || 0), 0);
      const totalMaxMarks = publishedGrades.reduce((sum: number, s: any) => sum + (s.max_marks || 0), 0);
      gradesSummary = {
        obtained: totalMarks,
        total: totalMaxMarks,
        percentage: totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0
      };
    }
  }

  res.json({
    success: true,
    data: {
      academicYear: activeYear.length > 0 ? activeYear[0] : null,
      project,
      submissions: submissions.map((s: any) => ({
        ...s,
        marks: s.is_published ? s.marks : null
      })),
      unreadMessages: messages[0].count,
      unreadNotifications: notifications[0].count,
      deadlines,
      presentationSchedule,
      gradesSummary,
      canSubmitTopic: activeYear.length > 0 && 
        (() => {
          const config = activeYear[0];
          const topicStart = new Date(config.topic_submission_start);
          const topicEnd = new Date(config.topic_submission_end);
          const now = new Date();
          
          // If start and end dates are the same, window is locked (closed)
          if (topicStart.getTime() === topicEnd.getTime()) {
            return false;
          }
          
          // Check if current time is within the window (exclusive of end time)
          return now >= topicStart && 
                 now < topicEnd && 
                 (!project || project.status === 'rejected');
        })()
    }
  });
};

// Lecturer dashboard
const getLecturerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Get active academic year
  const [activeYear] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM academic_year_config WHERE is_active = true LIMIT 1'
  );

  const academicYear = activeYear.length > 0 ? activeYear[0].year : null;

  // Get pending project reviews (includes projects forwarded by coordinator)
  const [pendingReviews] = await pool.execute<RowDataPacket[]>(`
    SELECT COUNT(*) as count FROM projects
    WHERE status IN ('submitted', 'under_review')
    AND (
      supervisor_preference_1 = ? 
      OR supervisor_preference_2 = ? 
      OR supervisor_preference_3 = ?
      OR (supervisor_id = ? AND status = 'under_review')
    )
    AND academic_year = ?
  `, [user.id, user.id, user.id, user.id, academicYear]);

  // Get supervised students count
  const [supervisedStudents] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM projects WHERE supervisor_id = ? AND academic_year = ?',
    [user.id, academicYear]
  );

  // Get capacity
  const [capacity] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM lecturer_capacity WHERE lecturer_id = ? AND academic_year = ?',
    [user.id, academicYear]
  );

  // Get pending gradings
  const [pendingGrading] = await pool.execute<RowDataPacket[]>(`
    SELECT COUNT(*) as count FROM submissions s
    JOIN projects p ON s.project_id = p.id
    WHERE p.supervisor_id = ? AND s.status = 'submitted'
  `, [user.id]);

  // Get upcoming presentations
  const [upcomingPresentations] = await pool.execute<RowDataPacket[]>(`
    SELECT ps.*, p.title as project_title,
           u.first_name as student_first_name,
           u.last_name as student_last_name
    FROM presentation_schedules ps
    JOIN projects p ON ps.project_id = p.id
    JOIN users u ON p.student_id = u.id
    WHERE (p.supervisor_id = ? OR JSON_CONTAINS(ps.panel_members, ?))
    AND ps.scheduled_date >= CURDATE()
    AND ps.status = 'scheduled'
    ORDER BY ps.scheduled_date, ps.start_time
    LIMIT 5
  `, [user.id, JSON.stringify(user.id)]);

  // Get recent submissions from supervisees
  const [recentSubmissions] = await pool.execute<RowDataPacket[]>(`
    SELECT s.*, p.title as project_title,
           u.first_name as student_first_name,
           u.last_name as student_last_name
    FROM submissions s
    JOIN projects p ON s.project_id = p.id
    JOIN users u ON p.student_id = u.id
    WHERE p.supervisor_id = ? AND s.submitted_at IS NOT NULL
    ORDER BY s.submitted_at DESC
    LIMIT 10
  `, [user.id]);

  // Get supervisee list with their submissions
  const [superviseesRaw] = await pool.execute<RowDataPacket[]>(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.student_id,
           p.id as project_id, p.title as project_title, p.status as project_status
    FROM users u
    JOIN projects p ON u.id = p.student_id
    WHERE p.supervisor_id = ? AND p.academic_year = ?
    ORDER BY u.last_name, u.first_name
  `, [user.id, academicYear]);

  // Get submissions for each supervisee with grade info
  const supervisees = await Promise.all(superviseesRaw.map(async (student: any) => {
    const [submissions] = await pool.execute<RowDataPacket[]>(`
      SELECT s.id, s.submission_type, s.status, s.marks, s.max_marks, 
             s.file_path, s.file_name, s.submitted_at, s.feedback, s.deadline,
             g.is_published, g.marks as graded_marks
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.project_id = ?
      ORDER BY s.created_at ASC
    `, [student.project_id]);

    // Use graded marks if available, otherwise use submission marks
    const processedSubmissions = submissions.map((s: any) => ({
      ...s,
      marks: s.graded_marks !== null ? s.graded_marks : s.marks,
      is_published: s.is_published || false
    }));

    return {
      ...student,
      submissions: processedSubmissions
    };
  }));

  // Get unread messages count
  const [messages] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = false',
    [user.id]
  );

  // Get unread notifications count
  const [notifications] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
    [user.id]
  );

  // Get projects pending my review (includes projects forwarded by coordinator)
  const [projectsForReview] = await pool.execute<RowDataPacket[]>(`
    SELECT p.*, u.first_name as student_first_name, u.last_name as student_last_name,
           u.email as student_email, u.student_id as student_matric
    FROM projects p
    JOIN users u ON p.student_id = u.id
    WHERE p.status IN ('submitted', 'under_review')
    AND (
      p.supervisor_preference_1 = ? 
      OR p.supervisor_preference_2 = ? 
      OR p.supervisor_preference_3 = ?
      OR (p.supervisor_id = ? AND p.status = 'under_review')
    )
    AND p.academic_year = ?
    ORDER BY p.created_at ASC
  `, [user.id, user.id, user.id, user.id, academicYear]);

  // Use actual supervisees count for consistency
  const actualSuperviseeCount = supervisees.length;

  res.json({
    success: true,
    data: {
      academicYear: activeYear.length > 0 ? activeYear[0] : null,
      pendingReviews: pendingReviews[0].count,
      supervisedStudents: actualSuperviseeCount,
      maxCapacity: capacity.length > 0 ? capacity[0].max_students : 10,
      currentLoad: actualSuperviseeCount, // Use actual count for consistency
      pendingGrading: pendingGrading[0].count,
      upcomingPresentations,
      recentSubmissions,
      supervisees,
      projectsForReview,
      unreadMessages: messages[0].count,
      unreadNotifications: notifications[0].count
    }
  });
};

