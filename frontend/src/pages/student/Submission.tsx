import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  LinearProgress,
  Chip,
  alpha,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { dashboardAPI, submissionsAPI } from '../../services/api';

interface StudentDashboard {
  project: {
    id: string;
    title: string;
    status: string;
    supervisor_first_name?: string;
    supervisor_last_name?: string;
  } | null;
  submissions: Array<{
    id: string;
    submission_type: string;
    status: string;
    deadline: string;
    submitted_at: string | null;
    file_path: string | null;
    marks: number | null;
    max_marks: number;
  }>;
}

const submissionInfo: Record<string, { title: string; description: string; maxMarks: number; color: string }> = {
  alpha: {
    title: 'Alpha Submission',
    description: 'Submit your initial literature review and project plan (8-10 pages PDF). This includes your project introduction, problem statement, objectives, and initial literature review.',
    maxMarks: 6,
    color: '#3b82f6',
  },
  beta: {
    title: 'Beta Submission',
    description: 'Submit your methodology section and initial implementation. Include your system design, architecture diagrams, and preliminary results.',
    maxMarks: 4,
    color: '#8b5cf6',
  },
  final: {
    title: 'Final Documentation',
    description: 'Submit your comprehensive final report including complete documentation, code documentation, test results, and user manual.',
    maxMarks: 60,
    color: '#10b981',
  },
};

const statusColors: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  pending: { bg: alpha('#f59e0b', 0.1), color: '#f59e0b', icon: <PendingIcon /> },
  submitted: { bg: alpha('#3b82f6', 0.1), color: '#3b82f6', icon: <CheckIcon /> },
  graded: { bg: alpha('#10b981', 0.1), color: '#10b981', icon: <CheckIcon /> },
  resubmission_required: { bg: alpha('#ef4444', 0.1), color: '#ef4444', icon: <ErrorIcon /> },
};

const Submission: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: dashboard, isLoading } = useQuery<StudentDashboard>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response.data.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ submissionId, file }: { submissionId: string; file: File }) => {
      return submissionsAPI.upload(submissionId, file);
    },
    onSuccess: () => {
      enqueueSnackbar('Document submitted successfully!', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to upload document', { variant: 'error' });
    },
  });

  const handleOpenDialog = (submission: any) => {
    setSelectedSubmission(submission);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setUploadDialogOpen(false);
    setSelectedSubmission(null);
    setSelectedFile(null);
    setUploading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        enqueueSnackbar('Please upload a PDF file only', { variant: 'error' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        enqueueSnackbar('File size must be less than 10MB', { variant: 'error' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedSubmission || !selectedFile) return;
    setUploading(true);
    uploadMutation.mutate({ submissionId: selectedSubmission.id, file: selectedFile });
  };

  // Filter only uploadable submissions (alpha, beta, final)
  const uploadableSubmissions = dashboard?.submissions?.filter(
    (s) => ['alpha', 'beta', 'final'].includes(s.submission_type)
  ) || [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard?.project) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          Submission
        </Typography>
        <Alert severity="info">
          You need to have an approved project before you can submit documents.
        </Alert>
      </Box>
    );
  }

  const projectApproved = ['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(dashboard.project.status);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Submission
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Upload your Alpha, Beta, and Final documents here
      </Typography>

      {!projectApproved && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your project is not yet approved. You can only submit documents once your project has been approved by your supervisor.
        </Alert>
      )}

      {/* Project Info */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: alpha('#ffffff', 0.03),
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Current Project
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {dashboard.project.title}
        </Typography>
        {dashboard.project.supervisor_first_name && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Supervisor: {dashboard.project.supervisor_first_name} {dashboard.project.supervisor_last_name}
          </Typography>
        )}
      </Paper>

      {/* Submission Cards */}
      <Grid container spacing={3}>
        {['alpha', 'beta', 'final'].map((type) => {
          const submission = uploadableSubmissions.find((s) => s.submission_type === type);
          const info = submissionInfo[type];
          const status = statusColors[submission?.status || 'pending'];
          const now = new Date();
          
          // Check if submission window is open
          const startDate = submission?.submission_start_date ? new Date(submission.submission_start_date) : null;
          const endDate = submission?.submission_end_date ? new Date(submission.submission_end_date) : submission?.deadline ? new Date(submission.deadline) : null;
          
          // Check if start and end dates are the same (block submissions)
          // Use a tolerance of 1 second to account for potential time differences
          const isWindowLocked = startDate && endDate && Math.abs(startDate.getTime() - endDate.getTime()) < 1000;
          const isBeforeStart = startDate && now < startDate;
          const isAfterEnd = endDate && now >= endDate;
          const isOverdue = endDate && now > endDate && submission?.status === 'pending';
          const isWindowOpen = !isWindowLocked && !isBeforeStart && !isAfterEnd;
          
          const canUpload = projectApproved && submission && (submission.status === 'pending' || submission.status === 'resubmission_required') && isWindowOpen;

          return (
            <Grid item xs={12} key={type}>
              <Card
                sx={{
                  background: alpha('#ffffff', 0.03),
                  border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: alpha(info.color, 0.5),
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: 2,
                          background: alpha(info.color, 0.15),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DocumentIcon sx={{ color: info.color, fontSize: 28 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {info.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Maximum Marks: {info.maxMarks}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={status.icon as any}
                      label={submission?.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                      sx={{
                        background: status.bg,
                        color: status.color,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {info.description}
                  </Typography>

                  <Divider sx={{ my: 2, opacity: 0.1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      {submission && (
                        <>
                          {startDate && (
                            <Typography variant="body2" color={isWindowLocked ? 'error.main' : isBeforeStart ? 'warning.main' : 'text.secondary'}>
                              Submission Window Opens: {startDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {isWindowLocked && ' (Window locked - same start/end date)'}
                              {isBeforeStart && !isWindowLocked && ' (Not yet open)'}
                            </Typography>
                          )}
                          {endDate && (
                            <Typography variant="body2" color={isWindowLocked ? 'error.main' : isOverdue ? 'error.main' : isAfterEnd ? 'error.main' : 'text.secondary'} sx={{ mt: startDate ? 0.5 : 0 }}>
                              Submission Window Closes: {endDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {isWindowLocked && ' (Window locked - same start/end date)'}
                              {isOverdue && !isWindowLocked && ' (Overdue)'}
                              {isAfterEnd && !isOverdue && !isWindowLocked && submission.status === 'pending' && ' (Window closed)'}
                            </Typography>
                          )}
                        </>
                      )}
                      {submission?.submitted_at && (
                        <Typography variant="body2" sx={{ color: '#10b981', mt: 0.5 }}>
                          Submitted: {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      )}
                      {submission?.marks !== null && submission?.marks !== undefined && (
                        <Typography variant="body2" sx={{ color: '#8b5cf6', mt: 0.5, fontWeight: 600 }}>
                          Marks: {submission.marks} / {submission.max_marks}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<UploadIcon />}
                      disabled={!canUpload}
                      onClick={() => handleOpenDialog(submission)}
                      sx={{
                        background: `linear-gradient(135deg, ${info.color} 0%, ${alpha(info.color, 0.7)} 100%)`,
                        '&:disabled': {
                          background: alpha('#ffffff', 0.1),
                        },
                      }}
                      title={
                        !projectApproved 
                          ? 'Project must be approved before submission' 
                          : !submission 
                          ? 'No submission available'
                          : submission.status !== 'pending' && submission.status !== 'resubmission_required'
                          ? 'Submission already completed'
                          : isWindowLocked
                          ? `Submission window is locked. The coordinator has set the same start and end date (${startDate?.toLocaleString()}), indicating submissions are currently not accepted.`
                          : isBeforeStart
                          ? `Submission window opens on ${startDate?.toLocaleString()}`
                          : isAfterEnd
                          ? 'Submission window has closed'
                          : 'Upload your document'
                      }
                    >
                      {submission?.status === 'submitted' || submission?.status === 'graded' 
                        ? 'Submitted' 
                        : isWindowLocked
                        ? 'Window Locked'
                        : isBeforeStart 
                        ? 'Not Yet Open'
                        : isAfterEnd
                        ? 'Window Closed'
                        : 'Upload Document'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Important Notes */}
      <Paper
        sx={{
          p: 3,
          mt: 4,
          background: alpha('#f59e0b', 0.05),
          border: `1px solid ${alpha('#f59e0b', 0.2)}`,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f59e0b', mb: 2 }}>
          Important Notes
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, m: 0 }}>
          <li>Only PDF files are accepted (maximum 10MB)</li>
          <li>Make sure your document is properly formatted before submission</li>
          <li>Once submitted, your document will be sent to your supervisor for review</li>
          <li>You cannot edit a submission after it has been graded</li>
          <li>If resubmission is required, you will receive a notification with feedback</li>
        </Typography>
      </Paper>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: '#1a1a2e',
            border: `1px solid ${alpha('#ffffff', 0.1)}`,
          },
        }}
      >
        <DialogTitle>
          Upload {selectedSubmission && submissionInfo[selectedSubmission.submission_type]?.title}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: `2px dashed ${alpha('#ffffff', 0.2)}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#3b82f6',
                background: alpha('#3b82f6', 0.05),
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept=".pdf"
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <Box>
                <FileIcon sx={{ fontSize: 48, color: '#3b82f6', mb: 2 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </Typography>
              </Box>
            ) : (
              <Box>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Click to select a PDF file
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Maximum file size: 10MB
                </Typography>
              </Box>
            )}
          </Box>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Uploading document...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleCloseDialog} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            }}
          >
            {uploading ? 'Uploading...' : 'Submit Document'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Submission;

