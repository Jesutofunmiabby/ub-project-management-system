import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface SystemConfig {
  max_file_size: number;
  max_resubmissions: number;
  session_timeout: number;
  password_min_length: number;
  require_email_verification: boolean;
  enable_two_factor: boolean;
  maintenance_mode: boolean;
}

let cachedConfig: SystemConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Get system configuration from database with caching
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedConfig;
  }
  
  try {
    const [config] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM system_config LIMIT 1'
    );
    
    if (config.length > 0) {
      cachedConfig = {
        max_file_size: parseInt(config[0].max_file_size) || 10485760, // 10MB default
        max_resubmissions: parseInt(config[0].max_resubmissions) || 3,
        session_timeout: parseInt(config[0].session_timeout) || 3600,
        password_min_length: parseInt(config[0].password_min_length) || 8,
        require_email_verification: config[0].require_email_verification === 1 || config[0].require_email_verification === true,
        enable_two_factor: config[0].enable_two_factor === 1 || config[0].enable_two_factor === true,
        maintenance_mode: config[0].maintenance_mode === 1 || config[0].maintenance_mode === true,
      };
    } else {
      // Return defaults if no config exists
      cachedConfig = {
        max_file_size: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
        max_resubmissions: parseInt(process.env.MAX_RESUBMISSIONS || '3'),
        session_timeout: 3600,
        password_min_length: 8,
        require_email_verification: false,
        enable_two_factor: false,
        maintenance_mode: false,
      };
    }
    
    cacheTimestamp = now;
    return cachedConfig;
  } catch (error) {
    console.error('Error fetching system config:', error);
    // Return defaults on error
    return {
      max_file_size: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
      max_resubmissions: parseInt(process.env.MAX_RESUBMISSIONS || '3'),
      session_timeout: 3600,
      password_min_length: 8,
      require_email_verification: false,
      enable_two_factor: false,
      maintenance_mode: false,
    };
  }
}

/**
 * Clear the system config cache (call this after updating config)
 */
export function clearSystemConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

