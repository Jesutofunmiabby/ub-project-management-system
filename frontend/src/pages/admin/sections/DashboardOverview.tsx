import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../services/api';
import { alpha } from '@mui/material/styles';

const DashboardOverview: React.FC = () => {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await adminAPI.getDashboard();
      return response.data.data;
    },
  });

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

  const stats = [
    {
      title: 'Total Users',
      value: dashboard?.totalUsers || 0,
      icon: <PeopleIcon />,
      color: 'primary',
    },
    {
      title: 'Total Projects',
      value: dashboard?.totalProjects || 0,
      icon: <AssignmentIcon />,
      color: 'success',
    },
    {
      title: 'Active Sessions',
      value: dashboard?.activeSessions || 0,
      icon: <SecurityIcon />,
      color: 'info',
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        System Overview
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette[stat.color as 'primary'].main, 0.1)} 0%, ${alpha(theme.palette[stat.color as 'primary'].main, 0.05)} 100%)`,
                border: (theme) => `1px solid ${alpha(theme.palette[stat.color as 'primary'].main, 0.2)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      color: `${stat.color}.main`,
                      mr: 1,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the tabs above to access different administrative functions:
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 3 }}>
            <li>Manage users and roles</li>
            <li>Configure system settings</li>
            <li>Monitor security and audit logs</li>
            <li>Archive old data</li>
            <li>Send broadcast notifications</li>
            <li>Manage backups and disaster recovery</li>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardOverview;

