-- Migration: Add start and end date columns for Alpha, Beta, and Final deadlines
-- This allows each deadline type to have a submission window (start and end dates)
-- Run this script manually in your MySQL client

-- Add columns (ignore errors if columns already exist)
ALTER TABLE academic_year_config
ADD COLUMN alpha_deadline_start DATETIME NULL AFTER alpha_deadline;

ALTER TABLE academic_year_config
ADD COLUMN alpha_deadline_end DATETIME NULL AFTER alpha_deadline_start;

ALTER TABLE academic_year_config
ADD COLUMN beta_deadline_start DATETIME NULL AFTER beta_deadline;

ALTER TABLE academic_year_config
ADD COLUMN beta_deadline_end DATETIME NULL AFTER beta_deadline_start;

ALTER TABLE academic_year_config
ADD COLUMN final_deadline_start DATETIME NULL AFTER final_deadline;

ALTER TABLE academic_year_config
ADD COLUMN final_deadline_end DATETIME NULL AFTER final_deadline_start;

-- Migrate existing data: set start dates to 7 days before end dates, and end dates to the existing deadline
-- This ensures backward compatibility
UPDATE academic_year_config
SET 
  alpha_deadline_start = DATE_SUB(alpha_deadline, INTERVAL 7 DAY),
  alpha_deadline_end = alpha_deadline,
  beta_deadline_start = DATE_SUB(beta_deadline, INTERVAL 7 DAY),
  beta_deadline_end = beta_deadline,
  final_deadline_start = DATE_SUB(final_deadline, INTERVAL 7 DAY),
  final_deadline_end = final_deadline
WHERE alpha_deadline_start IS NULL AND alpha_deadline IS NOT NULL;

