import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  Button,
} from '@mui/material';
import {
  Email as EmailIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../services/api';

const Integrations: React.FC = () => {
  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await adminAPI.getIntegrations();
      return response.data.data;
    },
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        System Integrations
      </Typography>

      <Grid container spacing={3}>
        {integrations?.integrations?.map((integration: any) => (
          <Grid item xs={12} md={4} key={integration.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {integration.id === 'email' && <EmailIcon sx={{ mr: 1, fontSize: 40 }} />}
                  {integration.id === 'backup' && <BackupIcon sx={{ mr: 1, fontSize: 40 }} />}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {integration.name}
                    </Typography>
                    <Chip
                      label={integration.type}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>
                <FormControlLabel
                  control={<Switch checked={integration.enabled} disabled />}
                  label={integration.enabled ? 'Enabled' : 'Disabled'}
                />
                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" size="small" fullWidth>
                    Configure
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Integrations;

