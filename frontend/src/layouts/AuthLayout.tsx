import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Typography, alpha } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';

const AuthLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
          filter: 'blur(100px)',
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(239, 68, 68, 0.15))',
          filter: 'blur(120px)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />

      {/* Left side - Branding */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: 500,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
              }}
            >
              <SchoolIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>
          </Box>

          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            UBPMS
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              mb: 4,
            }}
          >
            University Project Management System
          </Typography>

          <Typography
            sx={{
              color: alpha('#94a3b8', 0.8),
              lineHeight: 1.8,
              fontSize: '1.1rem',
            }}
          >
            Streamline your final-year project lifecycle with our comprehensive 
            digital platform. From proposal submission to final evaluation - 
            manage everything in one place.
          </Typography>

          <Box
            sx={{
              mt: 6,
              display: 'flex',
              gap: 3,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Projects', value: '2,500+' },
              { label: 'Students', value: '10,000+' },
              { label: 'Supervisors', value: '500+' },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  textAlign: 'center',
                  px: 3,
                  py: 2,
                  borderRadius: 2,
                  background: alpha('#ffffff', 0.05),
                  border: `1px solid ${alpha('#ffffff', 0.1)}`,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: '#60a5fa',
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary' }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right side - Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              background: alpha('#1e293b', 0.8),
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: `1px solid ${alpha('#ffffff', 0.1)}`,
              p: { xs: 3, sm: 5 },
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Outlet />
          </Box>

          <Typography
            variant="body2"
            sx={{
              mt: 4,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            © {new Date().getFullYear()} UBPMS. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default AuthLayout;

