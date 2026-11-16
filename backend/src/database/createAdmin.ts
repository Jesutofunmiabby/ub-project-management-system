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

async function createAdmin() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Generate admin credentials
    const adminEmail = 'admin2@university.edu';
    const adminPassword = 'Admin123!';
    const adminId = uuidv4();
    
    // Check if admin already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if (Array.isArray(existing) && existing.length > 0) {
      console.log('⚠️  Admin user already exists with this email.');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Create admin user
    await connection.execute(
      `INSERT INTO users (id, email, password, first_name, last_name, role, department, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', 'Administration', true, NOW(), NOW())`,
      [adminId, adminEmail, hashedPassword, 'System', 'Administrator']
    );
    
    console.log('');
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📝 Login Credentials:');
    console.log('   Email: ' + adminEmail);
    console.log('   Password: ' + adminPassword);
    console.log('');
    console.log('🔐 Please save these credentials securely.');
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Failed to create admin:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('   User with this email already exists.');
    } else if (error.code === 'WARN_DATA_TRUNCATED') {
      console.error('   Database schema issue. Make sure admin role is allowed.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdmin();

