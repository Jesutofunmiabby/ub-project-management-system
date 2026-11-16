import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  alpha,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CompareArrows as CompareArrowsIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { coordinatorAPI } from '../../services/api';
import { CoordinatorDashboard as CoordinatorDashboardType } from '../../types';

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#8b5cf6'];

const CoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery<CoordinatorDashboardType>({
    queryKey: ['coordinatorDashboard'],
    queryFn: async () => {
      const response = await coordinatorAPI.getDashboard();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const pieData = [
    { name: 'Submitted', value: dashboard?.submissionStats.submitted || 0 },
    { name: 'Approved', value: dashboard?.submissionStats.approved || 0 },
    { name: 'Rejected', value: dashboard?.submissionStats.rejected || 0 },
    { name: 'In Progress', value: dashboard?.submissionStats.inProgress || 0 },
  ].filter(d => d.value > 0);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Coordinator Dashboard
        </Typography>
        <Typography color="text.secondary">
          Academic Year: {dashboard?.academicYear?.year || 'Not configured'}
        </Typography>
      </Box>

      {/* Similarity Alert */}
      {dashboard?.similarProposalsCount && dashboard.similarProposalsCount > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          icon={<CompareArrowsIcon />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/coordinator/proposals')}
            >
              View Assessment
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Similarity Alert: {dashboard.similarProposalsCount} project(s) have similar proposals
          </Typography>
          <Typography variant="body2">
            Some student proposals show significant similarity. Review them in the Assessment section to identify potential duplicates and apply first-come, first-serve policy.
          </Typography>
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/coordinator/users')}>
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
                  <PeopleIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Students
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.totalStudents || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

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
                  <AssignmentIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Projects
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.totalProjects || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/coordinator/proposals')}>
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
                  <ScheduleIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pending Approvals
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.pendingApprovals || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Project Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Project Status Distribution
              </Typography>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                {pieData.map((entry, index) => (
                  <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                    <Typography variant="caption">
                      {entry.name}: {entry.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Supervisor Workload */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Supervisor Workload
              </Typography>
              {dashboard?.supervisorWorkload && dashboard.supervisorWorkload.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dashboard.supervisorWorkload.slice(0, 6).map((supervisor) => (
                    <Box
                      key={supervisor.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Typography sx={{ minWidth: 150, fontWeight: 500 }}>
                        {supervisor.first_name} {supervisor.last_name}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(supervisor.current_load / supervisor.capacity) * 100}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: alpha('#3b82f6', 0.2),
                            '& .MuiLinearProgress-bar': {
                              background:
                                supervisor.current_load >= supervisor.capacity
                                  ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
                                  : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                            },
                          }}
                        />
                      </Box>
                      <Typography sx={{ minWidth: 50, textAlign: 'right' }}>
                        {supervisor.current_load}/{supervisor.capacity}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No supervisor data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Department Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Projects by Department
              </Typography>
              {dashboard?.departmentMetrics && dashboard.departmentMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.departmentMetrics}>
                    <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="projects" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No department data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate('/coordinator/proposals')}
                    sx={{ py: 3, flexDirection: 'column' }}
                  >
                    <AssignmentIcon sx={{ mb: 1 }} />
                    View Proposals
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/coordinator/academic-year')}
                    sx={{ py: 3, flexDirection: 'column' }}
                  >
                    <ScheduleIcon sx={{ mb: 1 }} />
                    Configure Academic Year
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/coordinator/users')}
                    sx={{ py: 3, flexDirection: 'column' }}
                  >
                    <PeopleIcon sx={{ mb: 1 }} />
                    Manage Users
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/coordinator/reports')}
                    sx={{ py: 3, flexDirection: 'column' }}
                  >
                    <TrendingUpIcon sx={{ mb: 1 }} />
                    View Reports
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CoordinatorDashboard;

