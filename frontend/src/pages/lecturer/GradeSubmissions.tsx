import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  alpha,
  Skeleton,
  Grid,
  Tabs,
  Tab,
  Paper,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  Grade as GradeIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Slideshow as PresentationIcon,
  ManageAccounts as ManagementIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { submissionsAPI, dashboardAPI, gradesAPI } from '../../services/api';
import { Submission } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

interface Supervisee {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  project_id: string;
  project_title: string;
  submissions: Array<{
    id: string;
    submission_type: string;
    status: string;
    marks: number | null;
    max_marks: number;
    file_path: string | null;
    submitted_at: string | null;
    is_published?: boolean;
    deadline?: string;
  }>;
}

const gradeConstraints: Record<string, { max: number; title: string; color: string; icon: React.ReactNode }> = {
  alpha: { max: 6, title: 'Alpha Submission', color: '#3b82f6', icon: <AssignmentIcon /> },
  beta: { max: 4, title: 'Beta Submission', color: '#8b5cf6', icon: <AssignmentIcon /> },
  presentation: { max: 20, title: 'Presentation', color: '#f59e0b', icon: <PresentationIcon /> },
  project_management: { max: 10, title: 'Project Management', color: '#10b981', icon: <ManagementIcon /> },
  final: { max: 60, title: 'Final Documentation', color: '#ef4444', icon: <AssignmentIcon /> },
};

// Helper to safely format marks with 2 decimal places
const formatMarks = (marks: any): string => {
  if (marks === null || marks === undefined) return '-';
  const num = typeof marks === 'string' ? parseFloat(marks) : Number(marks);
  if (isNaN(num)) return '-';
  return num.toFixed(2);
};

// Helper to get the next submission deadline (for locking grades)
const getNextDeadline = (currentType: string, academicYear: any): Date | null => {
  if (!academicYear) return null;
  
  const deadlineOrder = ['alpha', 'beta', 'presentation', 'project_management', 'final'];
  const currentIndex = deadlineOrder.indexOf(currentType);
  
  if (currentIndex === -1 || currentIndex >= deadlineOrder.length - 1) {
    return academicYear.final_deadline ? new Date(academicYear.final_deadline) : null;
  }
  
  // Map submission types to academic year deadlines
  const deadlineMap: Record<string, string> = {
    alpha: academicYear.beta_deadline || academicYear.alpha_deadline,
    beta: academicYear.presentation_start || academicYear.beta_deadline,
    presentation: academicYear.final_deadline,
    project_management: academicYear.final_deadline,
    final: academicYear.final_deadline,
  };
  
  return deadlineMap[currentType] ? new Date(deadlineMap[currentType]) : null;
};

const GradeSubmissions: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [marksInput, setMarksInput] = useState<string>('');
  const [marksError, setMarksError] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  
  // For direct grade entry
  const [directGradeDialog, setDirectGradeDialog] = useState<{
    open: boolean;
    studentId: string;
    projectId: string;
    studentName: string;
    submissionType: string;
    submissionId: string;
    currentMarks: number | null;
  } | null>(null);

  // For reveal grades
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [revealDialogOpen, setRevealDialogOpen] = useState(false);
  const [selectedSubmissionType, setSelectedSubmissionType] = useState<string>('all');

  // Fetch pending document submissions
  const { data: submissions, isLoading: loadingSubmissions } = useQuery<Submission[]>({
    queryKey: ['pendingSubmissions'],
    queryFn: async () => {
      const response = await submissionsAPI.getPendingReviews();
      return response.data.data;
    },
  });

  // Fetch supervisees with their grades
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['lecturerDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getLecturerDashboard();
      return response.data.data;
    },
  });

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, marks, feedback }: { 
      submissionId: string; 
      marks: number; 
      feedback: string 
    }) => submissionsAPI.grade(submissionId, marks, feedback),
    onSuccess: () => {
      enqueueSnackbar('Grade saved successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['pendingSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['lecturerDashboard'] });
      handleCloseDialog();
      setDirectGradeDialog(null);
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Grading failed', { variant: 'error' });
    },
  });

  const revealGradesMutation = useMutation({
    mutationFn: ({ projectIds, submissionType }: { projectIds: string[]; submissionType?: string }) => 
      gradesAPI.publish(projectIds, submissionType),
    onSuccess: () => {
      enqueueSnackbar('Grades revealed to students successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lecturerDashboard'] });
      setRevealDialogOpen(false);
      setSelectedStudents(new Set());
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to reveal grades', { variant: 'error' });
    },
  });

  // Validate marks input
  const validateMarks = (value: string, maxMarks: number): { valid: boolean; error: string } => {
    if (value === '') {
      return { valid: false, error: 'Please enter a grade' };
    }

    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { valid: false, error: 'Please enter a valid number' };
    }

    if (num < 0) {
      return { valid: false, error: 'Grade cannot be negative' };
    }

    if (num > maxMarks) {
      return { valid: false, error: `Grade cannot exceed ${maxMarks}` };
    }

    // Check decimal places
    const decimalParts = value.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      return { valid: false, error: 'Maximum 2 decimal places allowed' };
    }

    return { valid: true, error: '' };
  };

  const handleMarksChange = (value: string, maxMarks: number) => {
    setMarksInput(value);
    const { error } = validateMarks(value, maxMarks);
    setMarksError(error);
  };

  const handleOpenDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setMarksInput(submission.marks?.toString() || '');
    setMarksError('');
    setFeedback('');
  };

  const handleCloseDialog = () => {
    setSelectedSubmission(null);
    setMarksInput('');
    setMarksError('');
    setFeedback('');
  };

  const handleGrade = () => {
    if (!selectedSubmission) return;
    
    const maxMarks = gradeConstraints[selectedSubmission.submission_type]?.max || selectedSubmission.max_marks;
    const validation = validateMarks(marksInput, maxMarks);
    
    if (!validation.valid) {
      enqueueSnackbar(validation.error, { variant: 'error' });
      return;
    }

    const marks = parseFloat(parseFloat(marksInput).toFixed(2));
    
    gradeMutation.mutate({
      submissionId: selectedSubmission.id,
      marks,
      feedback,
    });
  };

  const handleDirectGrade = () => {
    if (!directGradeDialog) return;
    
    const maxMarks = gradeConstraints[directGradeDialog.submissionType]?.max || 100;
    const validation = validateMarks(marksInput, maxMarks);
    
    if (!validation.valid) {
      enqueueSnackbar(validation.error, { variant: 'error' });
      return;
    }

    const marks = parseFloat(parseFloat(marksInput).toFixed(2));
    
    gradeMutation.mutate({
      submissionId: directGradeDialog.submissionId,
      marks,
      feedback,
    });
  };

  const openDirectGradeDialog = (
    studentId: string,
    projectId: string,
    studentName: string,
    submissionType: string,
    submissionId: string,
    currentMarks: number | null
  ) => {
    setDirectGradeDialog({
      open: true,
      studentId,
      projectId,
      studentName,
      submissionType,
      submissionId,
      currentMarks,
    });
    setMarksInput(currentMarks?.toString() || '');
    setMarksError('');
    setFeedback('');
  };

  const handleSelectStudent = (projectId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === supervisees.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(supervisees.map((s: Supervisee) => s.project_id)));
    }
  };

  const handleRevealGrades = () => {
    if (selectedStudents.size === 0) {
      enqueueSnackbar('Please select at least one student', { variant: 'warning' });
      return;
    }
    
    revealGradesMutation.mutate({
      projectIds: Array.from(selectedStudents),
      submissionType: selectedSubmissionType === 'all' ? undefined : selectedSubmissionType,
    });
  };

  // Check if grade editing is locked based on deadline
  const isGradeLocked = (submissionType: string): boolean => {
    const academicYear = dashboardData?.academicYear;
    const nextDeadline = getNextDeadline(submissionType, academicYear);
    
    if (!nextDeadline) return false;
    return new Date() > nextDeadline;
  };

  const supervisees = dashboardData?.supervisees || [];

  // Download handler
  const handleDownload = async (filePath: string, fileName?: string) => {
    if (!filePath) return;
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      // Clean the file path - remove 'uploads/' prefix if present
      let cleanPath = filePath;
      if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.replace('uploads/', '');
      }
      if (cleanPath.startsWith('uploads\\')) {
        cleanPath = cleanPath.replace('uploads\\', '');
      }
      // Remove leading/trailing slashes
      cleanPath = cleanPath.replace(/^\/+|\\+|(\/|\\)+$/g, '');
      
      // Create the download URL (use proxy path)
      const downloadUrl = `/api/uploads/${cleanPath}`;
      
      // Fetch the file with authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create a temporary URL and download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || filePath.split('/').pop() || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      enqueueSnackbar('Failed to download file. Please try again.', { variant: 'error' });
    }
  };

  if (loadingSubmissions || loadingDashboard) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          Grade Submissions
        </Typography>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={150} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Grade Submissions
          </Typography>
          <Typography color="text.secondary">
            Manage grades for your supervisees' submissions
          </Typography>
        </Box>
        
        {/* Reveal Grades Button */}
        {supervisees.length > 0 && (
          <Button
            variant="contained"
            startIcon={<VisibilityIcon />}
            onClick={() => setRevealDialogOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            Reveal Grades to Students
          </Button>
        )}
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: `1px solid ${alpha('#ffffff', 0.1)}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`Document Submissions (${submissions?.length || 0})`} />
          <Tab label={`All Grades (${supervisees.length} students)`} />
        </Tabs>

        {/* Tab 0: Document Submissions */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Grade document submissions (Alpha, Beta, Final) that have been uploaded by students. 
              Click the download button to view submitted documents.
            </Alert>

            {!submissions || submissions.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <CheckIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    No Pending Submissions
                  </Typography>
                  <Typography color="text.secondary">
                    All document submissions have been graded. Check back later.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              submissions.map((submission) => {
                const locked = isGradeLocked(submission.submission_type);
                
                return (
                  <Card key={submission.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {submission.project_title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {submission.student_first_name} {submission.student_last_name} ({submission.student_matric})
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Type
                          </Typography>
                          <Chip
                            label={submission.submission_type?.replace('_', ' ')}
                            size="small"
                            sx={{
                              textTransform: 'capitalize',
                              background: alpha(gradeConstraints[submission.submission_type]?.color || '#3b82f6', 0.15),
                              color: gradeConstraints[submission.submission_type]?.color || '#3b82f6',
                            }}
                          />
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Max Marks
                          </Typography>
                          <Typography sx={{ fontWeight: 600 }}>
                            {gradeConstraints[submission.submission_type]?.max || submission.max_marks}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Submitted
                          </Typography>
                          <Typography variant="body2">
                            {submission.submitted_at
                              ? format(new Date(submission.submitted_at), 'MMM d, yyyy')
                              : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {submission.file_path && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownload(submission.file_path!, submission.file_name)}
                              >
                                Download
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={locked ? <LockIcon /> : <GradeIcon />}
                              onClick={() => handleOpenDialog(submission)}
                              disabled={locked}
                              sx={{
                                background: locked 
                                  ? alpha('#ffffff', 0.1)
                                  : `linear-gradient(135deg, ${gradeConstraints[submission.submission_type]?.color || '#3b82f6'} 0%, ${alpha(gradeConstraints[submission.submission_type]?.color || '#3b82f6', 0.7)} 100%)`,
                              }}
                            >
                              {locked ? 'Locked' : 'Grade'}
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Box>
        </TabPanel>

        {/* Tab 1: All Grades Overview */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Grade Constraints:</strong> Alpha (0-6), Beta (0-4), Presentation (0-20), Project Management (0-10), Final (0-60).
              <br />
              <strong>Decimals:</strong> Up to 2 decimal places allowed (e.g., 5.75)
              <br />
              <strong>CA Total:</strong> 40 marks | <strong>Grand Total:</strong> 100 marks
            </Alert>

            {supervisees.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    No Supervisees
                  </Typography>
                  <Typography color="text.secondary">
                    You don't have any supervisees assigned yet.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Select All */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedStudents.size === supervisees.length && supervisees.length > 0}
                        indeterminate={selectedStudents.size > 0 && selectedStudents.size < supervisees.length}
                        onChange={handleSelectAll}
                      />
                    }
                    label="Select All Students"
                  />
                  {selectedStudents.size > 0 && (
                    <Chip
                      label={`${selectedStudents.size} selected`}
                      color="primary"
                      size="small"
                    />
                  )}
                </Box>

                {supervisees.map((student: Supervisee) => {
                  // Calculate totals for this student
                  const getSubmissionMark = (type: string): number => {
                    const sub = student.submissions?.find((s) => s.submission_type === type);
                    const marks = sub?.marks;
                    if (marks === null || marks === undefined) return 0;
                    const num = typeof marks === 'string' ? parseFloat(marks) : Number(marks);
                    return isNaN(num) ? 0 : num;
                  };

                  const alphaMarks = getSubmissionMark('alpha');
                  const betaMarks = getSubmissionMark('beta');
                  const presentationMarks = getSubmissionMark('presentation');
                  const projectManagementMarks = getSubmissionMark('project_management');
                  const finalMarks = getSubmissionMark('final');
                  const caTotal = alphaMarks + betaMarks + presentationMarks + projectManagementMarks;
                  const grandTotal = caTotal + finalMarks;

                  return (
                    <Card key={student.id} sx={{ mb: 3 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Checkbox
                              checked={selectedStudents.has(student.project_id)}
                              onChange={() => handleSelectStudent(student.project_id)}
                            />
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {student.first_name} {student.last_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {student.student_id} • {student.project_title}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" color="text.secondary">
                              Total Score
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                              {formatMarks(grandTotal)} / 100
                            </Typography>
                          </Box>
                        </Box>

                        <Grid container spacing={2}>
                          {/* CA Components */}
                          {['alpha', 'beta', 'presentation', 'project_management'].map((type) => {
                            const sub = student.submissions?.find((s) => s.submission_type === type);
                            const constraint = gradeConstraints[type];
                            const hasGrade = sub?.marks !== null && sub?.marks !== undefined;
                            const canGrade = type === 'presentation' || type === 'project_management' || (sub?.status === 'submitted') || hasGrade;
                            const locked = isGradeLocked(type);

                            return (
                              <Grid item xs={6} sm={4} md={2.4} key={type}>
                                <Box
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    background: alpha(constraint.color, 0.05),
                                    border: `1px solid ${alpha(constraint.color, 0.2)}`,
                                    height: '100%',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ color: constraint.color }}>{constraint.icon}</Box>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      {sub?.file_path && (
                                        <Tooltip title="Download Document">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDownload(sub.file_path!, `${student.first_name}_${type}.pdf`)}
                                          >
                                            <DownloadIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {sub && (
                                        <Tooltip title={locked ? 'Grade Locked' : (hasGrade ? 'Edit Grade' : 'Enter Grade')}>
                                          <span>
                                            <IconButton
                                              size="small"
                                              onClick={() => openDirectGradeDialog(
                                                student.id,
                                                student.project_id,
                                                `${student.first_name} ${student.last_name}`,
                                                type,
                                                sub.id,
                                                sub.marks
                                              )}
                                              disabled={locked || (!canGrade && !hasGrade)}
                                            >
                                              {locked ? <LockIcon fontSize="small" /> : (hasGrade ? <EditIcon fontSize="small" /> : <GradeIcon fontSize="small" />)}
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {constraint.title}
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: hasGrade ? constraint.color : 'text.disabled' }}>
                                    {hasGrade ? formatMarks(sub?.marks) : '-'} / {constraint.max}
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={hasGrade ? (sub!.marks! / constraint.max) * 100 : 0}
                                    sx={{
                                      mt: 1,
                                      height: 4,
                                      borderRadius: 2,
                                      background: alpha(constraint.color, 0.2),
                                      '& .MuiLinearProgress-bar': {
                                        background: constraint.color,
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                  {sub?.is_published && (
                                    <Chip
                                      label="Revealed"
                                      size="small"
                                      color="success"
                                      sx={{ mt: 1, height: 20, fontSize: '0.65rem' }}
                                    />
                                  )}
                                </Box>
                              </Grid>
                            );
                          })}

                          {/* Final */}
                          <Grid item xs={6} sm={4} md={2.4}>
                            {(() => {
                              const sub = student.submissions?.find((s) => s.submission_type === 'final');
                              const constraint = gradeConstraints.final;
                              const hasGrade = sub?.marks !== null && sub?.marks !== undefined;
                              const canGrade = sub?.status === 'submitted' || hasGrade;
                              const locked = isGradeLocked('final');

                              return (
                                <Box
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    background: alpha(constraint.color, 0.05),
                                    border: `1px solid ${alpha(constraint.color, 0.2)}`,
                                    height: '100%',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ color: constraint.color }}>{constraint.icon}</Box>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      {sub?.file_path && (
                                        <Tooltip title="Download Document">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDownload(sub.file_path!, `${student.first_name}_final.pdf`)}
                                          >
                                            <DownloadIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {sub && (
                                        <Tooltip title={locked ? 'Grade Locked' : (hasGrade ? 'Edit Grade' : 'Enter Grade')}>
                                          <span>
                                            <IconButton
                                              size="small"
                                              onClick={() => openDirectGradeDialog(
                                                student.id,
                                                student.project_id,
                                                `${student.first_name} ${student.last_name}`,
                                                'final',
                                                sub.id,
                                                sub.marks
                                              )}
                                              disabled={locked || (!canGrade && !hasGrade)}
                                            >
                                              {locked ? <LockIcon fontSize="small" /> : (hasGrade ? <EditIcon fontSize="small" /> : <GradeIcon fontSize="small" />)}
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {constraint.title}
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: hasGrade ? constraint.color : 'text.disabled' }}>
                                    {hasGrade ? formatMarks(sub?.marks) : '-'} / {constraint.max}
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={hasGrade ? (sub!.marks! / constraint.max) * 100 : 0}
                                    sx={{
                                      mt: 1,
                                      height: 4,
                                      borderRadius: 2,
                                      background: alpha(constraint.color, 0.2),
                                      '& .MuiLinearProgress-bar': {
                                        background: constraint.color,
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                  {sub?.is_published && (
                                    <Chip
                                      label="Revealed"
                                      size="small"
                                      color="success"
                                      sx={{ mt: 1, height: 20, fontSize: '0.65rem' }}
                                    />
                                  )}
                                </Box>
                              );
                            })()}
                          </Grid>
                        </Grid>

                        <Divider sx={{ my: 2, opacity: 0.1 }} />

                        {/* Summary */}
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              CA Total (40)
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#3b82f6' }}>
                              {formatMarks(caTotal)} / 40
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Final (60)
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#ef4444' }}>
                              {formatMarks(finalMarks)} / 60
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Grand Total (100)
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>
                              {formatMarks(grandTotal)} / 100
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Document Grade Dialog */}
      <Dialog open={!!selectedSubmission} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Grade Submission
          <Typography variant="body2" color="text.secondary">
            {selectedSubmission?.submission_type?.replace('_', ' ')} - {selectedSubmission?.project_title}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Grade"
              type="number"
              value={marksInput}
              onChange={(e) => handleMarksChange(e.target.value, gradeConstraints[selectedSubmission?.submission_type || '']?.max || selectedSubmission?.max_marks || 100)}
              error={!!marksError}
              helperText={marksError || `Valid range: 0 - ${gradeConstraints[selectedSubmission?.submission_type || '']?.max || selectedSubmission?.max_marks} (up to 2 decimal places)`}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    / {gradeConstraints[selectedSubmission?.submission_type || '']?.max || selectedSubmission?.max_marks}
                  </InputAdornment>
                ),
              }}
              inputProps={{
                step: '0.01',
                min: 0,
                max: gradeConstraints[selectedSubmission?.submission_type || '']?.max || selectedSubmission?.max_marks,
              }}
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Feedback"
            placeholder="Provide constructive feedback for the student..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGrade}
            disabled={gradeMutation.isPending || !!marksError}
            sx={{
              background: `linear-gradient(135deg, ${gradeConstraints[selectedSubmission?.submission_type || '']?.color || '#3b82f6'} 0%, ${alpha(gradeConstraints[selectedSubmission?.submission_type || '']?.color || '#3b82f6', 0.7)} 100%)`,
            }}
          >
            Save Grade
          </Button>
        </DialogActions>
      </Dialog>

      {/* Direct Grade Dialog */}
      <Dialog
        open={!!directGradeDialog}
        onClose={() => setDirectGradeDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {directGradeDialog?.currentMarks !== null ? 'Edit' : 'Enter'} Grade
          <Typography variant="body2" color="text.secondary">
            {gradeConstraints[directGradeDialog?.submissionType || '']?.title} - {directGradeDialog?.studentName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Grade"
              type="number"
              value={marksInput}
              onChange={(e) => handleMarksChange(e.target.value, gradeConstraints[directGradeDialog?.submissionType || '']?.max || 100)}
              error={!!marksError}
              helperText={marksError || `Valid range: 0 - ${gradeConstraints[directGradeDialog?.submissionType || '']?.max} (up to 2 decimal places)`}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    / {gradeConstraints[directGradeDialog?.submissionType || '']?.max}
                  </InputAdornment>
                ),
              }}
              inputProps={{
                step: '0.01',
                min: 0,
                max: gradeConstraints[directGradeDialog?.submissionType || '']?.max,
              }}
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Feedback (Optional)"
            placeholder="Provide feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDirectGradeDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDirectGrade}
            disabled={gradeMutation.isPending || !!marksError}
            sx={{
              background: `linear-gradient(135deg, ${gradeConstraints[directGradeDialog?.submissionType || '']?.color || '#3b82f6'} 0%, ${alpha(gradeConstraints[directGradeDialog?.submissionType || '']?.color || '#3b82f6', 0.7)} 100%)`,
            }}
          >
            Save Grade
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reveal Grades Dialog */}
      <Dialog
        open={revealDialogOpen}
        onClose={() => setRevealDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reveal Grades to Students
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Revealing grades will make them visible to students in their "View My Grades" page.
            You can still edit and re-reveal grades before the next submission deadline.
          </Alert>

          <TextField
            select
            fullWidth
            label="Which grades to reveal?"
            value={selectedSubmissionType}
            onChange={(e) => setSelectedSubmissionType(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mb: 3 }}
          >
            <option value="all">All Grades</option>
            <option value="alpha">Alpha Only</option>
            <option value="beta">Beta Only</option>
            <option value="presentation">Presentation Only</option>
            <option value="project_management">Project Management Only</option>
            <option value="final">Final Only</option>
          </TextField>

          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Selected Students ({selectedStudents.size}):
          </Typography>
          
          {selectedStudents.size === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No students selected. Go back to the "All Grades" tab and select students using the checkboxes.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {supervisees
                .filter((s: Supervisee) => selectedStudents.has(s.project_id))
                .map((s: Supervisee) => (
                  <Chip
                    key={s.id}
                    label={`${s.first_name} ${s.last_name}`}
                    sx={{ m: 0.5 }}
                    onDelete={() => handleSelectStudent(s.project_id)}
                  />
                ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevealDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRevealGrades}
            disabled={revealGradesMutation.isPending || selectedStudents.size === 0}
            startIcon={<VisibilityIcon />}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            Reveal Grades
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GradeSubmissions;
