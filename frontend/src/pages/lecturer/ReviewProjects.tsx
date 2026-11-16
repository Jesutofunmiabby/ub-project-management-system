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
  MenuItem,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as ModifyIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { dashboardAPI, projectsAPI } from '../../services/api';
import { LecturerDashboard, Project } from '../../types';

const rejectionReasons = [
  'Scope too broad',
  'Scope too narrow',
  'Insufficient resources',
  'Topic already covered',
  'Methodology unclear',
  'Objectives not measurable',
  'Maximum student limit reached',
  'Other',
];

const ReviewProjects: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'modify' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modificationNotes, setModificationNotes] = useState('');

  const { data: dashboard, isLoading } = useQuery<LecturerDashboard>({
    queryKey: ['lecturerDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getLecturerDashboard();
      return response.data.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ projectId, action, reason, notes }: { 
      projectId: string; 
      action: string; 
      reason?: string; 
      notes?: string 
    }) => projectsAPI.review(projectId, action, reason, notes),
    onSuccess: () => {
      enqueueSnackbar('Project reviewed successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lecturerDashboard'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Review failed', { variant: 'error' });
    },
  });

  const handleCloseDialog = () => {
    setActionDialog(null);
    setSelectedProject(null);
    setRejectReason('');
    setModificationNotes('');
  };

  const handleAction = () => {
    if (!selectedProject || !actionDialog) return;

    reviewMutation.mutate({
      projectId: selectedProject.id,
      action: actionDialog === 'modify' ? 'approve_with_modifications' : actionDialog,
      reason: actionDialog === 'reject' ? rejectReason : undefined,
      notes: actionDialog === 'modify' ? modificationNotes : undefined,
    });
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          Review Projects
        </Typography>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={200} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  const projects = dashboard?.projectsForReview || [];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Review Projects
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {projects.length} project{projects.length !== 1 ? 's' : ''} awaiting your review
      </Typography>

      {projects.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              No Projects to Review
            </Typography>
            <Typography color="text.secondary">
              You have reviewed all pending projects. Check back later.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => (
          <Card key={project.id} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {project.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    By: {project.student_first_name} {project.student_last_name} ({project.student_matric})
                  </Typography>
                </Box>
                <Chip label="Pending Review" color="warning" />
              </Box>

              <Box sx={{ p: 2, borderRadius: 2, background: alpha('#ffffff', 0.03), mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Problem Statement
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {project.problem_statement}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Objectives
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                  {project.objectives}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Methodology
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {project.methodology}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => {
                    setSelectedProject(project);
                    setActionDialog('approve');
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ModifyIcon />}
                  onClick={() => {
                    setSelectedProject(project);
                    setActionDialog('modify');
                  }}
                >
                  Approve with Modifications
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => {
                    setSelectedProject(project);
                    setActionDialog('reject');
                  }}
                >
                  Reject
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* Approve Dialog */}
      <Dialog open={actionDialog === 'approve'} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Approval</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this project? You will be assigned as the supervisor.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Project: {selectedProject?.title}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleAction}
            disabled={reviewMutation.isPending}
          >
            Approve & Supervise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modify Dialog */}
      <Dialog open={actionDialog === 'modify'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Approve with Modifications</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Specify the modifications required before final approval.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Modification Notes"
            placeholder="Describe what changes the student needs to make..."
            value={modificationNotes}
            onChange={(e) => setModificationNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handleAction}
            disabled={!modificationNotes || reviewMutation.isPending}
          >
            Send for Modifications
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === 'reject'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Project</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Please select a reason for rejection.
          </Typography>
          <TextField
            fullWidth
            select
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          >
            {rejectionReasons.map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleAction}
            disabled={!rejectReason || reviewMutation.isPending}
          >
            Reject Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewProjects;

