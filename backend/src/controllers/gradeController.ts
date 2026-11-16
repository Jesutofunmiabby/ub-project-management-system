import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest } from '../types';

// Get all grades for a project
export const getProjectGrades = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Authorization check
    if (user.role === 'student' && project.student_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const [grades] = await pool.execute<RowDataPacket[]>(`
      SELECT g.*, 
             s.submission_type, s.max_marks as submission_max_marks,
             u.first_name as grader_first_name, u.last_name as grader_last_name
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      LEFT JOIN users u ON g.grader_id = u.id
      WHERE g.project_id = ?
      ${user.role === 'student' ? 'AND g.is_published = true' : ''}
      ORDER BY s.created_at ASC
    `, [projectId]);

    // Calculate totals
    const totalMarks = grades.reduce((sum: number, g: any) => sum + (g.marks || 0), 0);
    const totalMaxMarks = grades.reduce((sum: number, g: any) => sum + (g.max_marks || 0), 0);

    res.json({
      success: true,
      data: {
        grades,
        summary: {
          totalMarks,
          totalMaxMarks,
          percentage: totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get project grades error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching grades'
    });
  }
};

// Publish/Reveal grades (Coordinator or Lecturer for their own supervisees)
export const publishGrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { projectIds, submissionType } = req.body;

    if (user.role !== 'coordinator' && user.role !== 'lecturer') {
      res.status(403).json({
        success: false,
        message: 'Only coordinators and lecturers can reveal grades'
      });
      return;
    }

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Project IDs are required'
      });
      return;
    }

    // For lecturers, verify they are the supervisor of these projects
    if (user.role === 'lecturer') {
      const [projects] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM projects WHERE id IN (${projectIds.map(() => '?').join(',')}) AND supervisor_id = ?`,
        [...projectIds, user.id]
      );

      if (projects.length !== projectIds.length) {
        res.status(403).json({
          success: false,
          message: 'You can only reveal grades for your own supervisees'
        });
        return;
      }
    }

    // Build query based on whether submissionType is specified
    let gradesUpdated = 0;
    for (const projectId of projectIds) {
      let query = `UPDATE grades g 
                   JOIN submissions s ON g.submission_id = s.id 
                   SET g.is_published = true, g.updated_at = CURRENT_TIMESTAMP 
                   WHERE g.project_id = ?`;
      const params: any[] = [projectId];

      if (submissionType && submissionType !== 'all') {
        query += ' AND s.submission_type = ?';
        params.push(submissionType);
      }

      const [result] = await pool.execute<ResultSetHeader>(query, params);
      gradesUpdated += result.affectedRows;
    }

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'PUBLISH_GRADES', 'GRADE', ?, ?, ?)
    `, [uuidv4(), user.id, projectIds.join(','), JSON.stringify({ submissionType, revealedBy: user.role }), req.ip]);

    // Notify students
    let studentsNotified = 0;
    for (const projectId of projectIds) {
      const [project] = await pool.execute<RowDataPacket[]>(
        'SELECT student_id, title FROM projects WHERE id = ?',
        [projectId]
      );

      if (project.length > 0) {
        const gradeType = submissionType && submissionType !== 'all'
          ? submissionType.replace('_', ' ')
          : 'overall';
        
        await pool.execute<ResultSetHeader>(`
          INSERT INTO notifications (id, user_id, title, message, type, link)
          VALUES (?, ?, 'Grades Revealed', ?, 'success', ?)
        `, [
          uuidv4(),
          project[0].student_id,
          `Your ${gradeType} grades for "${project[0].title}" are now available. Check your grades page to view them.`,
          `/student/grades`
        ]);
        studentsNotified++;
      }
    }

    res.json({
      success: true,
      message: `Grades revealed successfully to ${studentsNotified} student(s)`,
      data: {
        gradesUpdated,
        studentsNotified
      }
    });
  } catch (error) {
    console.error('Publish grades error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while publishing grades'
    });
  }
};

// Get grade statistics (Coordinator)
export const getGradeStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { academicYear, department } = req.query;

    if (user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Get overall statistics
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT CASE WHEN g.is_published = true THEN p.id END) as graded_projects,
        AVG(g.marks) as average_marks,
        MIN(g.marks) as min_marks,
        MAX(g.marks) as max_marks,
        s.submission_type
      FROM projects p
      LEFT JOIN submissions s ON p.id = s.project_id
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (academicYear) {
      statsQuery += ' AND p.academic_year = ?';
      params.push(academicYear);
    }

    if (department) {
      statsQuery += ' AND EXISTS (SELECT 1 FROM users u WHERE u.id = p.student_id AND u.department = ?)';
      params.push(department);
    }

    statsQuery += ' GROUP BY s.submission_type';

    const [stats] = await pool.execute<RowDataPacket[]>(statsQuery, params);

    // Get grade distribution
    const [distribution] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN (g.marks / g.max_marks * 100) >= 70 THEN 'A'
          WHEN (g.marks / g.max_marks * 100) >= 60 THEN 'B'
          WHEN (g.marks / g.max_marks * 100) >= 50 THEN 'C'
          WHEN (g.marks / g.max_marks * 100) >= 40 THEN 'D'
          ELSE 'F'
        END as grade_band,
        COUNT(*) as count
      FROM grades g
      JOIN submissions s ON g.submission_id = s.id
      JOIN projects p ON g.project_id = p.id
      WHERE g.is_published = true
      ${academicYear ? 'AND p.academic_year = ?' : ''}
      GROUP BY grade_band
      ORDER BY grade_band
    `, academicYear ? [academicYear] : []);

    // Get supervisor performance
    const [supervisorStats] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.id, u.first_name, u.last_name,
        COUNT(DISTINCT p.id) as supervised_projects,
        AVG(g.marks) as average_student_marks
      FROM users u
      JOIN projects p ON u.id = p.supervisor_id
      LEFT JOIN grades g ON p.id = g.project_id AND g.is_published = true
      WHERE u.role = 'lecturer'
      ${academicYear ? 'AND p.academic_year = ?' : ''}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY average_student_marks DESC
    `, academicYear ? [academicYear] : []);

    res.json({
      success: true,
      data: {
        bySubmissionType: stats,
        distribution,
        supervisorPerformance: supervisorStats
      }
    });
  } catch (error) {
    console.error('Get grade statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching statistics'
    });
  }
};

// Update grade (with audit trail)
export const updateGrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { gradeId } = req.params;
    const user = req.user!;
    const { marks, feedback, justification } = req.body;

    if (user.role !== 'lecturer' && user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Get existing grade
    const [grades] = await pool.execute<RowDataPacket[]>(`
      SELECT g.*, p.supervisor_id
      FROM grades g
      JOIN projects p ON g.project_id = p.id
      WHERE g.id = ?
    `, [gradeId]);

    if (grades.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
      return;
    }

    const grade = grades[0];

    // Only supervisor or coordinator can update
    if (user.role === 'lecturer' && grade.supervisor_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Only the assigned supervisor can modify this grade'
      });
      return;
    }

    // Require justification for grade changes
    if (!justification) {
      res.status(400).json({
        success: false,
        message: 'Justification is required for grade modifications'
      });
      return;
    }

    const oldValues = { marks: grade.marks, feedback: grade.feedback };

    // Update grade
    await pool.execute<ResultSetHeader>(`
      UPDATE grades SET
        marks = COALESCE(?, marks),
        feedback = COALESCE(?, feedback),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [marks, feedback, gradeId]);

    // Also update submission marks
    await pool.execute<ResultSetHeader>(`
      UPDATE submissions SET
        marks = COALESCE(?, marks),
        feedback = COALESCE(?, feedback),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [marks, feedback, grade.submission_id]);

    // Log the grade modification with full audit trail
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
      VALUES (?, ?, 'GRADE_MODIFICATION', 'GRADE', ?, ?, ?, ?)
    `, [
      uuidv4(),
      user.id,
      gradeId,
      JSON.stringify(oldValues),
      JSON.stringify({ marks, feedback, justification }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Grade updated successfully'
    });
  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the grade'
    });
  }
};

