import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import { authenticate } from '../middleware/auth';

const router = Router();
// Resolve upload directory to absolute path
const uploadDir = path.isAbsolute(config.upload.dir) 
  ? config.upload.dir 
  : path.resolve(process.cwd(), config.upload.dir);

// All routes require authentication
router.use(authenticate);

// Download file endpoint - use * to match all paths
router.get('*', (req, res) => {
  try {
    // Extract file path from request URL (everything after /api/uploads/)
    // req.path will be like '/filename.pdf' or '/uploads/filename.pdf' or '/subfolder/filename.pdf'
    let relativePath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    
    // Remove leading 'uploads/' if present (in case file_path in DB already includes it)
    if (relativePath.startsWith('uploads/')) {
      relativePath = relativePath.replace('uploads/', '');
    }
    // Also handle 'uploads\' on Windows
    if (relativePath.startsWith('uploads\\')) {
      relativePath = relativePath.replace('uploads\\', '');
    }
    
    // Security check - prevent directory traversal
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      console.error('Security violation: Invalid path', relativePath);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Normalize path separators (handle both Windows and Unix)
    relativePath = relativePath.replace(/\\/g, '/');
    
    // Remove any leading/trailing slashes
    relativePath = relativePath.replace(/^\/+|\/+$/g, '');
    
    // Build full file path
    const filePath = path.join(uploadDir, relativePath);
    
    // Additional security check - ensure path is within upload directory
    const normalizedUploadDir = path.normalize(path.resolve(uploadDir));
    const normalizedFilePath = path.normalize(path.resolve(filePath));
    
    console.log('Download request:', {
      originalPath: req.path,
      cleanedPath: relativePath,
      uploadDir: uploadDir,
      filePath: filePath,
      normalizedUploadDir: normalizedUploadDir,
      normalizedFilePath: normalizedFilePath,
      fileExists: fs.existsSync(filePath)
    });
    
    if (!normalizedFilePath.startsWith(normalizedUploadDir)) {
      console.error('Security violation: Path outside upload directory', {
        requested: relativePath,
        uploadDir: normalizedUploadDir,
        resolved: normalizedFilePath
      });
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', {
        requestedPath: req.path,
        relativePath: relativePath,
        fullPath: filePath,
        uploadDir: uploadDir,
        normalizedUploadDir: normalizedUploadDir
      });
      
      // List files in upload directory for debugging (only in development)
      if (config.nodeEnv === 'development') {
        try {
          const files = fs.readdirSync(uploadDir);
          console.log('Files in upload directory:', files.slice(0, 10)); // Show first 10 files
        } catch (err) {
          console.error('Could not read upload directory:', err);
        }
      }
      
      return res.status(404).json({ 
        success: false, 
        message: 'File not found',
        details: config.nodeEnv === 'development' ? `Looking for: ${filePath}` : undefined
      });
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.error('Path is not a file:', filePath);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.doc' || ext === '.docx') {
      contentType = 'application/msword';
    } else if (ext === '.zip') {
      contentType = 'application/zip';
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', contentType);
    // sendFile requires an absolute path
    res.sendFile(path.resolve(filePath));
  } catch (error: any) {
    console.error('Download error:', {
      error: error.message,
      stack: error.stack,
      requestedPath: req.path
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error downloading file',
      details: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
});

export default router;

