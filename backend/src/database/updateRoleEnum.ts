import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ubpms'
};

async function updateRoleEnum() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Updating users table to include admin role...');
    
    // Alter the role ENUM to include 'admin'
    await connection.execute(`
      ALTER TABLE users MODIFY COLUMN role ENUM('student', 'lecturer', 'coordinator', 'admin') NOT NULL
    `);
    
    console.log('✅ Role ENUM updated successfully!');
    console.log('');
    console.log('You can now run: npm run seed');
    
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.message?.includes('Duplicate column')) {
      console.log('⚠️  Role ENUM may already include admin. Continuing...');
    } else {
      console.error('❌ Update failed:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateRoleEnum();

