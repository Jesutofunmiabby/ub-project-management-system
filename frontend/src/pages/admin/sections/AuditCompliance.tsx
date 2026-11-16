import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  MenuItem,
  Chip,
  Grid,
} from '@mui/material';
import { Download as DownloadIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../../services/api';

const AuditCompliance: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['auditLogs', page, rowsPerPage, userFilter, actionFilter, startDate, endDate],
    queryFn: async () => {
      const response = await adminAPI.getAuditLogs({
        page: page + 1,
        limit: rowsPerPage,
        user_id: userFilter || undefined,
        action: actionFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      return response.data.data;
    },
  });

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportAuditLogs({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      // In a real app, you would download the file
      console.log('Export data:', response.data.data);
      alert('Audit logs exported successfully');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Audit & Compliance
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Export Logs
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="User ID"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="CREATE_USER">Create User</MenuItem>
                <MenuItem value="UPDATE_USER">Update User</MenuItem>
                <MenuItem value="DELETE_USER">Delete User</MenuItem>
                <MenuItem value="LOGIN">Login</MenuItem>
                <MenuItem value="UPDATE_SYSTEM_CONFIG">Update Config</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Audit Logs
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity Type</TableCell>
                  <TableCell>Entity ID</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : auditLogs?.logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs?.logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.first_name} {log.last_name}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {log.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" />
                      </TableCell>
                      <TableCell>{log.entity_type}</TableCell>
                      <TableCell>{log.entity_id}</TableCell>
                      <TableCell>{log.ip_address || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={auditLogs?.pagination?.total || 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[50, 100, 200]}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuditCompliance;

