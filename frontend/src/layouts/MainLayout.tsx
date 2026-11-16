import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Grade as GradeIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  RateReview as ReviewIcon,
  Upload as UploadIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsAPI, messagesAPI } from '../services/api';

const drawerWidth = 280;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const getNavItems = (role: string): NavItem[] => {
  switch (role) {
    case 'student':
      return [
        { label: 'Dashboard', path: '/student/dashboard', icon: <DashboardIcon /> },
        { label: 'My Project', path: '/student/my-project', icon: <AssignmentIcon /> },
        { label: 'Submit Project', path: '/student/submit-project', icon: <UploadIcon /> },
        { label: 'Submission', path: '/student/submission', icon: <AssignmentIcon /> },
        { label: 'View My Grades', path: '/student/grades', icon: <GradeIcon /> },
      ];
    case 'lecturer':
      return [
        { label: 'Dashboard', path: '/lecturer/dashboard', icon: <DashboardIcon /> },
        { label: 'Review Projects', path: '/lecturer/review', icon: <ReviewIcon /> },
        { label: 'My Supervisees', path: '/lecturer/supervisees', icon: <GroupsIcon /> },
        { label: 'Grade Submissions', path: '/lecturer/grade', icon: <GradeIcon /> },
      ];
    case 'coordinator':
      return [
        { label: 'Dashboard', path: '/coordinator/dashboard', icon: <DashboardIcon /> },
        { label: 'Assessment', path: '/coordinator/proposals', icon: <AssignmentIcon /> },
        { label: 'Manage Users', path: '/coordinator/users', icon: <PeopleIcon /> },
        { label: 'Academic Year', path: '/coordinator/academic-year', icon: <CalendarIcon /> },
        { label: 'Reports', path: '/coordinator/reports', icon: <AssessmentIcon /> },
      ];
    case 'admin':
      return [
        { label: 'Admin Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
      ];
    default:
      return [];
  }
};

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = user ? getNavItems(user.role) : [];

  // Fetch unread counts
  const { data: unreadNotifications } = useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: async () => {
      const response = await notificationsAPI.getUnreadCount();
      return response.data.data.unread;
    },
    refetchInterval: 30000,
  });

  const { data: unreadMessages } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      const response = await messagesAPI.getUnreadCount();
      return response.data.data.unread;
    },
    refetchInterval: 30000,
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 45,
            height: 45,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
          }}
        >
          <SchoolIcon sx={{ fontSize: 28, color: 'white' }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            UBPMS
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Project Management
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ opacity: 0.1 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              '&.Mui-selected': {
                background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.2)} 0%, ${alpha('#8b5cf6', 0.2)} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.3)} 0%, ${alpha('#8b5cf6', 0.3)} 100%)`,
                },
                '& .MuiListItemIcon-root': {
                  color: '#60a5fa',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>

      {/* User section at bottom */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: alpha('#ffffff', 0.05),
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              fontWeight: 600,
            }}
          >
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', textTransform: 'capitalize' }}
            >
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Messages">
              <IconButton
                color="inherit"
                onClick={() => navigate('/messages')}
              >
                <Badge badgeContent={unreadMessages} color="error">
                  <EmailIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={() => navigate('/notifications')}
              >
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconButton onClick={handleMenuOpen}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                },
              }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { handleMenuClose(); logout(); }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;

