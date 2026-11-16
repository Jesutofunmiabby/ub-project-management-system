import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  LinearProgress,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Email as EmailIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../services/api';
import { LecturerDashboard } from '../../types';

const statusColors: Record<string, string> = {
  approved: '#22c55e',
  approved_with_modifications: '#fbbf24',
  in_progress: '#8b5cf6',
  completed: '#3b82f6',
  under_review: '#f59e0b',
};

const Supervisees: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery<LecturerDashboard>({
    queryKey: ['lecturerDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getLecturerDashboard();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          My Supervisees
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={250} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const supervisees = dashboard?.supervisees || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            My Supervisees
          </Typography>
          <Typography color="text.secondary">
            {supervisees.length} student{supervisees.length !== 1 ? 's' : ''} under your supervision
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary">
            Capacity
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {dashboard?.currentLoad || 0} / {dashboard?.maxCapacity || 10}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={((dashboard?.currentLoad || 0) / (dashboard?.maxCapacity || 10)) * 100}
            sx={{ width: 100, mt: 1 }}
          />
        </Box>
      </Box>

      {supervisees.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              No Supervisees Yet
            </Typography>
            <Typography color="text.secondary">
              You haven't been assigned any students to supervise yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {supervisees.map((student) => (
            <Grid item xs={12} sm={6} md={4} key={student.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                      }}
                    >
                      {student.first_name[0]}{student.last_name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {student.first_name} {student.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {student.student_id}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: alpha('#ffffff', 0.03),
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AssignmentIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Project
                      </Typography>
                    </Box>
                    <Typography variant="body2" noWrap>
                      {student.project_title}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={student.project_status.replace(/_/g, ' ')}
                      size="small"
                      sx={{
                        background: alpha(statusColors[student.project_status] || '#94a3b8', 0.15),
                        color: statusColors[student.project_status] || '#94a3b8',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                    <Button
                      size="small"
                      startIcon={<EmailIcon />}
                      onClick={() => navigate('/messages')}
                    >
                      Message
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Supervisees;

