import React, { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { submissionsAPI, dashboardAPI } from '../../services/api';
import { StudentDashboard } from '../../types';

const submissionInfo: Record<string, { title: string; description: string; maxMarks: number }> = {
  alpha: {
    title: 'Alpha Submission',
    description: 'Submit your initial literature review and project plan (8-10 pages PDF). This includes your project introduction, problem statement, objectives, and initial literature survey.',
    maxMarks: 6,
  },
  beta: {
    title: 'Beta Submission',
    description: 'Submit your methodology section and initial implementation. Include your system design, architecture diagrams, and progress on implementation.',
    maxMarks: 4,
  },
  presentation: {
    title: 'Presentation Slides',
    description: 'Submit your presentation slides for the final project defense. Include an overview of your project, methodology, results, and conclusions.',
    maxMarks: 20,
  },
  final: {
    title: 'Final Documentation',
    description: 'Submit your comprehensive final report including all chapters, code documentation, and user manual. This should be the complete documentation of your project.',
    maxMarks: 60,
  },
  project_management: {
    title: 'Project Management Documentation',
    description: 'Submit your project management documents including Gantt charts, meeting logs, progress reports, and any other project tracking materials.',
    maxMarks: 10,
  },
};

const SubmitDocument: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get submission info or create a default for unknown types
  const info = type ? (submissionInfo[type] || {
    title: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')} Submission`,
    description: `Submit your ${type.replace(/_/g, ' ')} document in PDF format.`,
    maxMarks: 0,
  }) : null;

  const { data: dashboard } = useQuery<StudentDashboard>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response.data.data;
    },
  });

  const submission = dashboard?.submissions?.find((s) => s.submission_type === type);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!submission?.id) throw new Error('Submission not found');
      const response = await submissionsAPI.upload(submission.id, file);
      return response.data;
    },
    onSuccess: (data) => {
      enqueueSnackbar('Document uploaded successfully!', { variant: 'success' });
      navigate('/student/dashboard');
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Upload failed', { variant: 'error' });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  if (!info || !type) {
    return (
      <Box>
        <Alert severity="error">Invalid submission type</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {info.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {info.description}
      </Typography>

      {/* Submission Info */}
      {submission && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Maximum Marks
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {info.maxMarks} marks
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Submission Count
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {submission.submission_count} / 3
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color:
                      submission.status === 'graded'
                        ? 'success.main'
                        : submission.status === 'resubmission_required'
                        ? 'warning.main'
                        : 'primary.main',
                    textTransform: 'capitalize',
                  }}
                >
                  {submission.status.replace(/_/g, ' ')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box
            {...getRootProps()}
            sx={{
              p: 6,
              borderRadius: 3,
              border: `2px dashed ${
                isDragActive
                  ? alpha('#3b82f6', 0.5)
                  : selectedFile
                  ? alpha('#22c55e', 0.5)
                  : alpha('#ffffff', 0.2)
              }`,
              background: isDragActive
                ? alpha('#3b82f6', 0.1)
                : selectedFile
                ? alpha('#22c55e', 0.05)
                : alpha('#ffffff', 0.03),
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: alpha('#3b82f6', 0.5),
                background: alpha('#3b82f6', 0.05),
              },
            }}
          >
            <input {...getInputProps()} />

            {selectedFile ? (
              <Box>
                <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  File Selected
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    background: alpha('#ffffff', 0.05),
                  }}
                >
                  <FileIcon sx={{ color: 'error.main' }} />
                  <Typography>{selectedFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box>
                <UploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your PDF here'}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maximum file size: 10MB | Format: PDF only
                </Typography>
              </Box>
            )}
          </Box>

          {uploadMutation.isPending && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Uploading document...
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate('/student/dashboard')}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              startIcon={uploadMutation.isPending ? <CircularProgress size={20} /> : <UploadIcon />}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Submit Document'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SubmitDocument;

