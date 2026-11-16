import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../services/api';

const SupportTools: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const response = await adminAPI.getSystemHealth();
      return response.data.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Support Tools & System Health
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                System Health Status
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {health?.database === 'healthy' ? (
                      <HealthyIcon sx={{ mr: 1, color: 'success.main' }} />
                    ) : (
                      <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                    )}
                    <Typography variant="body1">Database</Typography>
                  </Box>
                  <Chip
                    label={health?.database === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    color={health?.database === 'healthy' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={health?.database === 'healthy' ? 100 : 0}
                  color={health?.database === 'healthy' ? 'success' : 'error'}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {health?.server === 'healthy' ? (
                      <HealthyIcon sx={{ mr: 1, color: 'success.main' }} />
                    ) : (
                      <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                    )}
                    <Typography variant="body1">Server</Typography>
                  </Box>
                  <Chip
                    label={health?.server === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    color={health?.server === 'healthy' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={health?.server === 'healthy' ? 100 : 0}
                  color={health?.server === 'healthy' ? 'success' : 'error'}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System diagnostics and support tools will be available here.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SupportTools;

