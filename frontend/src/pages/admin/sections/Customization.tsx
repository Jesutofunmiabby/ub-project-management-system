import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../../../services/api';

const Customization: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['customizationSettings'],
    queryFn: async () => {
      const response = await adminAPI.getCustomizationSettings();
      return response.data.data;
    },
  });

  const [formData, setFormData] = useState({
    theme: 'default',
    logo_url: '',
    primary_color: '#1976d2',
    secondary_color: '#dc004e',
    institution_name: 'University',
    custom_css: '',
  });

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateCustomizationSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customizationSettings'] });
      enqueueSnackbar('Customization settings updated successfully', { variant: 'success' });
    },
  });

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          System Customization
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => updateMutation.mutate(formData)}
          disabled={updateMutation.isPending}
        >
          Save Settings
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Customize the appearance and branding of the system.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Branding
              </Typography>
              <TextField
                fullWidth
                label="Institution Name"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Logo URL"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Colors
              </Typography>
              <TextField
                fullWidth
                label="Primary Color"
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Secondary Color"
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Custom CSS
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                value={formData.custom_css}
                onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                placeholder="Enter custom CSS here..."
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Customization;

