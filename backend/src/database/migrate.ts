import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const dbName = process.env.DB_NAME || 'ubpms';

const migrations = `
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ${dbName};
USE ${dbName};

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  role ENUM('student', 'lecturer', 'coordinator', 'admin') NOT NULL,
  student_id VARCHAR(20) UNIQUE,
  department VARCHAR(100),
  phone VARCHAR(20),
  profile_image VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_student_id (student_id),
  INDEX idx_department (department)
);

-- Academic year configuration
CREATE TABLE IF NOT EXISTS academic_year_config (
  id VARCHAR(36) PRIMARY KEY,
  year VARCHAR(20) UNIQUE NOT NULL,
  topic_submission_start DATETIME NOT NULL,
  topic_submission_end DATETIME NOT NULL,
  alpha_deadline DATETIME NOT NULL,
  beta_deadline DATETIME NOT NULL,
  presentation_start DATETIME NOT NULL,
  presentation_end DATETIME NOT NULL,
  final_deadline DATETIME NOT NULL,
  max_supervisor_load INT DEFAULT 10,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_year (year),
  INDEX idx_active (is_active)
);

-- Lecturer capacity
CREATE TABLE IF NOT EXISTS lecturer_capacity (
  id VARCHAR(36) PRIMARY KEY,
  lecturer_id VARCHAR(36) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  max_students INT DEFAULT 10,
  current_students INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_lecturer_year (lecturer_id, academic_year),
  INDEX idx_lecturer (lecturer_id),
  INDEX idx_year (academic_year)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  objectives TEXT NOT NULL,
  methodology TEXT NOT NULL,
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'approved_with_modifications', 'rejected', 'in_progress', 'completed') DEFAULT 'draft',
  academic_year VARCHAR(20) NOT NULL,
  supervisor_id VARCHAR(36),
  supervisor_preference_1 VARCHAR(36),
  supervisor_preference_2 VARCHAR(36),
  supervisor_preference_3 VARCHAR(36),
  rejection_reason TEXT,
  modification_notes TEXT,
  originality_declared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_student (student_id),
  INDEX idx_supervisor (supervisor_id),
  INDEX idx_status (status),
  INDEX idx_year (academic_year),
  INDEX idx_title (title)
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  submission_type ENUM('alpha', 'beta', 'presentation', 'final', 'project_management') NOT NULL,
  file_path VARCHAR(500),
  file_name VARCHAR(255),
  status ENUM('pending', 'submitted', 'under_review', 'graded', 'resubmission_required', 'approved') DEFAULT 'pending',
  submission_count INT DEFAULT 0,
  submitted_at DATETIME,
  deadline DATETIME NOT NULL,
  marks DECIMAL(5,2),
  max_marks DECIMAL(5,2) NOT NULL,
  feedback TEXT,
  graded_by VARCHAR(36),
  graded_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id),
  INDEX idx_type (submission_type),
  INDEX idx_status (status),
  INDEX idx_deadline (deadline)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id VARCHAR(36) PRIMARY KEY,
  submission_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  grader_id VARCHAR(36) NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  rubric_scores JSON,
  comments TEXT,
  feedback TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (grader_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_submission (submission_id),
  INDEX idx_project (project_id),
  INDEX idx_grader (grader_id),
  INDEX idx_published (is_published)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36),
  subject VARCHAR(200),
  content TEXT NOT NULL,
  attachment_path VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  read_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_sender (sender_id),
  INDEX idx_receiver (receiver_id),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at)
);

-- Broadcast messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  subject VARCHAR(200),
  content TEXT NOT NULL,
  target_roles JSON,
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender (sender_id),
  INDEX idx_created (created_at)
);

-- Presentation schedules
CREATE TABLE IF NOT EXISTS presentation_schedules (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  lab_room VARCHAR(100) NOT NULL,
  panel_members JSON,
  status ENUM('scheduled', 'completed', 'postponed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_schedule (project_id),
  INDEX idx_date (scheduled_date),
  INDEX idx_room (lab_room),
  INDEX idx_status (status)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36),
  old_value JSON,
  new_value JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(36) PRIMARY KEY,
  max_file_size VARCHAR(20) DEFAULT '10485760',
  max_resubmissions INT DEFAULT 3,
  session_timeout INT DEFAULT 3600,
  password_min_length INT DEFAULT 8,
  require_email_verification BOOLEAN DEFAULT false,
  enable_two_factor BOOLEAN DEFAULT false,
  maintenance_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create views for easy querying
CREATE OR REPLACE VIEW project_summary AS
SELECT 
  p.id,
  p.title,
  p.status,
  p.academic_year,
  CONCAT(s.first_name, ' ', s.last_name) as student_name,
  s.student_id as student_matric,
  s.email as student_email,
  CONCAT(l.first_name, ' ', l.last_name) as supervisor_name,
  l.email as supervisor_email,
  p.created_at
FROM projects p
JOIN users s ON p.student_id = s.id
LEFT JOIN users l ON p.supervisor_id = l.id;

CREATE OR REPLACE VIEW grade_summary AS
SELECT 
  p.id as project_id,
  p.title,
  CONCAT(u.first_name, ' ', u.last_name) as student_name,
  SUM(CASE WHEN g.is_published THEN g.marks ELSE 0 END) as total_marks,
  SUM(g.max_marks) as total_max_marks,
  COUNT(g.id) as graded_submissions
FROM projects p
JOIN users u ON p.student_id = u.id
LEFT JOIN grades g ON p.id = g.project_id
GROUP BY p.id, p.title, u.first_name, u.last_name;
`;

async function runMigrations() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Running migrations...');
    await connection.query(migrations);
    
    console.log('✅ Database migrations completed successfully!');
    console.log(`📦 Database: ${dbName}`);
    console.log('');
    console.log('Tables created:');
    console.log('  - users');
    console.log('  - academic_year_config');
    console.log('  - lecturer_capacity');
    console.log('  - projects');
    console.log('  - submissions');
    console.log('  - grades');
    console.log('  - messages');
    console.log('  - notifications');
    console.log('  - broadcast_messages');
    console.log('  - presentation_schedules');
    console.log('  - audit_logs');
    console.log('  - system_config');
    console.log('');
    console.log('Views created:');
    console.log('  - project_summary');
    console.log('  - grade_summary');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();

