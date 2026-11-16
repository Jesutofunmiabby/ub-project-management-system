import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
  Archive as ArchiveIcon,
  Notifications as NotificationsIcon,
  Assessment as AuditIcon,
  IntegrationInstructions as IntegrationIcon,
  Palette as CustomizationIcon,
  Support as SupportIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import UserManagement from './sections/UserManagement';
import DashboardOverview from './sections/DashboardOverview';
import SystemConfiguration from './sections/SystemConfiguration';
import SecurityControls from './sections/SecurityControls';
import MonitoringDashboard from './sections/MonitoringDashboard';
import DataArchiving from './sections/DataArchiving';
import NotificationManagement from './sections/NotificationManagement';
import AuditCompliance from './sections/AuditCompliance';
import Integrations from './sections/Integrations';
import Customization from './sections/Customization';
import SupportTools from './sections/SupportTools';
import DisasterRecovery from './sections/DisasterRecovery';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await adminAPI.getDashboard();
      return response.data.data;
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Dashboard', icon: <DashboardIcon />, component: <DashboardOverview /> },
    { label: 'Users & Roles', icon: <PeopleIcon />, component: <UserManagement /> },
    { label: 'System Config', icon: <SettingsIcon />, component: <SystemConfiguration /> },
    { label: 'Security', icon: <SecurityIcon />, component: <SecurityControls /> },
    { label: 'Monitoring', icon: <DashboardIcon />, component: <MonitoringDashboard /> },
    { label: 'Archiving', icon: <ArchiveIcon />, component: <DataArchiving /> },
    { label: 'Notifications', icon: <NotificationsIcon />, component: <NotificationManagement /> },
    { label: 'Audit & Compliance', icon: <AuditIcon />, component: <AuditCompliance /> },
    { label: 'Integrations', icon: <IntegrationIcon />, component: <Integrations /> },
    { label: 'Customization', icon: <CustomizationIcon />, component: <Customization /> },
    { label: 'Support', icon: <SupportIcon />, component: <SupportTools /> },
    { label: 'Disaster Recovery', icon: <BackupIcon />, component: <DisasterRecovery /> },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Admin Dashboard
        </Typography>
        <Typography color="text.secondary">
          System Administration & Management
        </Typography>
      </Box>

      {/* Quick Stats */}
      {isLoading ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total Users
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboard?.users?.student + dashboard?.users?.lecturer + dashboard?.users?.coordinator || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DashboardIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Projects
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboard?.totalProjects || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SecurityIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Active Sessions
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboard?.activeSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontSize: '0.875rem',
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
                sx={{ gap: 1 }}
              />
            ))}
          </Tabs>
        </Box>

        {tabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Card>
    </Box>
  );
};

export default AdminDashboard;

