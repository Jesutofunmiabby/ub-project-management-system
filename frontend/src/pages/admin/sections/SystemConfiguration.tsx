import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../../../services/api';

const SystemConfiguration: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: async () => {
      const response = await adminAPI.getSystemConfig();
      return response.data.data;
    },
  });

  const [formData, setFormData] = useState({
    max_file_size: '',
    max_resubmissions: '',
    session_timeout: '',
    password_min_length: '',
    require_email_verification: false,
    enable_two_factor: false,
    maintenance_mode: false,
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        max_file_size: config.max_file_size || '',
        max_resubmissions: config.max_resubmissions || '',
        session_timeout: config.session_timeout || '',
        password_min_length: config.password_min_length || '',
        require_email_verification: config.require_email_verification || false,
        enable_two_factor: config.enable_two_factor || false,
        maintenance_mode: config.maintenance_mode || false,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateSystemConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      enqueueSnackbar('System configuration updated successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update configuration', { variant: 'error' });
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          System Configuration
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
        >
          Save Configuration
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure system-wide settings and parameters. Changes will affect all users.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                File & Upload Settings
              </Typography>
              <TextField
                fullWidth
                label="Max File Size (bytes)"
                value={formData.max_file_size}
                onChange={(e) => setFormData({ ...formData, max_file_size: e.target.value })}
                type="number"
                sx={{ mb: 2 }}
                helperText="Maximum file size allowed for uploads"
              />
              <TextField
                fullWidth
                label="Max Resubmissions"
                value={formData.max_resubmissions}
                onChange={(e) => setFormData({ ...formData, max_resubmissions: e.target.value })}
                type="number"
                helperText="Maximum number of resubmissions allowed"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Security Settings
              </Typography>
              <TextField
                fullWidth
                label="Session Timeout (seconds)"
                value={formData.session_timeout}
                onChange={(e) => setFormData({ ...formData, session_timeout: e.target.value })}
                type="number"
                sx={{ mb: 2 }}
                helperText="Session timeout in seconds"
              />
              <TextField
                fullWidth
                label="Minimum Password Length"
                value={formData.password_min_length}
                onChange={(e) => setFormData({ ...formData, password_min_length: e.target.value })}
                type="number"
                helperText="Minimum required password length"
              />
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.require_email_verification}
                      onChange={(e) =>
                        setFormData({ ...formData, require_email_verification: e.target.checked })
                      }
                    />
                  }
                  label="Require Email Verification"
                />
              </Box>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.enable_two_factor}
                      onChange={(e) => setFormData({ ...formData, enable_two_factor: e.target.checked })}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                System Status
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.maintenance_mode}
                    onChange={(e) => setFormData({ ...formData, maintenance_mode: e.target.checked })}
                    color="warning"
                  />
                }
                label="Maintenance Mode"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                When enabled, only administrators can access the system
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemConfiguration;

