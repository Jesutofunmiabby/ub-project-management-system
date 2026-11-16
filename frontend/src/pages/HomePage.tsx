import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  alpha,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  CloudUpload as CloudUploadIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

const features = [
  {
    icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
    title: 'Project Proposals',
    description: 'Submit and track your final year project proposals with ease. Get feedback from supervisors.',
  },
  {
    icon: <GroupIcon sx={{ fontSize: 40 }} />,
    title: 'Supervisor Matching',
    description: 'Choose preferred supervisors and get matched based on expertise and availability.',
  },
  {
    icon: <TimelineIcon sx={{ fontSize: 40 }} />,
    title: 'Progress Tracking',
    description: 'Monitor your project milestones, deadlines, and submission status in real-time.',
  },
  {
    icon: <CloudUploadIcon sx={{ fontSize: 40 }} />,
    title: 'Document Submission',
    description: 'Upload Alpha, Beta, and Final reports directly through the platform.',
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
    title: 'Grading & Feedback',
    description: 'Receive detailed grades and constructive feedback from your supervisors.',
  },
];

const stats = [
  { value: '500+', label: 'Students' },
  { value: '50+', label: 'Supervisors' },
  { value: '300+', label: 'Projects Completed' },
  { value: '98%', label: 'Success Rate' },
];

const HomePage: React.FC = () => {

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          backgroundColor: alpha('#0f172a', 0.8),
          borderBottom: '1px solid',
          borderColor: alpha('#fff', 0.1),
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <SchoolIcon
                sx={{
                  fontSize: 36,
                  color: '#60a5fa',
                }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontFamily: '"Playfair Display", serif',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                UBPMS
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                sx={{
                  color: '#fff',
                  borderColor: alpha('#fff', 0.3),
                  px: 3,
                  '&:hover': {
                    borderColor: '#60a5fa',
                    backgroundColor: alpha('#60a5fa', 0.1),
                  },
                }}
              >
                Sign In
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                sx={{
                  px: 3,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  },
                }}
              >
                Get Started
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 16, md: 20 },
          pb: { xs: 10, md: 16 },
          position: 'relative',
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                  fontWeight: 800,
                  fontFamily: '"Playfair Display", serif',
                  color: '#fff',
                  lineHeight: 1.2,
                  mb: 3,
                }}
              >
                University{' '}
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Project
                </Box>
                <br />
                Management System
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: alpha('#fff', 0.7),
                  fontWeight: 400,
                  lineHeight: 1.8,
                  mb: 4,
                  maxWidth: 540,
                }}
              >
                Streamline your final year project journey. Submit proposals, 
                collaborate with supervisors, track progress, and achieve 
                academic excellence—all in one powerful platform.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.35)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      boxShadow: '0 12px 40px rgba(59, 130, 246, 0.45)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Start Your Journey
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="large"
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#fff',
                    borderColor: alpha('#fff', 0.3),
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: '#60a5fa',
                      backgroundColor: alpha('#60a5fa', 0.1),
                      borderWidth: 2,
                    },
                  }}
                >
                  Sign In
                </Button>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -20,
                    left: -20,
                    right: -20,
                    bottom: -20,
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    borderRadius: 4,
                    filter: 'blur(40px)',
                  },
                }}
              >
                <Card
                  sx={{
                    position: 'relative',
                    background: alpha('#1e293b', 0.8),
                    backdropFilter: 'blur(20px)',
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3}>
                      {[
                        { icon: '📝', text: 'Submit Project Proposal', status: 'Completed' },
                        { icon: '👨‍🏫', text: 'Supervisor Assignment', status: 'Completed' },
                        { icon: '📄', text: 'Alpha Report', status: 'In Progress' },
                        { icon: '🎯', text: 'Beta Report', status: 'Pending' },
                        { icon: '🎓', text: 'Final Submission', status: 'Pending' },
                      ].map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha('#fff', 0.05),
                            border: '1px solid',
                            borderColor: alpha('#fff', 0.1),
                          }}
                        >
                          <Typography fontSize={24}>{item.icon}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body1"
                              sx={{ color: '#fff', fontWeight: 500 }}
                            >
                              {item.text}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor:
                                item.status === 'Completed'
                                  ? alpha('#10b981', 0.2)
                                  : item.status === 'In Progress'
                                  ? alpha('#f59e0b', 0.2)
                                  : alpha('#6b7280', 0.2),
                              color:
                                item.status === 'Completed'
                                  ? '#10b981'
                                  : item.status === 'In Progress'
                                  ? '#f59e0b'
                                  : '#9ca3af',
                            }}
                          >
                            {item.status}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box
        sx={{
          py: 6,
          backgroundColor: alpha('#1e293b', 0.5),
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: alpha('#fff', 0.1),
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      fontFamily: '"Playfair Display", serif',
                      background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: alpha('#fff', 0.6), fontWeight: 500 }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="overline"
              sx={{
                color: '#60a5fa',
                fontWeight: 600,
                letterSpacing: 3,
                mb: 2,
                display: 'block',
              }}
            >
              FEATURES
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontFamily: '"Playfair Display", serif',
                color: '#fff',
                mb: 2,
              }}
            >
              Everything You Need
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: alpha('#fff', 0.6),
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              A comprehensive suite of tools designed to simplify your final year project experience
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    background: alpha('#1e293b', 0.6),
                    backdropFilter: 'blur(10px)',
                    border: '1px solid',
                    borderColor: alpha('#fff', 0.1),
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      borderColor: alpha('#60a5fa', 0.3),
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                        color: '#60a5fa',
                        mb: 3,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#fff',
                        fontWeight: 600,
                        mb: 1.5,
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: alpha('#fff', 0.6),
                        lineHeight: 1.7,
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 10, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              textAlign: 'center',
              p: { xs: 4, md: 8 },
              borderRadius: 4,
              background: alpha('#1e293b', 0.8),
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: alpha('#fff', 0.1),
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontFamily: '"Playfair Display", serif',
                color: '#fff',
                mb: 2,
              }}
            >
              Ready to Get Started?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: alpha('#fff', 0.7),
                mb: 4,
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              Join hundreds of students who have successfully completed their final year projects using UBPMS.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
            >
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  px: 5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  },
                }}
              >
                Create Account
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                size="large"
                sx={{
                  py: 1.5,
                  px: 5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#fff',
                  borderColor: alpha('#fff', 0.3),
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#60a5fa',
                    backgroundColor: alpha('#60a5fa', 0.1),
                    borderWidth: 2,
                  },
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          borderTop: '1px solid',
          borderColor: alpha('#fff', 0.1),
          backgroundColor: alpha('#0f172a', 0.5),
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <SchoolIcon sx={{ fontSize: 28, color: '#60a5fa' }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontFamily: '"Playfair Display", serif',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                UBPMS
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ color: alpha('#fff', 0.5) }}
            >
              © {new Date().getFullYear()} University Project Management System. All rights reserved.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;

