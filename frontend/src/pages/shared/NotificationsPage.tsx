import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  Chip,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  DoneAll as MarkAllReadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { formatDistanceToNow } from 'date-fns';
import { notificationsAPI } from '../../services/api';
import { Notification, PaginatedResponse } from '../../types';

const typeIcons: Record<string, React.ReactNode> = {
  info: <InfoIcon sx={{ color: '#3b82f6' }} />,
  warning: <WarningIcon sx={{ color: '#f59e0b' }} />,
  success: <SuccessIcon sx={{ color: '#22c55e' }} />,
  error: <ErrorIcon sx={{ color: '#ef4444' }} />,
};

const typeColors: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  success: '#22c55e',
  error: '#ef4444',
};

const NotificationsPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsAPI.getAll({ limit: 50 });
      return response.data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsAPI.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      enqueueSnackbar('All notifications marked as read', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsAPI.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsAPI.clearAll(),
    onSuccess: () => {
      enqueueSnackbar('All notifications cleared', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] });
    },
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          Notifications
        </Typography>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography color="text.secondary">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              startIcon={<MarkAllReadIcon />}
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
            >
              Clear All
            </Button>
          )}
        </Box>
      </Box>

      <Card>
        {notifications.length === 0 ? (
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              No Notifications
            </Typography>
            <Typography color="text.secondary">
              You're all caught up! Check back later for updates.
            </Typography>
          </CardContent>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 3,
                    background: notification.is_read ? 'transparent' : alpha('#3b82f6', 0.05),
                    '&:hover': {
                      background: alpha('#ffffff', 0.03),
                    },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => deleteMutation.mutate(notification.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                >
                  <ListItemIcon>{typeIcons[notification.type] || typeIcons.info}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: notification.is_read ? 400 : 600 }}>
                          {notification.title}
                        </Typography>
                        {!notification.is_read && (
                          <Chip
                            label="New"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              background: alpha(typeColors[notification.type], 0.2),
                              color: typeColors[notification.type],
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && (
                  <Box sx={{ borderBottom: `1px solid ${alpha('#ffffff', 0.08)}` }} />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
};

export default NotificationsPage;

