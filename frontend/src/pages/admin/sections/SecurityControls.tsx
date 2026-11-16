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
  Chip,
  Button,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { CheckCircle as UnblockIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../../../services/api';

const SecurityControls: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [actionFilter, setActionFilter] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['securityLogs', page, rowsPerPage, actionFilter],
    queryFn: async () => {
      const response = await adminAPI.getSecurityLogs({
        page: page + 1,
        limit: rowsPerPage,
        action_type: actionFilter || undefined,
      });
      return response.data.data;
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => adminAPI.unblockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['securityLogs'] });
      enqueueSnackbar('User unblocked successfully', { variant: 'success' });
    },
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Security Controls & Logs
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Failed Login Attempts
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {logs?.logs?.filter((log: any) => log.action === 'LOGIN_FAILED').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Blocked Users
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {logs?.logs?.filter((log: any) => log.action === 'BLOCK_USER').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Security Events (24h)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {logs?.pagination?.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              select
              label="Filter by Action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Actions</MenuItem>
              <MenuItem value="LOGIN">Login</MenuItem>
              <MenuItem value="LOGIN_FAILED">Failed Login</MenuItem>
              <MenuItem value="BLOCK_USER">Block User</MenuItem>
              <MenuItem value="UNBLOCK_USER">Unblock User</MenuItem>
              <MenuItem value="PASSWORD_RESET">Password Reset</MenuItem>
            </TextField>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity Type</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : logs?.logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No security logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.logs?.map((log: any) => (
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
                      <TableCell>{log.ip_address || '-'}</TableCell>
                      <TableCell>
                        {log.action === 'BLOCK_USER' && (
                          <Button
                            size="small"
                            startIcon={<UnblockIcon />}
                            onClick={() => unblockMutation.mutate(log.entity_id)}
                          >
                            Unblock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={logs?.pagination?.total || 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[20, 50, 100]}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default SecurityControls;

