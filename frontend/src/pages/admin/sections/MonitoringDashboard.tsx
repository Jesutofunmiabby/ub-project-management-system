import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Login as LoginIcon,
  Storage as StorageIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const MonitoringDashboard: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['systemMetrics'],
    queryFn: async () => {
      const response = await adminAPI.getSystemMetrics();
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mock data for charts (in real app, this would come from API)
  const activityData = [
    { time: '00:00', users: 5, logins: 2 },
    { time: '04:00', users: 3, logins: 1 },
    { time: '08:00', users: 45, logins: 30 },
    { time: '12:00', users: 120, logins: 85 },
    { time: '16:00', users: 95, logins: 60 },
    { time: '20:00', users: 35, logins: 25 },
  ];

  const storageData = [
    { type: 'Documents', size: 4500 },
    { type: 'Images', size: 1200 },
    { type: 'Backups', size: 8000 },
    { type: 'Other', size: 500 },
  ];

  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        System Monitoring
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Active Users (24h)
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics?.activeUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LoginIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Recent Logins (24h)
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics?.recentLogins || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StorageIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Storage Usage
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {((metrics?.storageUsage || 0) / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Errors (24h)
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {metrics?.errorCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                User Activity (24 Hours)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#1976d2" strokeWidth={2} />
                  <Line type="monotone" dataKey="logins" stroke="#2e7d32" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Storage Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="size" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            System Health
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Database</Typography>
              <Typography variant="body2" color="success.main">
                {metrics?.database === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metrics?.database === 'healthy' ? 100 : 0}
              color={metrics?.database === 'healthy' ? 'success' : 'error'}
            />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Server</Typography>
              <Typography variant="body2" color="success.main">
                {metrics?.server === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metrics?.server === 'healthy' ? 100 : 0}
              color={metrics?.server === 'healthy' ? 'success' : 'error'}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonitoringDashboard;

