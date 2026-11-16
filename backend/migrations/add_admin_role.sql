-- Migration to add 'admin' role to users table
USE ubpms;

-- Alter the role ENUM to include 'admin'
ALTER TABLE users MODIFY COLUMN role ENUM('student', 'lecturer', 'coordinator', 'admin') NOT NULL;

