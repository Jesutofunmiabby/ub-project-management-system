import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Archive as ArchiveIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../../../services/api';

const DataArchiving: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [academicYear, setAcademicYear] = useState('');
  const [archiveType, setArchiveType] = useState('projects');

  const { data: archivedData } = useQuery({
    queryKey: ['archivedData'],
    queryFn: async () => {
      const response = await adminAPI.getArchivedData();
      return response.data.data;
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (data: any) => adminAPI.archiveData(data),
    onSuccess: () => {
      enqueueSnackbar('Data archiving initiated successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to archive data', { variant: 'error' });
    },
  });

  const handleArchive = () => {
    if (!academicYear) {
      enqueueSnackbar('Please select an academic year', { variant: 'warning' });
      return;
    }
    archiveMutation.mutate({ academic_year: academicYear, archive_type: archiveType });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Data Archiving
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Archive old data to improve system performance. Archived data can be restored if needed.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Archive Data
              </Typography>
              <TextField
                fullWidth
                label="Academic Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2023/2024"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                select
                label="Archive Type"
                value={archiveType}
                onChange={(e) => setArchiveType(e.target.value)}
                sx={{ mb: 2 }}
              >
                <MenuItem value="projects">Projects</MenuItem>
                <MenuItem value="submissions">Submissions</MenuItem>
                <MenuItem value="grades">Grades</MenuItem>
                <MenuItem value="all">All Data</MenuItem>
              </TextField>
              <Button
                variant="contained"
                startIcon={<ArchiveIcon />}
                onClick={handleArchive}
                disabled={archiveMutation.isPending}
                fullWidth
              >
                Start Archiving
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Archived Data
              </Typography>
              {archivedData?.length === 0 ? (
                <Typography color="text.secondary">No archived data found</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Academic Year</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Archived At</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {archivedData?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.academic_year}</TableCell>
                          <TableCell>{item.archive_type}</TableCell>
                          <TableCell>
                            {new Date(item.archived_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button size="small" startIcon={<DownloadIcon />}>
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataArchiving;

