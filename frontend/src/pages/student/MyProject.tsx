import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  alpha,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { dashboardAPI } from '../../services/api';
import { StudentDashboard } from '../../types';

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'Draft' },
  submitted: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Submitted' },
  under_review: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'Under Review' },
  approved: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Approved' },
  approved_with_modifications: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'Approved (Modifications Required)' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Rejected' },
  in_progress: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', label: 'In Progress' },
  completed: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Completed' },
};

const MyProject: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery<StudentDashboard>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  const project = dashboard?.project;

  if (!project) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          My Project
        </Typography>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              No Project Found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              You haven't submitted a project proposal yet.
            </Typography>
            {dashboard?.canSubmitTopic && (
              <Button
                variant="contained"
                onClick={() => navigate('/student/submit-project')}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                }}
              >
                Submit Project Proposal
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  const status = statusColors[project.status] || statusColors.draft;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          My Project
        </Typography>
        <Chip
          label={status.label}
          sx={{
            background: status.bg,
            color: status.color,
            fontWeight: 600,
            fontSize: '0.9rem',
            px: 2,
            py: 2.5,
          }}
        />
      </Box>

      {/* Modification Notes Alert */}
      {project.status === 'approved_with_modifications' && project.modification_notes && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Modifications Required
          </Typography>
          <Typography variant="body2">{project.modification_notes}</Typography>
        </Alert>
      )}

      {/* Rejection Reason Alert */}
      {project.status === 'rejected' && project.rejection_reason && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Rejection Reason
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>{project.rejection_reason}</Typography>
          {dashboard?.canSubmitTopic && (
            <Button
              variant="contained"
              onClick={() => navigate('/student/submit-project')}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                mt: 1
              }}
            >
              Resubmit Proposal
            </Button>
          )}
          {!dashboard?.canSubmitTopic && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Topic submission period has closed. You cannot resubmit at this time.
            </Typography>
          )}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Project Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                {project.title}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography>{project.description}</Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Problem Statement
                </Typography>
                <Typography>{project.problem_statement}</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Objectives
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-line' }}>{project.objectives}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Methodology
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-line' }}>{project.methodology}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Supervisor Info */}
          {project.supervisor_id && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Supervisor
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha('#ffffff', 0.05),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ color: 'primary.main' }} />
                    <Typography sx={{ fontWeight: 500 }}>
                      {project.supervisor_first_name} {project.supervisor_last_name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      {project.supervisor_email}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/messages')}
                  >
                    Send Message
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Project Info */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Project Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Academic Year
                  </Typography>
                  <Typography>{project.academic_year}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submitted On
                  </Typography>
                  <Typography>
                    {format(new Date(project.created_at), 'MMMM d, yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography>
                    {format(new Date(project.updated_at), 'MMMM d, yyyy')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MyProject;

