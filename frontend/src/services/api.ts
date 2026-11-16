import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (data: any) => 
    api.post('/auth/register', data),
  getProfile: () => 
    api.get('/auth/profile'),
  updateProfile: (data: any) => 
    api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { current_password: currentPassword, new_password: newPassword }),
};

// Dashboard API
export const dashboardAPI = {
  getStudentDashboard: () => 
    api.get('/dashboard'),
  getLecturerDashboard: () => 
    api.get('/dashboard'),
  getCoordinatorDashboard: () => 
    api.get('/coordinator/dashboard'),
};

// Projects API
export const projectsAPI = {
  getAll: (params?: any) => 
    api.get('/projects', { params }),
  getById: (id: string) => 
    api.get(`/projects/${id}`),
  create: (data: any) => 
    api.post('/projects', data),
  update: (id: string, data: any) => 
    api.put(`/projects/${id}`, data),
  review: (id: string, action: string, reason?: string, notes?: string) =>
    api.post(`/projects/${id}/review`, { action, reason, modification_notes: notes }),
  checkDuplicate: (description: string) =>
    api.post('/projects/check-duplicate', { description }),
  getAvailableLecturers: () =>
    api.get('/projects/lecturers/available'),
};

// Submissions API
export const submissionsAPI = {
  getByProject: (projectId: string) =>
    api.get(`/submissions/project/${projectId}`),
  getDetails: (submissionId: string) =>
    api.get(`/submissions/${submissionId}`),
  upload: (submissionId: string, file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post(`/submissions/${submissionId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  grade: (submissionId: string, marks: number, feedback?: string, rubricScores?: any) =>
    api.post(`/submissions/${submissionId}/grade`, { marks, feedback, rubric_scores: rubricScores }),
  getPendingReviews: () =>
    api.get('/submissions/pending'),
};

// Grades API
export const gradesAPI = {
  getByProject: (projectId: string) =>
    api.get(`/grades/project/${projectId}`),
  publish: (projectIds: string[], submissionType?: string) =>
    api.post('/grades/publish', { projectIds, submissionType }),
  getStatistics: (params?: any) =>
    api.get('/grades/statistics', { params }),
  update: (gradeId: string, marks: number, feedback?: string, justification?: string) =>
    api.put(`/grades/${gradeId}`, { marks, feedback, justification }),
};

// Messages API
export const messagesAPI = {
  getAll: (params?: any) =>
    api.get('/messages', { params }),
  getConversation: (userId: string) =>
    api.get(`/messages/conversation/${userId}`),
  send: (receiverId: string, content: string, subject?: string, projectId?: string) =>
    api.post('/messages', { receiver_id: receiverId, content, subject, project_id: projectId }),
  getUnreadCount: () =>
    api.get('/messages/unread'),
  markAsRead: (messageId: string) =>
    api.put(`/messages/${messageId}/read`),
  getContacts: () =>
    api.get('/messages/contacts'),
  broadcast: (subject: string, content: string, targetRoles?: string[]) =>
    api.post('/messages/broadcast', { subject, content, targetRoles }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: any) =>
    api.get('/notifications', { params }),
  getUnreadCount: () =>
    api.get('/notifications/unread'),
  markAsRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () =>
    api.put('/notifications/read-all'),
  delete: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`),
  clearAll: () =>
    api.delete('/notifications/clear'),
};

// Coordinator API
export const coordinatorAPI = {
  getDashboard: () =>
    api.get('/coordinator/dashboard'),
  getAcademicYears: () =>
    api.get('/coordinator/academic-years'),
  configureAcademicYear: (data: any) =>
    api.post('/coordinator/academic-years', data),
  getUsers: (params?: any) =>
    api.get('/coordinator/users', { params }),
  getUserById: (userId: string) =>
    api.get(`/coordinator/users/${userId}`),
  createUser: (data: any) =>
    api.post('/coordinator/users', data),
  updateUser: (userId: string, data: any) =>
    api.put(`/coordinator/users/${userId}`, data),
  deleteUser: (userId: string) =>
    api.delete(`/coordinator/users/${userId}`),
  toggleUserStatus: (userId: string) =>
    api.put(`/coordinator/users/${userId}/toggle-status`),
  setLecturerCapacity: (lecturerId: string, maxStudents: number, isAvailable: boolean) =>
    api.put(`/coordinator/lecturers/${lecturerId}/capacity`, { max_students: maxStudents, is_available: isAvailable }),
  assignSupervisor: (projectId: string, supervisorId: string) =>
    api.post(`/coordinator/projects/${projectId}/assign-supervisor`, { supervisor_id: supervisorId }),
  getProjectsWithGrades: (params?: any) =>
    api.get('/coordinator/projects/assessment', { params }),
  getSimilarProjects: (projectId: string) =>
    api.get(`/coordinator/projects/${projectId}/similar`),
  getPresentations: (params?: any) =>
    api.get('/coordinator/presentations', { params }),
  schedulePresentations: (schedules: any[]) =>
    api.post('/coordinator/presentations', { schedules }),
  getAuditLogs: (params?: any) =>
    api.get('/coordinator/audit-logs', { params }),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  
  // User Management
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  resetUserPassword: (id: string, newPassword: string) => 
    api.post(`/admin/users/${id}/reset-password`, { new_password: newPassword }),
  
  // System Configuration
  getSystemConfig: () => api.get('/admin/system/config'),
  updateSystemConfig: (data: any) => api.put('/admin/system/config', data),
  
  // Security Controls
  getSecurityLogs: (params?: any) => api.get('/admin/security/logs', { params }),
  getFailedLoginAttempts: (params?: any) => api.get('/admin/security/failed-logins', { params }),
  blockUser: (id: string) => api.post(`/admin/security/users/${id}/block`),
  unblockUser: (id: string) => api.post(`/admin/security/users/${id}/unblock`),
  
  // Monitoring
  getSystemMetrics: () => api.get('/admin/monitoring/metrics'),
  
  // Data Archiving
  getArchivedData: (params?: any) => api.get('/admin/archive', { params }),
  archiveData: (data: any) => api.post('/admin/archive', data),
  
  // Notification Management
  getNotifications: (params?: any) => api.get('/admin/notifications', { params }),
  sendBroadcastNotification: (data: any) => api.post('/admin/notifications/broadcast', data),
  
  // Audit & Compliance
  getAuditLogs: (params?: any) => api.get('/admin/audit/logs', { params }),
  exportAuditLogs: (params?: any) => api.get('/admin/audit/export', { params }),
  
  // Integrations
  getIntegrations: () => api.get('/admin/integrations'),
  
  // Customization
  getCustomizationSettings: () => api.get('/admin/customization'),
  updateCustomizationSettings: (data: any) => api.put('/admin/customization', data),
  
  // Support Tools
  getSystemHealth: () => api.get('/admin/support/health'),
  
  // Disaster Recovery
  getBackups: () => api.get('/admin/backup'),
  createBackup: () => api.post('/admin/backup'),
  restoreBackup: (backupId: string) => api.post('/admin/backup/restore', { backup_id: backupId }),
};

export default api;

