import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { config } from './config/env';
import { testConnection } from './config/database';
import routes from './routes';

const app = express();

// Create upload directories if they don't exist
const uploadDir = config.upload.dir;
const attachmentsDir = path.join(uploadDir, 'attachments');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files with proper headers for downloading
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    // Set content disposition to attachment for PDF files
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the limit'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

// Start server
const PORT = config.port;

const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 UBPMS - University Project Management System          ║
║                                                            ║
║   Server running on port ${PORT}                             ║
║   Environment: ${config.nodeEnv}                              ║
║   API URL: http://localhost:${PORT}/api                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();

export default app;

