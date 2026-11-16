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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Send as SendIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../../../services/api';

const NotificationManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    type: 'info',
    target_roles: [] as string[],
  });

  const { data: notifications } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const response = await adminAPI.getNotifications({ limit: 50 });
      return response.data.data;
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: any) => adminAPI.sendBroadcastNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      setBroadcastDialogOpen(false);
      setBroadcastData({
        title: '',
        message: '',
        type: 'info',
        target_roles: [],
      });
      enqueueSnackbar('Broadcast notification sent successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to send notification', { variant: 'error' });
    },
  });

  const handleBroadcast = () => {
    if (!broadcastData.title || !broadcastData.message) {
      enqueueSnackbar('Title and message are required', { variant: 'warning' });
      return;
    }
    broadcastMutation.mutate(broadcastData);
  };

  const toggleRole = (role: string) => {
    setBroadcastData((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Notification Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => setBroadcastDialogOpen(true)}
        >
          Broadcast Notification
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Recent Notifications
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notifications?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No notifications found
                        </TableCell>
                      </TableRow>
                    ) : (
                      notifications?.slice(0, 20).map((notification: any) => (
                        <TableRow key={notification.id}>
                          <TableCell>{notification.title}</TableCell>
                          <TableCell>
                            {notification.message.substring(0, 50)}...
                          </TableCell>
                          <TableCell>
                            <Chip label={notification.type} size="small" />
                          </TableCell>
                          <TableCell>
                            {new Date(notification.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Statistics
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Notifications: {notifications?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Unread: {notifications?.filter((n: any) => !n.is_read).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Broadcast Dialog */}
      <Dialog
        open={broadcastDialogOpen}
        onClose={() => setBroadcastDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Broadcast Notification</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={broadcastData.title}
                onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                value={broadcastData.message}
                onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                multiline
                rows={4}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Type"
                value={broadcastData.type}
                onChange={(e) => setBroadcastData({ ...broadcastData, type: e.target.value })}
              >
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Target Roles (leave empty for all users)
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={broadcastData.target_roles.includes('student')}
                    onChange={() => toggleRole('student')}
                  />
                }
                label="Students"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={broadcastData.target_roles.includes('lecturer')}
                    onChange={() => toggleRole('lecturer')}
                  />
                }
                label="Lecturers"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={broadcastData.target_roles.includes('coordinator')}
                    onChange={() => toggleRole('coordinator')}
                  />
                }
                label="Coordinators"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={broadcastData.target_roles.includes('admin')}
                    onChange={() => toggleRole('admin')}
                  />
                }
                label="Admins"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBroadcastDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBroadcast}
            variant="contained"
            disabled={broadcastMutation.isPending}
          >
            Send Broadcast
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationManagement;

