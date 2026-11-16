// User types
export type UserRole = 'student' | 'lecturer' | 'coordinator' | 'admin';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  student_id?: string;
  department?: string;
  phone?: string;
  profile_image?: string;
  is_active: boolean;
  created_at: string;
}

// Project types
export type ProjectStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'approved_with_modifications'
  | 'rejected'
  | 'in_progress'
  | 'completed';

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
  created_at: string;
  updated_at: string;
  // Joined fields
  student_first_name?: string;
  student_last_name?: string;
  student_matric?: string;
  student_email?: string;
  supervisor_first_name?: string;
  supervisor_last_name?: string;
  supervisor_email?: string;
}

// Submission types
export type SubmissionType = 'alpha' | 'beta' | 'presentation' | 'final' | 'project_management';
export type SubmissionStatus = 'pending' | 'submitted' | 'under_review' | 'graded' | 'resubmission_required' | 'approved';

export interface Submission {
  id: string;
  project_id: string;
  submission_type: SubmissionType;
  file_path?: string;
  file_name?: string;
  status: SubmissionStatus;
  submission_count: number;
  submitted_at?: string;
  deadline: string;
  marks?: number;
  max_marks: number;
  feedback?: string;
  graded_by?: string;
  graded_at?: string;
  created_at: string;
  // Submission window dates (from academic_year_config)
  submission_start_date?: string | null;
  submission_end_date?: string | null;
  // Joined fields
  is_published?: boolean;
  grader_first_name?: string;
  grader_last_name?: string;
  project_title?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_matric?: string;
}

// Grade types
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
  created_at: string;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  project_id?: string;
  subject?: string;
  content: string;
  attachment_path?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  // Joined fields
  sender_first_name?: string;
  sender_last_name?: string;
  sender_email?: string;
  receiver_first_name?: string;
  receiver_last_name?: string;
  receiver_email?: string;
  direction?: 'sent' | 'received';
}

// Notification types
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link?: string;
  created_at: string;
}

// Academic year config
export interface AcademicYearConfig {
  id: string;
  year: string;
  topic_submission_start: string;
  topic_submission_end: string;
  alpha_deadline?: string;
  alpha_deadline_start?: string;
  alpha_deadline_end?: string;
  beta_deadline?: string;
  beta_deadline_start?: string;
  beta_deadline_end?: string;
  presentation_start: string;
  presentation_end: string;
  final_deadline?: string;
  final_deadline_start?: string;
  final_deadline_end?: string;
  max_supervisor_load: number;
  is_active: boolean;
}

// Lecturer capacity
export interface LecturerCapacity {
  id: string;
  lecturer_id: string;
  academic_year: string;
  max_students: number;
  current_students: number;
  is_available: boolean;
}

// Presentation schedule
export interface PresentationSchedule {
  id: string;
  project_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  lab_room: string;
  panel_members: string[];
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled';
  // Joined fields
  project_title?: string;
  student_first_name?: string;
  student_last_name?: string;
  supervisor_first_name?: string;
  supervisor_last_name?: string;
}

// Audit log
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  created_at: string;
  // Joined fields
  first_name?: string;
  last_name?: string;
  email?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard types
export interface StudentDashboard {
  academicYear: AcademicYearConfig | null;
  project: Project | null;
  submissions: Submission[];
  unreadMessages: number;
  unreadNotifications: number;
  deadlines: { type: string; date: string; status: string }[];
  presentationSchedule: PresentationSchedule | null;
  gradesSummary: {
    obtained: number;
    total: number;
    percentage: number;
  } | null;
  canSubmitTopic: boolean;
}

export interface LecturerDashboard {
  academicYear: AcademicYearConfig | null;
  pendingReviews: number;
  supervisedStudents: number;
  maxCapacity: number;
  currentLoad: number;
  pendingGrading: number;
  upcomingPresentations: PresentationSchedule[];
  recentSubmissions: Submission[];
  supervisees: (User & { project_id: string; project_title: string; project_status: ProjectStatus })[];
  projectsForReview: Project[];
  unreadMessages: number;
  unreadNotifications: number;
}

export interface CoordinatorDashboard {
  academicYear: AcademicYearConfig | null;
  totalStudents: number;
  totalProjects: number;
  pendingApprovals: number;
  similarProposalsCount?: number;
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
  recentSubmissions: Submission[];
  supervisorWorkload: {
    id: string;
    first_name: string;
    last_name: string;
    capacity: number;
    current_load: number;
  }[];
}

// Contact type for messaging
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  relationship: string;
}

// Available lecturer for supervision
export interface AvailableLecturer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  max_students: number;
  current_students: number;
  is_available: boolean;
}

