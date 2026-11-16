import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validationResult } from 'express-validator';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';

// Helper function to convert ISO datetime to MySQL format
const formatDateForMySQL = (isoDate: string | Date): string => {
  const date = new Date(isoDate);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Get coordinator dashboard statistics
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Get active academic year
    const [activeYear] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM academic_year_config WHERE is_active = true LIMIT 1'
    );

    const academicYear = activeYear.length > 0 ? activeYear[0].year : null;

    // Total students
    const [students] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = true"
    );

    // Total projects
    const [projects] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM projects WHERE academic_year = ?',
      [academicYear]
    );

    // Project status breakdown
    const [statusBreakdown] = await pool.execute<RowDataPacket[]>(`
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE academic_year = ?
      GROUP BY status
    `, [academicYear]);

    // Pending approvals
    const [pendingApprovals] = await pool.execute<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM projects 
      WHERE status IN ('submitted', 'under_review') AND academic_year = ?
    `, [academicYear]);

    // Department metrics
    const [departmentMetrics] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.department,
        COUNT(DISTINCT u.id) as students,
        COUNT(DISTINCT p.id) as projects
      FROM users u
      LEFT JOIN projects p ON u.id = p.student_id AND p.academic_year = ?
      WHERE u.role = 'student' AND u.is_active = true
      GROUP BY u.department
    `, [academicYear]);

    // Recent submissions
    const [recentSubmissions] = await pool.execute<RowDataPacket[]>(`
      SELECT s.*, p.title as project_title,
             u.first_name, u.last_name
      FROM submissions s
      JOIN projects p ON s.project_id = p.id
      JOIN users u ON p.student_id = u.id
      WHERE p.academic_year = ? AND s.submitted_at IS NOT NULL
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `, [academicYear]);

    // Get max_supervisor_load from academic year config for default value
    const [academicYearConfig] = await pool.execute<RowDataPacket[]>(
      'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
      [academicYear]
    );
    const defaultMaxStudents = academicYearConfig.length > 0 ? academicYearConfig[0].max_supervisor_load : 10;

    // Supervisor workload - count actual projects for accuracy
    const [supervisorWorkload] = await pool.execute<RowDataPacket[]>(`
      SELECT u.id, u.first_name, u.last_name,
             COALESCE(lc.max_students, ?) as capacity,
             COUNT(DISTINCT p.id) as current_load
      FROM users u
      LEFT JOIN lecturer_capacity lc ON u.id = lc.lecturer_id AND lc.academic_year = ?
      LEFT JOIN projects p ON u.id = p.supervisor_id 
        AND p.academic_year = ?
        AND p.status IN ('approved', 'approved_with_modifications', 'in_progress', 'completed')
      WHERE u.role = 'lecturer' AND u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name, lc.max_students
      ORDER BY current_load DESC
    `, [defaultMaxStudents, academicYear, academicYear]);

    // Check for similar proposals (simplified check - count projects that might have similarities)
    // We'll do a more detailed check in getProjectsWithGrades, but here we can flag potential issues
    const [allProjectsForSimilarity] = await pool.execute<RowDataPacket[]>(`
      SELECT id, title, description, problem_statement, objectives, methodology, created_at
      FROM projects
      WHERE academic_year = ? AND status IN ('submitted', 'under_review', 'approved', 'approved_with_modifications')
    `, [academicYear]);

    // Quick similarity check - count projects with potential duplicates
    let similarProposalsCount = 0;
    if (allProjectsForSimilarity.length > 1) {
      const checkedIds = new Set<string>();
      for (let i = 0; i < allProjectsForSimilarity.length; i++) {
        if (checkedIds.has(allProjectsForSimilarity[i].id)) continue;
        
        const project1 = allProjectsForSimilarity[i];
        const text1 = `${project1.title} ${project1.description} ${project1.problem_statement || ''} ${project1.objectives || ''} ${project1.methodology || ''}`;
        
        for (let j = i + 1; j < allProjectsForSimilarity.length; j++) {
          const project2 = allProjectsForSimilarity[j];
          if (checkedIds.has(project2.id)) continue;
          
          const text2 = `${project2.title} ${project2.description} ${project2.problem_statement || ''} ${project2.objectives || ''} ${project2.methodology || ''}`;
          const similarity = calculateSimilarity(text1, text2);
          
          if (similarity >= 30) {
            similarProposalsCount++;
            checkedIds.add(project1.id);
            checkedIds.add(project2.id);
            break; // Only count once per project
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        academicYear: activeYear.length > 0 ? activeYear[0] : null,
        totalStudents: students[0].count,
        totalProjects: projects[0].count,
        pendingApprovals: pendingApprovals[0].count,
        similarProposalsCount,
        submissionStats: {
          submitted: statusBreakdown.find((s: any) => s.status === 'submitted')?.count || 0,
          approved: statusBreakdown.find((s: any) => s.status === 'approved')?.count || 0,
          rejected: statusBreakdown.find((s: any) => s.status === 'rejected')?.count || 0,
          inProgress: statusBreakdown.find((s: any) => s.status === 'in_progress')?.count || 0
        },
        departmentMetrics,
        recentSubmissions,
        supervisorWorkload
      }
    });
  } catch (error) {
    console.error('Get coordinator dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching dashboard data'
    });
  }
};

// Configure academic year
export const configureAcademicYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('[VALIDATION ERROR] Academic year configuration validation failed:', errors.array());
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
      return;
    }

    const user = req.user!;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can configure academic years'
      });
      return;
    }

    const {
      year,
      topic_submission_start,
      topic_submission_end,
      alpha_deadline,
      alpha_deadline_start,
      alpha_deadline_end,
      beta_deadline,
      beta_deadline_start,
      beta_deadline_end,
      presentation_start,
      presentation_end,
      final_deadline,
      final_deadline_start,
      final_deadline_end,
      max_supervisor_load,
      is_active
    } = req.body;

    // Validate date ranges: ensure end date/time is after start date/time
    // This allows same-day dates if end time is after start time
    const dateValidations = [
      { start: topic_submission_start, end: topic_submission_end, name: 'Topic Submission Period' },
      { start: alpha_deadline_start, end: alpha_deadline_end, name: 'Alpha Deadline' },
      { start: beta_deadline_start, end: beta_deadline_end, name: 'Beta Deadline' },
      { start: presentation_start, end: presentation_end, name: 'Presentation Period' },
      { start: final_deadline_start, end: final_deadline_end, name: 'Final Deadline' }
    ];

    for (const validation of dateValidations) {
      if (validation.start && validation.end) {
        const startDate = new Date(validation.start);
        const endDate = new Date(validation.end);
        // End date/time must be strictly greater than start date/time
        // This allows same-day dates if end time is after start time
        if (endDate.getTime() <= startDate.getTime()) {
          res.status(400).json({
            success: false,
            message: `${validation.name}: End date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.`
          });
          return;
        }
      }
    }

    // Check if year already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM academic_year_config WHERE year = ?',
      [year]
    );

    // Format all datetime fields for MySQL
    // Use new start/end dates if provided, otherwise fall back to single deadline for backward compatibility
    const formattedDates = {
      topic_submission_start: formatDateForMySQL(topic_submission_start),
      topic_submission_end: formatDateForMySQL(topic_submission_end),
      alpha_deadline: formatDateForMySQL(alpha_deadline || alpha_deadline_end || new Date()),
      alpha_deadline_start: alpha_deadline_start ? formatDateForMySQL(alpha_deadline_start) : null,
      alpha_deadline_end: alpha_deadline_end ? formatDateForMySQL(alpha_deadline_end) : (alpha_deadline ? formatDateForMySQL(alpha_deadline) : null),
      beta_deadline: formatDateForMySQL(beta_deadline || beta_deadline_end || new Date()),
      beta_deadline_start: beta_deadline_start ? formatDateForMySQL(beta_deadline_start) : null,
      beta_deadline_end: beta_deadline_end ? formatDateForMySQL(beta_deadline_end) : (beta_deadline ? formatDateForMySQL(beta_deadline) : null),
      presentation_start: formatDateForMySQL(presentation_start),
      presentation_end: formatDateForMySQL(presentation_end),
      final_deadline: formatDateForMySQL(final_deadline || final_deadline_end || new Date()),
      final_deadline_start: final_deadline_start ? formatDateForMySQL(final_deadline_start) : null,
      final_deadline_end: final_deadline_end ? formatDateForMySQL(final_deadline_end) : (final_deadline ? formatDateForMySQL(final_deadline) : null),
    };

    if (existing.length > 0) {
      // Update existing configuration
      await pool.execute<ResultSetHeader>(`
        UPDATE academic_year_config SET
          topic_submission_start = ?,
          topic_submission_end = ?,
          alpha_deadline = ?,
          alpha_deadline_start = ?,
          alpha_deadline_end = ?,
          beta_deadline = ?,
          beta_deadline_start = ?,
          beta_deadline_end = ?,
          presentation_start = ?,
          presentation_end = ?,
          final_deadline = ?,
          final_deadline_start = ?,
          final_deadline_end = ?,
      max_supervisor_load = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE year = ?
      `, [
        formattedDates.topic_submission_start, formattedDates.topic_submission_end,
        formattedDates.alpha_deadline, formattedDates.alpha_deadline_start, formattedDates.alpha_deadline_end,
        formattedDates.beta_deadline, formattedDates.beta_deadline_start, formattedDates.beta_deadline_end,
        formattedDates.presentation_start, formattedDates.presentation_end,
        formattedDates.final_deadline, formattedDates.final_deadline_start, formattedDates.final_deadline_end,
          max_supervisor_load, is_active || false, year
      ]);
    } else {
      // Create new configuration
      await pool.execute<ResultSetHeader>(`
        INSERT INTO academic_year_config (
          id, year, topic_submission_start, topic_submission_end,
          alpha_deadline, alpha_deadline_start, alpha_deadline_end,
          beta_deadline, beta_deadline_start, beta_deadline_end,
          presentation_start, presentation_end,
          final_deadline, final_deadline_start, final_deadline_end,
          max_supervisor_load, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), year,
        formattedDates.topic_submission_start, formattedDates.topic_submission_end,
        formattedDates.alpha_deadline, formattedDates.alpha_deadline_start, formattedDates.alpha_deadline_end,
        formattedDates.beta_deadline, formattedDates.beta_deadline_start, formattedDates.beta_deadline_end,
        formattedDates.presentation_start, formattedDates.presentation_end,
        formattedDates.final_deadline, formattedDates.final_deadline_start, formattedDates.final_deadline_end,
          max_supervisor_load, is_active || false
      ]);
    }

    // Update deadlines for existing submissions in this academic year
    // This ensures existing students see the updated deadlines
    const [existingProjects] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM projects WHERE academic_year = ?',
      [year]
    );

    if (existingProjects.length > 0) {
      // Update alpha submission deadlines (use end date if available, otherwise use single deadline)
      const alphaDeadlineToUse = formattedDates.alpha_deadline_end || formattedDates.alpha_deadline;
      await pool.execute<ResultSetHeader>(`
        UPDATE submissions s
        JOIN projects p ON s.project_id = p.id
        SET s.deadline = ?
        WHERE p.academic_year = ? AND s.submission_type = 'alpha'
      `, [alphaDeadlineToUse, year]);

      // Update beta submission deadlines (use end date if available, otherwise use single deadline)
      const betaDeadlineToUse = formattedDates.beta_deadline_end || formattedDates.beta_deadline;
      await pool.execute<ResultSetHeader>(`
        UPDATE submissions s
        JOIN projects p ON s.project_id = p.id
        SET s.deadline = ?
        WHERE p.academic_year = ? AND s.submission_type = 'beta'
      `, [betaDeadlineToUse, year]);

      // Update presentation submission deadlines
      await pool.execute<ResultSetHeader>(`
        UPDATE submissions s
        JOIN projects p ON s.project_id = p.id
        SET s.deadline = ?
        WHERE p.academic_year = ? AND s.submission_type = 'presentation'
      `, [formattedDates.presentation_end, year]);

      // Update final submission deadlines (use end date if available, otherwise use single deadline)
      const finalDeadlineToUse = formattedDates.final_deadline_end || formattedDates.final_deadline;
      await pool.execute<ResultSetHeader>(`
        UPDATE submissions s
        JOIN projects p ON s.project_id = p.id
        SET s.deadline = ?
        WHERE p.academic_year = ? AND s.submission_type IN ('final', 'project_management')
      `, [finalDeadlineToUse, year]);

      console.log(`Updated deadlines for ${existingProjects.length} existing projects in ${year}`);
    }

    // If setting as active, deactivate other years
    if (is_active) {
      await pool.execute<ResultSetHeader>(
        'UPDATE academic_year_config SET is_active = false WHERE year != ?',
        [year]
      );

      // Initialize lecturer capacities for new year
      const [lecturers] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM users WHERE role = 'lecturer' AND is_active = true"
      );

      for (const lecturer of lecturers) {
        const [existingCapacity] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM lecturer_capacity WHERE lecturer_id = ? AND academic_year = ?',
          [lecturer.id, year]
        );

        if (existingCapacity.length === 0) {
          await pool.execute<ResultSetHeader>(`
            INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students, is_available)
            VALUES (?, ?, ?, ?, 0, true)
          `, [uuidv4(), lecturer.id, year, max_supervisor_load]);
        } else {
          // Update max_students for existing capacity if max_supervisor_load changed
          await pool.execute<ResultSetHeader>(`
            UPDATE lecturer_capacity SET max_students = ? WHERE lecturer_id = ? AND academic_year = ?
          `, [max_supervisor_load, lecturer.id, year]);
        }
      }
    }

    // Notify students about the academic year configuration update
    const [activeStudents] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE is_active = true AND role = 'student'"
    );

    let studentsNotified = 0;
    for (const student of activeStudents) {
      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, 'Academic Year Updated', ?, 'info')
      `, [
        uuidv4(),
        student.id,
        `The academic year ${year} configuration has been updated. Please check your dashboard for the latest submission deadlines.`
      ]);
      studentsNotified++;
    }

    // Notify lecturers specifically about deadline changes with detailed information
    const [activeLecturers] = await pool.execute<RowDataPacket[]>(
      "SELECT id, first_name, last_name FROM users WHERE is_active = true AND role = 'lecturer'"
    );

    let lecturersNotified = 0;
    const deadlineChanges: string[] = [];
    
    // Build detailed message about deadline changes
    if (formattedDates.alpha_deadline_start || formattedDates.alpha_deadline_end) {
      const startStr = formattedDates.alpha_deadline_start ? new Date(formattedDates.alpha_deadline_start).toLocaleString() : 'unchanged';
      const endStr = formattedDates.alpha_deadline_end ? new Date(formattedDates.alpha_deadline_end).toLocaleString() : 'unchanged';
      deadlineChanges.push(`Alpha: ${startStr} - ${endStr}`);
    }
    if (formattedDates.beta_deadline_start || formattedDates.beta_deadline_end) {
      const startStr = formattedDates.beta_deadline_start ? new Date(formattedDates.beta_deadline_start).toLocaleString() : 'unchanged';
      const endStr = formattedDates.beta_deadline_end ? new Date(formattedDates.beta_deadline_end).toLocaleString() : 'unchanged';
      deadlineChanges.push(`Beta: ${startStr} - ${endStr}`);
    }
    if (formattedDates.final_deadline_start || formattedDates.final_deadline_end) {
      const startStr = formattedDates.final_deadline_start ? new Date(formattedDates.final_deadline_start).toLocaleString() : 'unchanged';
      const endStr = formattedDates.final_deadline_end ? new Date(formattedDates.final_deadline_end).toLocaleString() : 'unchanged';
      deadlineChanges.push(`Final: ${startStr} - ${endStr}`);
    }
    
    const deadlineMessage = deadlineChanges.length > 0 
      ? `The submission deadlines for academic year ${year} have been updated:\n${deadlineChanges.join('\n')}\n\nPlease review these changes and inform your supervisees.`
      : `The academic year ${year} configuration has been updated. Please check your dashboard for any changes to submission deadlines.`;

    for (const lecturer of activeLecturers) {
      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, 'Submission Deadlines Updated', ?, 'warning')
      `, [
        uuidv4(),
        lecturer.id,
        deadlineMessage
      ]);
      lecturersNotified++;
    }

    console.log(`Sent notifications to ${studentsNotified} students and ${lecturersNotified} lecturers about academic year ${year} update`);

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'CONFIGURE', 'ACADEMIC_YEAR', ?, ?, ?)
    `, [uuidv4(), user.id, year, JSON.stringify(req.body), req.ip]);

    // Prepare response message
    let responseMessage = 'Academic year configured successfully';
    if (existingProjects.length > 0) {
      responseMessage += `. Updated deadlines for ${existingProjects.length} existing project(s).`;
    }
    if (studentsNotified > 0 || lecturersNotified > 0) {
      responseMessage += ` ${studentsNotified} student(s) and ${lecturersNotified} lecturer(s) have been notified.`;
    }

    res.json({
      success: true,
      message: responseMessage,
      data: {
        projectsUpdated: existingProjects.length,
        usersNotified: studentsNotified + lecturersNotified,
        studentsNotified: studentsNotified,
        lecturersNotified: lecturersNotified
      }
    });
  } catch (error) {
    console.error('Configure academic year error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while configuring academic year'
    });
  }
};

// Get all academic year configurations
export const getAcademicYears = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [years] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM academic_year_config ORDER BY year DESC'
    );

    res.json({
      success: true,
      data: years
    });
  } catch (error) {
    console.error('Get academic years error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching academic years'
    });
  }
};

// Set lecturer capacity
export const setLecturerCapacity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { lecturerId } = req.params;
    const { max_students, is_available } = req.body;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can set lecturer capacity'
      });
      return;
    }

    // Get active academic year
    const [activeYear] = await pool.execute<RowDataPacket[]>(
      'SELECT year FROM academic_year_config WHERE is_active = true LIMIT 1'
    );

    if (activeYear.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No active academic year configured'
      });
      return;
    }

    // Get default max_supervisor_load from academic year config
    const [academicYearConfig] = await pool.execute<RowDataPacket[]>(
      'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
      [activeYear[0].year]
    );
    const defaultMaxStudents = academicYearConfig.length > 0 ? academicYearConfig[0].max_supervisor_load : 10;

    // Update or create capacity
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM lecturer_capacity WHERE lecturer_id = ? AND academic_year = ?',
      [lecturerId, activeYear[0].year]
    );

    if (existing.length > 0) {
      await pool.execute<ResultSetHeader>(`
        UPDATE lecturer_capacity SET
          max_students = COALESCE(?, max_students),
          is_available = COALESCE(?, is_available)
        WHERE lecturer_id = ? AND academic_year = ?
      `, [max_students, is_available, lecturerId, activeYear[0].year]);
    } else {
      await pool.execute<ResultSetHeader>(`
        INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students, is_available)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [uuidv4(), lecturerId, activeYear[0].year, max_students || defaultMaxStudents, is_available !== false]);
    }

    res.json({
      success: true,
      message: 'Lecturer capacity updated successfully'
    });
  } catch (error) {
    console.error('Set lecturer capacity error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while setting lecturer capacity'
    });
  }
};

// Helper function to extract keywords from text
const extractKeywords = (text: string): string[] => {
  // Remove common stop words and extract meaningful words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'i', 'you', 'he', 'she', 'we', 'our', 'my', 'his', 'her', 'your', 'its'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
};

// Helper function to calculate similarity percentage
const calculateSimilarity = (text1: string, text2: string): number => {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);

  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0;
  }

  // Count matching keywords
  const matches = keywords1.filter(keyword => keywords2.includes(keyword)).length;
  
  // Calculate Jaccard similarity (intersection over union)
  const union = new Set([...keywords1, ...keywords2]).size;
  const similarity = (matches / union) * 100;

  return Math.round(similarity * 100) / 100; // Round to 2 decimal places
};

// Get similar projects for a given project
export const getSimilarProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { projectId } = req.params;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Get the target project
    const [targetProjects] = await pool.execute<RowDataPacket[]>(
      'SELECT id, title, description, problem_statement, objectives, methodology, created_at FROM projects WHERE id = ?',
      [projectId]
    );

    if (targetProjects.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const targetProject = targetProjects[0];
    const targetText = `${targetProject.title} ${targetProject.description} ${targetProject.problem_statement} ${targetProject.objectives} ${targetProject.methodology}`;

    // Get all other projects in the same academic year
    const [allProjects] = await pool.execute<RowDataPacket[]>(`
      SELECT p.id, p.title, p.description, p.problem_statement, p.objectives, p.methodology, 
             p.created_at, p.status,
             s.first_name as student_first_name, s.last_name as student_last_name,
             s.student_id as student_matric
      FROM projects p
      LEFT JOIN users s ON p.student_id = s.id
      WHERE p.id != ? AND p.academic_year = ?
    `, [projectId, targetProject.academic_year]);

    // Calculate similarity for each project
    const similarProjects = allProjects
      .map((project: any) => {
        const projectText = `${project.title} ${project.description} ${project.problem_statement} ${project.objectives} ${project.methodology}`;
        const similarity = calculateSimilarity(targetText, projectText);
        return {
          ...project,
          similarity
        };
      })
      .filter((project: any) => project.similarity >= 30) // Only include projects with 30%+ similarity
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 10); // Limit to top 10 most similar

    res.json({
      success: true,
      data: similarProjects
    });
  } catch (error) {
    console.error('Get similar projects error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while finding similar projects'
    });
  }
};

// Get projects with grades for Assessment section
export const getProjectsWithGrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, academic_year, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Build WHERE conditions
    let whereConditions = '1=1';
    const params: any[] = [];

    if (status) {
      whereConditions += ' AND p.status = ?';
      params.push(status);
    }

    if (academic_year) {
      whereConditions += ' AND p.academic_year = ?';
      params.push(academic_year);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      WHERE ${whereConditions}
    `;
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countResult[0].total;

    // Get projects with student and supervisor info
    const limitNum = parseInt(String(limit), 10);
    const offsetNum = parseInt(String(offset), 10);
    
    const query = `
      SELECT p.*, 
             s.first_name as student_first_name, 
             s.last_name as student_last_name,
             s.student_id as student_matric,
             s.email as student_email,
             l.first_name as supervisor_first_name,
             l.last_name as supervisor_last_name
      FROM projects p
      LEFT JOIN users s ON p.student_id = s.id
      LEFT JOIN users l ON p.supervisor_id = l.id
      WHERE ${whereConditions}
      ORDER BY p.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    
    const [projects] = await pool.execute<RowDataPacket[]>(query, params);

    // Get grades for each project
    const projectIds = projects.map((p: any) => p.id);
    let gradesMap: Record<string, any> = {};

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => '?').join(',');
      const [grades] = await pool.execute<RowDataPacket[]>(`
        SELECT g.*, s.submission_type, s.max_marks as submission_max_marks
        FROM grades g
        JOIN submissions s ON g.submission_id = s.id
        WHERE g.project_id IN (${placeholders})
        ORDER BY s.submission_type
      `, projectIds);

      // Organize grades by project_id and submission_type
      grades.forEach((grade: any) => {
        if (!gradesMap[grade.project_id]) {
          gradesMap[grade.project_id] = {};
        }
        gradesMap[grade.project_id][grade.submission_type] = {
          marks: parseFloat(grade.marks) || 0,
          max_marks: parseFloat(grade.max_marks) || 0,
          is_published: Boolean(grade.is_published),
          updated_at: grade.updated_at
        };
      });
    }

    // Calculate similarity scores for each project
    const projectsWithSimilarity = await Promise.all(projects.map(async (project: any) => {
      const projectText = `${project.title} ${project.description} ${project.problem_statement || ''} ${project.objectives || ''} ${project.methodology || ''}`;
      
      // Get all other projects in the same academic year to compare
      const [otherProjects] = await pool.execute<RowDataPacket[]>(`
        SELECT id, title, description, problem_statement, objectives, methodology, created_at
        FROM projects
        WHERE id != ? AND academic_year = ?
      `, [project.id, project.academic_year]);

      // Calculate similarity with each other project
      let maxSimilarity = 0;
      let similarProjects: any[] = [];

      for (const otherProject of otherProjects) {
        const otherText = `${otherProject.title} ${otherProject.description} ${otherProject.problem_statement || ''} ${otherProject.objectives || ''} ${otherProject.methodology || ''}`;
        const similarity = calculateSimilarity(projectText, otherText);
        
        if (similarity >= 30) { // 30% similarity threshold
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }
          similarProjects.push({
            id: otherProject.id,
            title: otherProject.title,
            similarity,
            created_at: otherProject.created_at
          });
        }
      }

      // Sort by similarity and take top matches
      similarProjects = similarProjects
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      return {
        ...project,
        grades: gradesMap[project.id] || {},
        similarity: {
          maxSimilarity,
          similarProjects: similarProjects.length > 0 ? similarProjects : undefined
        }
      };
    }));

    res.json({
      success: true,
      data: projectsWithSimilarity,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get projects with grades error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching projects with grades'
    });
  }
};

// Get all users (with filters)
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const pageNum = parseInt(String(req.query.page || 1), 10);
    const limitNum = parseInt(String(req.query.limit || 20), 10);
    const offset = (pageNum - 1) * limitNum;
    const { role, department, search } = req.query;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (department) {
      whereClause += ' AND department = ?';
      params.push(department);
    }

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR student_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get count (use same WHERE clause and params, but no LIMIT/OFFSET)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countResult[0].total;

    // Build main query with pagination (create new params array to avoid issues)
    // Note: Some MySQL setups reject bound params for LIMIT/OFFSET in prepared statements.
    // Since page/limit are validated integers, we safely inline them here.
    const mainQuery = `
      SELECT id, email, first_name, last_name, role, student_id, department, phone, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const [users] = await pool.execute<RowDataPacket[]>(mainQuery, params);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
  }
};

// Get single user by ID
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.params;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, first_name, last_name, role, student_id, department, phone, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user'
    });
  }
};

// Create new user
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { email, password, first_name, last_name, role, student_id, department, phone } = req.body;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can create users'
      });
      return;
    }

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      res.status(400).json({
        success: false,
        message: 'Email, password, first name, last name, and role are required'
      });
      return;
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
      return;
    }

    // Check if student_id already exists (for students)
    if (role === 'student' && student_id) {
      const [existingStudents] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE student_id = ?',
        [student_id]
      );

      if (existingStudents.length > 0) {
        res.status(400).json({
          success: false,
          message: 'A user with this student ID already exists'
        });
        return;
      }
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const userId = uuidv4();

    await pool.execute<ResultSetHeader>(`
      INSERT INTO users (id, email, password, first_name, last_name, role, student_id, department, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)
    `, [userId, email, hashedPassword, first_name, last_name, role, student_id || null, department || null, phone || null]);

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'CREATE', 'USER', ?, ?, ?)
    `, [uuidv4(), user.id, userId, JSON.stringify({ email, first_name, last_name, role }), req.ip]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: userId }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating user'
    });
  }
};

// Update user
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.params;
    const { email, first_name, last_name, role, student_id, department, phone, password } = req.body;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can update users'
      });
      return;
    }

    // Check if user exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== existingUsers[0].email) {
      const [emailCheck] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (emailCheck.length > 0) {
        res.status(400).json({
          success: false,
          message: 'A user with this email already exists'
        });
        return;
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (first_name) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (student_id !== undefined) {
      updates.push('student_id = ?');
      params.push(student_id || null);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      params.push(department || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone || null);
    }
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    await pool.execute<ResultSetHeader>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'UPDATE', 'USER', ?, ?, ?)
    `, [uuidv4(), user.id, userId, JSON.stringify({ email, first_name, last_name, role }), req.ip]);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating user'
    });
  }
};

// Delete user
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const user = req.user!;
    const { userId } = req.params;

    if (user.role !== 'coordinator') {
      await connection.rollback();
      res.status(403).json({
        success: false,
        message: 'Only coordinators can delete users'
      });
      return;
    }

    // Can't delete yourself
    if (userId === user.id) {
      await connection.rollback();
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
      return;
    }

    // Check if user exists
    const [existingUsers] = await connection.execute<RowDataPacket[]>(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const deletedUser = existingUsers[0];

    // Get all projects for this user (as student or supervisor)
    const [projects] = await connection.execute<RowDataPacket[]>(
      'SELECT id, student_id, supervisor_id FROM projects WHERE student_id = ? OR supervisor_id = ?',
      [userId, userId]
    );

    // Delete projects where user is the student (this will cascade delete submissions, grades, etc.)
    // Projects where user is supervisor will have supervisor_id set to NULL due to ON DELETE SET NULL
    for (const project of projects) {
      if (project.student_id === userId) {
        // Delete project (cascades to submissions, grades, presentation_schedules)
        await connection.execute('DELETE FROM projects WHERE id = ?', [project.id]);
      } else if (project.supervisor_id === userId) {
        // For projects where user is supervisor, we need to update lecturer capacity
        // First, check if project is approved/in_progress (which means capacity was incremented)
        const [projectDetails] = await connection.execute<RowDataPacket[]>(
          'SELECT status, academic_year FROM projects WHERE id = ?',
          [project.id]
        );
        
        if (projectDetails.length > 0 && ['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(projectDetails[0].status)) {
          // Decrease lecturer capacity
          const [capacity] = await connection.execute<RowDataPacket[]>(
            'SELECT * FROM lecturer_capacity WHERE lecturer_id = ? AND academic_year = ?',
            [userId, projectDetails[0].academic_year]
          );
          
          if (capacity.length > 0 && capacity[0].current_students > 0) {
            await connection.execute(
              'UPDATE lecturer_capacity SET current_students = current_students - 1 WHERE id = ?',
              [capacity[0].id]
            );
          }
        }
        
        // Set supervisor_id to NULL (or delete project if we want to be aggressive)
        await connection.execute(
          'UPDATE projects SET supervisor_id = NULL, status = ? WHERE id = ?',
          ['submitted', project.id]
        );
      }
    }

    // Delete all related records
    // Grades where user is the grader
    await connection.execute('DELETE FROM grades WHERE grader_id = ?', [userId]);
    
    // Submissions where user is the grader
    await connection.execute('UPDATE submissions SET graded_by = NULL WHERE graded_by = ?', [userId]);
    
    // Messages (cascades via foreign key, but explicit delete for clarity)
    await connection.execute('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
    
    // Notifications (cascades via foreign key, but explicit delete for clarity)
    await connection.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
    
    // Broadcast messages
    await connection.execute('DELETE FROM broadcast_messages WHERE sender_id = ?', [userId]);
    
    // Lecturer capacity
    await connection.execute('DELETE FROM lecturer_capacity WHERE lecturer_id = ?', [userId]);
    
    // Audit logs (ON DELETE SET NULL, so we'll just delete entries where this user was the actor)
    // Keep audit logs as they are historical records
    
    // Finally, delete the user (this will cascade to any remaining references)
    await connection.execute<ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);

    // Log the action
    await connection.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, ip_address)
      VALUES (?, ?, 'DELETE', 'USER', ?, ?, ?)
    `, [uuidv4(), user.id, userId, JSON.stringify(deletedUser), req.ip]);

    await connection.commit();

    res.json({
      success: true,
      message: 'User and all related data deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting user: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  } finally {
    connection.release();
  }
};

// Toggle user active status
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { userId } = req.params;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can manage user status'
      });
      return;
    }

    // Can't deactivate yourself
    if (userId === user.id) {
      res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
      return;
    }

    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT is_active FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const newStatus = !users[0].is_active;

    await pool.execute<ResultSetHeader>(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, userId]
    );

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, ?, 'USER', ?, ?, ?)
    `, [uuidv4(), user.id, newStatus ? 'ACTIVATE' : 'DEACTIVATE', userId, JSON.stringify({ is_active: newStatus }), req.ip]);

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating user status'
    });
  }
};

// Schedule presentations
export const schedulePresentations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { schedules } = req.body;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can schedule presentations'
      });
      return;
    }

    if (!Array.isArray(schedules) || schedules.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Schedules array is required'
      });
      return;
    }

    for (const schedule of schedules) {
      const { project_id, scheduled_date, start_time, end_time, lab_room, panel_members } = schedule;

      // Validate project exists
      const [projects] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM projects WHERE id = ?',
        [project_id]
      );

      if (projects.length === 0) {
        continue; // Skip invalid project
      }

      // Check for existing schedule
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM presentation_schedules WHERE project_id = ?',
        [project_id]
      );

      if (existing.length > 0) {
        // Update existing schedule
        await pool.execute<ResultSetHeader>(`
          UPDATE presentation_schedules SET
            scheduled_date = ?,
            start_time = ?,
            end_time = ?,
            lab_room = ?,
            panel_members = ?,
            status = 'scheduled',
            updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
        `, [scheduled_date, start_time, end_time, lab_room, JSON.stringify(panel_members || []), project_id]);
      } else {
        // Create new schedule
        await pool.execute<ResultSetHeader>(`
          INSERT INTO presentation_schedules (
            id, project_id, scheduled_date, start_time, end_time, lab_room, panel_members, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
        `, [uuidv4(), project_id, scheduled_date, start_time, end_time, lab_room, JSON.stringify(panel_members || [])]);
      }

      // Notify student
      const [project] = await pool.execute<RowDataPacket[]>(
        'SELECT student_id, title FROM projects WHERE id = ?',
        [project_id]
      );

      if (project.length > 0) {
        await pool.execute<ResultSetHeader>(`
          INSERT INTO notifications (id, user_id, title, message, type, link)
          VALUES (?, ?, 'Presentation Scheduled', ?, 'info', ?)
        `, [
          uuidv4(),
          project[0].student_id,
          `Your presentation for "${project[0].title}" has been scheduled for ${scheduled_date} at ${start_time} in ${lab_room}.`,
          `/projects/${project_id}`
        ]);
      }
    }

    res.json({
      success: true,
      message: 'Presentations scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule presentations error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while scheduling presentations'
    });
  }
};

// Get presentation schedules
export const getPresentationSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { date, lab_room } = req.query;

    let query = `
      SELECT ps.*, 
             p.title as project_title,
             u.first_name as student_first_name,
             u.last_name as student_last_name,
             l.first_name as supervisor_first_name,
             l.last_name as supervisor_last_name
      FROM presentation_schedules ps
      JOIN projects p ON ps.project_id = p.id
      JOIN users u ON p.student_id = u.id
      LEFT JOIN users l ON p.supervisor_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'student') {
      query += ' AND p.student_id = ?';
      params.push(user.id);
    } else if (user.role === 'lecturer') {
      query += ' AND (p.supervisor_id = ? OR JSON_CONTAINS(ps.panel_members, ?))';
      params.push(user.id, JSON.stringify(user.id));
    }

    if (date) {
      query += ' AND ps.scheduled_date = ?';
      params.push(date);
    }

    if (lab_room) {
      query += ' AND ps.lab_room = ?';
      params.push(lab_room);
    }

    query += ' ORDER BY ps.scheduled_date, ps.start_time';

    const [schedules] = await pool.execute<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Get presentation schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching presentation schedules'
    });
  }
};

// Get audit logs
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { entity_type, action, user_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    let query = `
      SELECT al.*, u.first_name, u.last_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(entity_type);
    }

    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }

    if (start_date) {
      query += ' AND al.created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND al.created_at <= ?';
      params.push(end_date);
    }

    // Get count
    const countQuery = query.replace(/SELECT al\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [logs] = await pool.execute<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching audit logs'
    });
  }
};

// Manual supervisor assignment
export const assignSupervisor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { projectId } = req.params;
    const { supervisor_id } = req.body;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators can manually assign supervisors'
      });
      return;
    }

    // Verify project exists and needs supervisor
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
    const oldSupervisorId = project.supervisor_id;
    const isReassignment = !!oldSupervisorId && oldSupervisorId !== supervisor_id;

    // Verify lecturer exists and get actual capacity
    // Count actual approved projects (excluding current project if it's a reassignment)
    const [lecturers] = await pool.execute<RowDataPacket[]>(`
      SELECT u.*, lc.max_students, lc.id as capacity_id
      FROM users u
      LEFT JOIN lecturer_capacity lc ON u.id = lc.lecturer_id AND lc.academic_year = ?
      WHERE u.id = ? AND u.role = 'lecturer' AND u.is_active = true
    `, [project.academic_year, supervisor_id]);

    if (lecturers.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Lecturer not found or is not available'
      });
      return;
    }

    const lecturer = lecturers[0];

    // Get max_students from academic_year_config if not in lecturer_capacity
    let maxStudents = lecturer.max_students;
    if (!maxStudents) {
      const [academicYearConfig] = await pool.execute<RowDataPacket[]>(
        'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
        [project.academic_year]
      );
      maxStudents = academicYearConfig.length > 0 ? academicYearConfig[0].max_supervisor_load : 10;
    }

    // Get actual current student count (excluding current project if reassigning)
    const [actualProjects] = await pool.execute<RowDataPacket[]>(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE supervisor_id = ? 
        AND academic_year = ?
        AND status IN ('approved', 'approved_with_modifications', 'in_progress', 'completed')
        AND id != ?
    `, [supervisor_id, project.academic_year, projectId]);
    const currentStudents = actualProjects[0]?.count || 0;

    // Check capacity - account for reassignment: if reassigning an approved project,
    // we'll decrease old supervisor's count, but we still need to check if new supervisor has room
    // For non-approved projects, capacity hasn't been used yet, so no need to account for old supervisor
    if (!isReassignment || !['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(project.status)) {
      // Regular assignment or reassignment of non-approved project: check if at capacity
      if (currentStudents >= maxStudents) {
        res.status(400).json({
          success: false,
          message: `Lecturer has reached maximum supervision capacity of ${maxStudents} students`
        });
        return;
      }
    } else {
      // Reassignment of approved project: new supervisor will get +1, old supervisor will get -1
      // So we need to check if new supervisor has room
      if (currentStudents >= maxStudents) {
        res.status(400).json({
          success: false,
          message: `Lecturer has reached maximum supervision capacity of ${maxStudents} students`
        });
        return;
      }
    }

    // Handle reassignment: decrease old supervisor's count if reassigning
    // Only decrease if the project was already approved (capacity was incremented on approval)
    if (isReassignment && oldSupervisorId) {
      // Get old supervisor's capacity
      const [oldCapacity] = await pool.execute<RowDataPacket[]>(`
        SELECT * FROM lecturer_capacity 
        WHERE lecturer_id = ? AND academic_year = ?
      `, [oldSupervisorId, project.academic_year]);

      // If project was approved/in_progress, capacity was already incremented, so decrease it
      if (['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(project.status)) {
        if (oldCapacity.length > 0 && oldCapacity[0].current_students > 0) {
          // Decrease old supervisor's count
          await pool.execute<ResultSetHeader>(
            'UPDATE lecturer_capacity SET current_students = current_students - 1 WHERE id = ?',
            [oldCapacity[0].id]
          );
        }
      }
      // If project was still 'under_review', capacity wasn't incremented yet, so nothing to decrease

      // Notify old supervisor about the reassignment
      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type, link)
        VALUES (?, ?, 'Supervisor Reassignment', ?, 'info', ?)
      `, [
        uuidv4(),
        oldSupervisorId,
        `The project "${project.title}" has been reassigned to another supervisor.`,
        '/lecturer/dashboard'
      ]);
    }

    // Update project
    // If project was already approved, keep the approved status and update new supervisor's capacity
    // If project was not yet approved, set to 'under_review' for new lecturer to review
    const wasApproved = ['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(project.status);
    
    if (wasApproved) {
      // Keep the current status, just change supervisor
      await pool.execute<ResultSetHeader>(
        "UPDATE projects SET supervisor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [supervisor_id, projectId]
      );

      // Update new lecturer's capacity since project is already approved
      if (lecturer.capacity_id) {
        await pool.execute<ResultSetHeader>(
          'UPDATE lecturer_capacity SET current_students = current_students + 1 WHERE id = ?',
          [lecturer.capacity_id]
        );
      } else {
        // Create capacity record if it doesn't exist, using configured max_supervisor_load
        const [academicYearConfig] = await pool.execute<RowDataPacket[]>(
          'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
          [project.academic_year]
        );
        const defaultMaxStudents = academicYearConfig.length > 0 ? academicYearConfig[0].max_supervisor_load : 10;
        
        await pool.execute<ResultSetHeader>(`
          INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students)
          VALUES (?, ?, ?, ?, 1)
        `, [uuidv4(), supervisor_id, project.academic_year, defaultMaxStudents]);
      }
    } else {
      // Set to 'under_review' so new lecturer can review and approve
      await pool.execute<ResultSetHeader>(
        "UPDATE projects SET supervisor_id = ?, status = 'under_review', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [supervisor_id, projectId]
      );
      // Note: Don't update new lecturer capacity yet - wait until lecturer approves
    }

    // Notify student
    const notificationTitle = isReassignment 
      ? 'Supervisor Reassigned' 
      : 'Proposal Forwarded for Review';
    const notificationMessage = isReassignment
      ? `Your project supervisor has been changed to ${lecturer.first_name} ${lecturer.last_name}. ${wasApproved ? 'Your project remains approved.' : 'Your project is pending review by the new supervisor.'}`
      : `Your project proposal has been forwarded to ${lecturer.first_name} ${lecturer.last_name} for review.`;
    
    await pool.execute<ResultSetHeader>(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'info', ?)
    `, [
      uuidv4(),
      project.student_id,
      notificationTitle,
      notificationMessage,
      `/student/my-project`
    ]);

    // Notify new lecturer
    const lecturerNotificationTitle = isReassignment
      ? 'Project Reassigned to You'
      : 'New Project Proposal for Review';
    const lecturerNotificationMessage = isReassignment
      ? (wasApproved 
          ? `The project "${project.title}" has been reassigned to you for supervision. The project is already approved.`
          : `The project "${project.title}" has been reassigned to you. Please review and approve/reject.`)
      : `The coordinator has forwarded the project "${project.title}" for your review. Please review and approve/reject.`;
    
    await pool.execute<ResultSetHeader>(`
      INSERT INTO notifications (id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, 'info', ?)
    `, [
      uuidv4(),
      supervisor_id,
      lecturerNotificationTitle,
      lecturerNotificationMessage,
      `/lecturer/review`
    ]);

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'ASSIGN_SUPERVISOR', 'PROJECT', ?, ?, ?)
    `, [uuidv4(), user.id, projectId, JSON.stringify({ supervisor_id }), req.ip]);

    res.json({
      success: true,
      message: isReassignment 
        ? 'Supervisor reassigned successfully' 
        : 'Supervisor assigned successfully'
    });
  } catch (error) {
    console.error('Assign supervisor error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while assigning supervisor'
    });
  }
};

