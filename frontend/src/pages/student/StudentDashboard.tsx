import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  alpha,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Upload as UploadIcon,
  Event as EventIcon,
  Grade as GradeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { dashboardAPI } from '../../services/api';
import { StudentDashboard as StudentDashboardType } from '../../types';

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
  submitted: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  approved: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  in_progress: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
  graded: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  resubmission_required: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
};

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [modificationDialogOpen, setModificationDialogOpen] = useState(false);
  const [hasSeenModificationNotes, setHasSeenModificationNotes] = useState(false);

  const { data: dashboard, isLoading } = useQuery<StudentDashboardType>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response.data.data;
    },
  });

  // Show modification notes dialog when project is approved with modifications
  useEffect(() => {
    const project = dashboard?.project;
    if (
      project &&
      project.status === 'approved_with_modifications' &&
      project.modification_notes &&
      !hasSeenModificationNotes
    ) {
      // Check if we've already shown this dialog for this project
      const dialogKey = `modification_notes_${project.id}_${project.updated_at}`;
      const seenBefore = localStorage.getItem(dialogKey);
      
      if (!seenBefore) {
        setModificationDialogOpen(true);
        // Mark as seen for this specific version (using updated_at to detect changes)
        localStorage.setItem(dialogKey, 'true');
      }
      setHasSeenModificationNotes(true);
    }
  }, [dashboard, hasSeenModificationNotes]);

  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={150} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rounded" height={400} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  const hasProject = !!dashboard?.project;
  const canSubmitTopic = dashboard?.canSubmitTopic;

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back! 👋
        </Typography>
        <Typography color="text.secondary">
          {hasProject
            ? `Your project: ${dashboard?.project?.title}`
            : canSubmitTopic
            ? 'Ready to submit your project proposal?'
            : 'Topic submission is currently closed'}
        </Typography>
      </Box>

      {/* Quick Actions */}
      {((!hasProject && canSubmitTopic) || (hasProject && dashboard?.project?.status === 'rejected' && canSubmitTopic)) && (
        <Card
          sx={{
            mb: 4,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {hasProject && dashboard?.project?.status === 'rejected' 
                  ? 'Resubmit Your Project Proposal' 
                  : 'Submit Your Project Proposal'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hasProject && dashboard?.project?.status === 'rejected'
                  ? 'Your previous proposal was rejected. You can resubmit until '
                  : 'Topic submission is open until '}
                {dashboard?.academicYear?.topic_submission_end
                  ? format(new Date(dashboard.academicYear.topic_submission_end), 'MMMM d, yyyy')
                  : 'N/A'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => navigate('/student/submit-project')}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
            >
              Submit Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Project Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <AssignmentIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Project Status
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {dashboard?.project?.status?.replace(/_/g, ' ') || 'No Project'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Submissions */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <UploadIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submissions
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {dashboard?.submissions?.filter((s) => s.status !== 'pending').length || 0} / 5
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Next Deadline */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <EventIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Next Deadline
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {dashboard?.deadlines?.[0]?.date
                      ? formatDistanceToNow(new Date(dashboard.deadlines[0].date), { addSuffix: true })
                      : 'None'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Grades */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <GradeIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current Grade
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {dashboard?.gradesSummary
                      ? `${dashboard.gradesSummary.obtained}/${dashboard.gradesSummary.total}`
                      : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Submissions Timeline */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Submission Progress
              </Typography>

              {!hasProject ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    Submit a project proposal to see your submission progress
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dashboard?.submissions?.map((submission, index) => {
                    const statusStyle = statusColors[submission.status] || statusColors.pending;
                    const isOverdue =
                      new Date(submission.deadline) < new Date() && submission.status === 'pending';
                    const canUpload = 
                      (submission.status === 'pending' || submission.status === 'resubmission_required') &&
                      ['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(dashboard?.project?.status || '');
                    const isClickable = canUpload;

                    return (
                      <Box
                        key={submission.id}
                        onClick={() => {
                          if (isClickable) {
                            navigate(`/student/submit-document/${submission.submission_type}`);
                          }
                        }}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: alpha('#ffffff', 0.03),
                          border: `1px solid ${alpha('#ffffff', 0.08)}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          cursor: isClickable ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          '&:hover': isClickable ? {
                            background: alpha('#3b82f6', 0.1),
                            borderColor: alpha('#3b82f6', 0.3),
                            transform: 'translateX(4px)',
                          } : {},
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background:
                              submission.status === 'graded'
                                ? 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)'
                                : submission.status === 'submitted'
                                ? 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'
                                : submission.status === 'resubmission_required'
                                ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                                : alpha('#ffffff', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {submission.status === 'graded' ? (
                            <CheckCircleIcon sx={{ color: 'white' }} />
                          ) : submission.status === 'submitted' ? (
                            <ScheduleIcon sx={{ color: 'white' }} />
                          ) : submission.status === 'resubmission_required' ? (
                            <WarningIcon sx={{ color: 'white' }} />
                          ) : (
                            <Typography sx={{ color: 'text.secondary' }}>{index + 1}</Typography>
                          )}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {submission.submission_type.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Deadline: {format(new Date(submission.deadline), 'MMM d, yyyy')}
                            {isOverdue && (
                              <Chip
                                label="Overdue"
                                size="small"
                                sx={{
                                  ml: 1,
                                  height: 20,
                                  background: statusColors.rejected.bg,
                                  color: statusColors.rejected.color,
                                }}
                              />
                            )}
                          </Typography>
                        </Box>

                        <Chip
                          label={submission.status.replace(/_/g, ' ')}
                          size="small"
                          sx={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />

                        {submission.marks !== null && submission.marks !== undefined && (
                          <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {submission.marks}/{submission.max_marks}
                          </Typography>
                        )}

                        {canUpload && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/submit-document/${submission.submission_type}`);
                            }}
                            sx={{
                              background: submission.status === 'resubmission_required'
                                ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                              minWidth: 80,
                            }}
                          >
                            {submission.status === 'resubmission_required' ? 'Resubmit' : 'Upload'}
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Deadlines & Info */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Upcoming Deadlines
              </Typography>

              {dashboard?.deadlines && dashboard.deadlines.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dashboard.deadlines.slice(0, 3).map((deadline, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 2,
                        background: alpha('#ffffff', 0.03),
                      }}
                    >
                      <EventIcon sx={{ color: 'warning.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {deadline.type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(deadline.date), 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No upcoming deadlines
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Presentation Schedule */}
          {dashboard?.presentationSchedule && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Presentation Schedule
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    {format(new Date(dashboard.presentationSchedule.scheduled_date), 'MMMM d, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time: {dashboard.presentationSchedule.start_time} -{' '}
                    {dashboard.presentationSchedule.end_time}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Room: {dashboard.presentationSchedule.lab_room}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Grade Summary */}
          {dashboard?.gradesSummary && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Grade Summary
                </Typography>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {dashboard.gradesSummary.percentage}%
                  </Typography>
                  <Typography color="text.secondary">
                    {dashboard.gradesSummary.obtained} / {dashboard.gradesSummary.total} marks
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={dashboard.gradesSummary.percentage}
                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Modification Notes Dialog */}
      <Dialog
        open={modificationDialogOpen}
        onClose={() => setModificationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: '#fbbf24' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Project Approved with Modifications Required
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            Your project has been approved! However, your supervisor has requested some modifications. 
            Please review the notes below. You can still proceed with submitting your documents.
          </Alert>
          
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Modification Notes from Supervisor:
            </Typography>
            <Card sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {dashboard?.project?.modification_notes || 'No specific notes provided.'}
              </Typography>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModificationDialogOpen(false)} variant="contained">
            I Understand, Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentDashboard;

