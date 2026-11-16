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

async function createSystemConfigTable() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔄 Creating system_config table...');
    
    await connection.execute(`
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
      )
    `);
    
    // Insert default config if table is empty
    const [existing] = await connection.execute(
      'SELECT COUNT(*) as count FROM system_config'
    );
    
    if (Array.isArray(existing) && existing[0] && (existing[0] as any).count === 0) {
      const { v4: uuidv4 } = require('uuid');
      await connection.execute(
        `INSERT INTO system_config (id, max_file_size, max_resubmissions, session_timeout, password_min_length, require_email_verification, enable_two_factor, maintenance_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), '10485760', 3, 3600, 8, false, false, false]
      );
      console.log('✅ Default system configuration inserted');
    }
    
    console.log('✅ system_config table created successfully!');
    
  } catch (error: any) {
    console.error('❌ Failed to create system_config table:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table already exists, skipping creation');
    } else {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createSystemConfigTable();

