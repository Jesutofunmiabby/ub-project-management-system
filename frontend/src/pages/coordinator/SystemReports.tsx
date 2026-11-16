import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  alpha,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { gradesAPI, coordinatorAPI } from '../../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const SystemReports: React.FC = () => {
  const { data: gradeStats } = useQuery({
    queryKey: ['gradeStatistics'],
    queryFn: async () => {
      const response = await gradesAPI.getStatistics({});
      return response.data.data;
    },
  });

  const { data: dashboard } = useQuery({
    queryKey: ['coordinatorDashboard'],
    queryFn: async () => {
      const response = await coordinatorAPI.getDashboard();
      return response.data.data;
    },
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        System Reports
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Analytics and insights for project management
      </Typography>

      <Grid container spacing={3}>
        {/* Grade Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Grade Distribution
              </Typography>
              {gradeStats?.distribution && gradeStats.distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeStats.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      dataKey="count"
                      nameKey="grade_band"
                    >
                      {gradeStats.distribution.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No grade data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Supervisor Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Supervisor Performance
              </Typography>
              {gradeStats?.supervisorPerformance && gradeStats.supervisorPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={gradeStats.supervisorPerformance.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis
                      type="category"
                      dataKey={(d) => `${d.first_name} ${d.last_name}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="average_student_marks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No supervisor data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Projects by Department */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Projects by Department
              </Typography>
              {dashboard?.departmentMetrics && dashboard.departmentMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboard.departmentMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#8b5cf6" name="Students" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="projects" fill="#22c55e" name="Projects" radius={[4, 4, 0, 0]} />
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

        {/* Submission Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Submission Statistics
              </Typography>
              {gradeStats?.bySubmissionType && gradeStats.bySubmissionType.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gradeStats.bySubmissionType.map((stat: any) => (
                    <Box
                      key={stat.submission_type}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: alpha('#ffffff', 0.03),
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                          {stat.submission_type}
                        </Typography>
                        <Typography color="text.secondary">
                          {stat.graded_projects} / {stat.total_projects} graded
                        </Typography>
                      </Box>
                      {stat.average_marks && (
                        <Typography variant="body2" color="primary.main" sx={{ mt: 1 }}>
                          Average: {Number(stat.average_marks).toFixed(1)} marks
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No submission data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Stats */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                System Summary
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                      {dashboard?.totalStudents || 0}
                    </Typography>
                    <Typography color="text.secondary">Total Students</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.2) 100%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#22c55e' }}>
                      {dashboard?.totalProjects || 0}
                    </Typography>
                    <Typography color="text.secondary">Total Projects</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.2) 100%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                      {dashboard?.submissionStats?.approved || 0}
                    </Typography>
                    <Typography color="text.secondary">Approved Projects</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                      {dashboard?.submissionStats?.inProgress || 0}
                    </Typography>
                    <Typography color="text.secondary">In Progress</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemReports;

