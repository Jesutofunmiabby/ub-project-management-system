import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../../../services/api';

const DisasterRecovery: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [restoreBackupId, setRestoreBackupId] = useState('');

  const { data: backups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const response = await adminAPI.getBackups();
      return response.data.data;
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: () => adminAPI.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      enqueueSnackbar('Backup creation initiated', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to create backup', { variant: 'error' });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) => adminAPI.restoreBackup(backupId),
    onSuccess: () => {
      enqueueSnackbar('Backup restore initiated', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to restore backup', { variant: 'error' });
    },
  });

  const handleRestore = (backupId: string) => {
    if (window.confirm('Are you sure you want to restore this backup? This action cannot be undone.')) {
      restoreBackupMutation.mutate(backupId);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Disaster Recovery
        </Typography>
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          onClick={() => createBackupMutation.mutate()}
          disabled={createBackupMutation.isPending}
        >
          Create Backup
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        Regular backups are essential for disaster recovery. Ensure backups are created regularly and stored securely.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Backup History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Backup ID</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No backups found
                    </TableCell>
                  </TableRow>
                ) : (
                  backups?.map((backup: any) => (
                    <TableRow key={backup.id}>
                      <TableCell>{backup.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        {new Date(backup.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label="Available" color="success" size="small" />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleRestore(backup.id)}
                          sx={{ mr: 1 }}
                        >
                          Restore
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                        >
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DisasterRecovery;

