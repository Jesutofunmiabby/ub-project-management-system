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

async function createTestStudents() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);

    console.log('🔄 Creating test students...');

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Password123', salt);

    // Create 3 test students
    const students = [
      {
        first: 'John',
        last: 'Doe',
        email: 'john.doe@student.edu',
        studentId: 'STU101',
        dept: 'Computer Science'
      },
      {
        first: 'Jane',
        last: 'Smith',
        email: 'jane.smith@student.edu',
        studentId: 'STU102',
        dept: 'Computer Science'
      },
      {
        first: 'Mike',
        last: 'Johnson',
        email: 'mike.johnson@student.edu',
        studentId: 'STU103',
        dept: 'Information Technology'
      }
    ];

    for (const student of students) {
      const id = uuidv4();
      
      // Check if email or student_id already exists
      const [existingEmail] = await connection.execute<any[]>(
        'SELECT id FROM users WHERE email = ?',
        [student.email]
      );

      if (existingEmail.length > 0) {
        console.log(`  ⚠️  Student with email ${student.email} already exists, skipping...`);
        continue;
      }

      const [existingStudentId] = await connection.execute<any[]>(
        'SELECT id FROM users WHERE student_id = ?',
        [student.studentId]
      );

      if (existingStudentId.length > 0) {
        console.log(`  ⚠️  Student with ID ${student.studentId} already exists, skipping...`);
        continue;
      }

      await connection.execute(
        `INSERT INTO users (id, email, password, first_name, last_name, role, student_id, department, is_active)
         VALUES (?, ?, ?, ?, ?, 'student', ?, ?, true)`,
        [id, student.email, hashedPassword, student.first, student.last, student.studentId, student.dept]
      );

      console.log(`  ✓ Created student: ${student.first} ${student.last} (${student.email}) - ID: ${student.studentId}`);
    }

    console.log('\n✅ Test students created successfully!');
    console.log('\n📋 Login credentials:');
    students.forEach(student => {
      console.log(`   Email: ${student.email}`);
      console.log(`   Password: Password123`);
      console.log(`   Student ID: ${student.studentId}\n`);
    });

  } catch (error: any) {
    console.error('❌ Error creating test students:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
createTestStudents();

