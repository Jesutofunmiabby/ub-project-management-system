import { Request } from 'express';

// User Roles
export type UserRole = 'student' | 'lecturer' | 'coordinator' | 'admin';

// User Interface
export interface User {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  student_id?: string;
  department?: string;
  phone?: string;
  profile_image?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Extended Request with User
export interface AuthRequest extends Request {
  user?: User;
}

// Project Status
export type ProjectStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'approved_with_modifications'
  | 'rejected'
  | 'in_progress'
  | 'completed';

// Project Interface
export interface Project {
  id: string;
  student_id: string;
  title: string;
  description: string;
  problem_statement: string;
  objectives: string;
  methodology: string;
  status: ProjectStatus;
  academic_year: string;
  supervisor_id?: string;
  supervisor_preference_1?: string;
  supervisor_preference_2?: string;
  supervisor_preference_3?: string;
  rejection_reason?: string;
  modification_notes?: string;
  originality_declared: boolean;
  created_at: Date;
  updated_at: Date;
}

// Submission Types
export type SubmissionType = 'alpha' | 'beta' | 'presentation' | 'final' | 'project_management';

// Submission Status
export type SubmissionStatus = 
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'graded'
  | 'resubmission_required'
  | 'approved';

// Submission Interface
export interface Submission {
  id: string;
  project_id: string;
  submission_type: SubmissionType;
  file_path?: string;
  file_name?: string;
  status: SubmissionStatus;
  submission_count: number;
  submitted_at?: Date;
  deadline: Date;
  marks?: number;
  max_marks: number;
  feedback?: string;
  graded_by?: string;
  graded_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Grade Interface
export interface Grade {
  id: string;
  submission_id: string;
  project_id: string;
  grader_id: string;
  marks: number;
  max_marks: number;
  rubric_scores?: Record<string, number>;
  comments?: string;
  feedback?: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

// Message Interface
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  project_id?: string;
  subject?: string;
  content: string;
  attachment_path?: string;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

// Notification Interface
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string;
  created_at: Date;
}

// Academic Year Configuration
export interface AcademicYearConfig {
  id: string;
  year: string;
  topic_submission_start: Date;
  topic_submission_end: Date;
  alpha_deadline: Date;
  beta_deadline: Date;
  presentation_start: Date;
  presentation_end: Date;
  final_deadline: Date;
  is_active: boolean;
  max_supervisor_load: number;
  created_at: Date;
  updated_at: Date;
}

// Lecturer Capacity
export interface LecturerCapacity {
  id: string;
  lecturer_id: string;
  academic_year: string;
  max_students: number;
  current_students: number;
  is_available: boolean;
}

// Audit Log
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Presentation Schedule
export interface PresentationSchedule {
  id: string;
  project_id: string;
  scheduled_date: Date;
  start_time: string;
  end_time: string;
  lab_room: string;
  panel_members: string[];
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard Statistics
export interface StudentDashboard {
  project?: Project;
  submissions: Submission[];
  messages: number;
  notifications: number;
  deadlines: { type: string; date: Date }[];
}

export interface LecturerDashboard {
  pendingReviews: number;
  supervisedStudents: number;
  maxCapacity: number;
  pendingGrading: number;
  upcomingPresentations: PresentationSchedule[];
  recentSubmissions: Submission[];
}

export interface CoordinatorDashboard {
  totalStudents: number;
  totalProjects: number;
  pendingApprovals: number;
  submissionStats: {
    submitted: number;
    approved: number;
    rejected: number;
    inProgress: number;
  };
  departmentMetrics: {
    department: string;
    students: number;
    projects: number;
  }[];
}

