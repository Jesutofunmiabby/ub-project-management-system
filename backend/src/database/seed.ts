import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ubpms'
};

async function seedDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Seeding database...');
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Password123', salt);
    
    // Create admin
    const adminId = uuidv4();
    await connection.execute(`
      INSERT INTO users (id, email, password, first_name, last_name, role, department)
      VALUES (?, 'admin@university.edu', ?, 'System', 'Administrator', 'admin', 'Administration')
      ON DUPLICATE KEY UPDATE email = email
    `, [adminId, hashedPassword]);
    console.log('  ✓ Admin account created');
    
    // Create coordinator
    const coordinatorId = uuidv4();
    await connection.execute(`
      INSERT INTO users (id, email, password, first_name, last_name, role, department)
      VALUES (?, 'coordinator@university.edu', ?, 'System', 'Coordinator', 'coordinator', 'Computer Science')
      ON DUPLICATE KEY UPDATE email = email
    `, [coordinatorId, hashedPassword]);
    console.log('  ✓ Coordinator account created');
    
    // Create lecturers
    const lecturers = [
      { first: 'John', last: 'Smith', email: 'j.smith@university.edu', dept: 'Computer Science' },
      { first: 'Sarah', last: 'Johnson', email: 's.johnson@university.edu', dept: 'Computer Science' },
      { first: 'Michael', last: 'Williams', email: 'm.williams@university.edu', dept: 'Information Technology' },
      { first: 'Emily', last: 'Brown', email: 'e.brown@university.edu', dept: 'Software Engineering' },
      { first: 'David', last: 'Davis', email: 'd.davis@university.edu', dept: 'Computer Science' }
    ];
    
    const lecturerIds: string[] = [];
    for (const lecturer of lecturers) {
      const id = uuidv4();
      lecturerIds.push(id);
      await connection.execute(`
        INSERT INTO users (id, email, password, first_name, last_name, role, department)
        VALUES (?, ?, ?, ?, ?, 'lecturer', ?)
        ON DUPLICATE KEY UPDATE email = email
      `, [id, lecturer.email, hashedPassword, lecturer.first, lecturer.last, lecturer.dept]);
    }
    console.log('  ✓ 5 Lecturer accounts created');
    
    // Create students
    const students = [
      { first: 'Alice', last: 'Anderson', email: 'alice.anderson@student.edu', studentId: 'STU001', dept: 'Computer Science' },
      { first: 'Bob', last: 'Baker', email: 'bob.baker@student.edu', studentId: 'STU002', dept: 'Computer Science' },
      { first: 'Charlie', last: 'Clark', email: 'charlie.clark@student.edu', studentId: 'STU003', dept: 'Information Technology' },
      { first: 'Diana', last: 'Davis', email: 'diana.davis@student.edu', studentId: 'STU004', dept: 'Software Engineering' },
      { first: 'Edward', last: 'Evans', email: 'edward.evans@student.edu', studentId: 'STU005', dept: 'Computer Science' }
    ];
    
    const studentIds: string[] = [];
    for (const student of students) {
      const id = uuidv4();
      studentIds.push(id);
      await connection.execute(`
        INSERT INTO users (id, email, password, first_name, last_name, role, student_id, department)
        VALUES (?, ?, ?, ?, ?, 'student', ?, ?)
        ON DUPLICATE KEY UPDATE email = email
      `, [id, student.email, hashedPassword, student.first, student.last, student.studentId, student.dept]);
    }
    console.log('  ✓ 5 Student accounts created');
    
    // Create academic year configuration
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}/${currentYear + 1}`;
    const academicYearId = uuidv4();
    
    await connection.execute(`
      INSERT INTO academic_year_config (
        id, year, topic_submission_start, topic_submission_end,
        alpha_deadline, beta_deadline, presentation_start, presentation_end,
        final_deadline, max_supervisor_load, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 10, true)
      ON DUPLICATE KEY UPDATE year = year
    `, [
      academicYearId,
      academicYear,
      new Date(currentYear, 8, 1), // Sep 1
      new Date(currentYear, 8, 30), // Sep 30
      new Date(currentYear, 10, 15), // Nov 15
      new Date(currentYear + 1, 0, 31), // Jan 31
      new Date(currentYear + 1, 2, 1), // Mar 1
      new Date(currentYear + 1, 2, 31), // Mar 31
      new Date(currentYear + 1, 4, 15) // May 15
    ]);
    console.log(`  ✓ Academic year ${academicYear} configured`);
    
    // Create lecturer capacities
    for (const lecturerId of lecturerIds) {
      await connection.execute(`
        INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students, is_available)
        VALUES (?, ?, ?, 10, 0, true)
        ON DUPLICATE KEY UPDATE lecturer_id = lecturer_id
      `, [uuidv4(), lecturerId, academicYear]);
    }
    console.log('  ✓ Lecturer capacities initialized');
    
    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📝 Test Accounts:');
    console.log('');
    console.log('   Admin:');
    console.log('   Email: admin@university.edu');
    console.log('   Password: Password123');
    console.log('');
    console.log('   Coordinator:');
    console.log('   Email: coordinator@university.edu');
    console.log('   Password: Password123');
    console.log('');
    console.log('   Lecturers:');
    console.log('   Email: j.smith@university.edu');
    console.log('   Email: s.johnson@university.edu');
    console.log('   Email: m.williams@university.edu');
    console.log('   Email: e.brown@university.edu');
    console.log('   Email: d.davis@university.edu');
    console.log('   Password: Password123 (for all)');
    console.log('');
    console.log('   Students:');
    console.log('   Email: alice.anderson@student.edu');
    console.log('   Email: bob.baker@student.edu');
    console.log('   Email: charlie.clark@student.edu');
    console.log('   Email: diana.davis@student.edu');
    console.log('   Email: edward.evans@student.edu');
    console.log('   Password: Password123 (for all)');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();

