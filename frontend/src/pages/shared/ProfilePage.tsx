import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const profileSchema = yup.object({
  first_name: yup.string().min(2).max(50).required('First name is required'),
  last_name: yup.string().min(2).max(50).required('Last name is required'),
  phone: yup.string().optional(),
  department: yup.string().optional(),
});

const passwordSchema = yup.object({
  current_password: yup.string().required('Current password is required'),
  new_password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('New password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('new_password')], 'Passwords must match')
    .required('Please confirm your password'),
});

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileFormik = useFormik({
    initialValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      department: user?.department || '',
    },
    validationSchema: profileSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsUpdating(true);
      try {
        await updateProfile(values);
        enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      } catch (error: any) {
        enqueueSnackbar(error.message || 'Failed to update profile', { variant: 'error' });
      } finally {
        setIsUpdating(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    validationSchema: passwordSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsChangingPassword(true);
      try {
        await authAPI.changePassword(values.current_password, values.new_password);
        enqueueSnackbar('Password changed successfully', { variant: 'success' });
        resetForm();
      } catch (error: any) {
        enqueueSnackbar(
          error.response?.data?.message || 'Failed to change password',
          { variant: 'error' }
        );
      } finally {
        setIsChangingPassword(false);
      }
    },
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Profile Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2.5rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                }}
              >
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textTransform: 'capitalize', mb: 2 }}
              >
                {user?.role}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <EmailIcon sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2">{user?.email}</Typography>
                </Box>
                {user?.student_id && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <SchoolIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2">{user.student_id}</Typography>
                  </Box>
                )}
                {user?.department && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <SchoolIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2">{user.department}</Typography>
                  </Box>
                )}
                {user?.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PhoneIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2">{user.phone}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Edit Profile */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Edit Profile
              </Typography>
              <form onSubmit={profileFormik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="first_name"
                      name="first_name"
                      label="First Name"
                      value={profileFormik.values.first_name}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={
                        profileFormik.touched.first_name &&
                        Boolean(profileFormik.errors.first_name)
                      }
                      helperText={
                        profileFormik.touched.first_name && profileFormik.errors.first_name
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="last_name"
                      name="last_name"
                      label="Last Name"
                      value={profileFormik.values.last_name}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={
                        profileFormik.touched.last_name &&
                        Boolean(profileFormik.errors.last_name)
                      }
                      helperText={
                        profileFormik.touched.last_name && profileFormik.errors.last_name
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      value={profileFormik.values.phone}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.phone && Boolean(profileFormik.errors.phone)}
                      helperText={profileFormik.touched.phone && profileFormik.errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="department"
                      name="department"
                      label="Department"
                      value={profileFormik.values.department}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={
                        profileFormik.touched.department &&
                        Boolean(profileFormik.errors.department)
                      }
                      helperText={
                        profileFormik.touched.department && profileFormik.errors.department
                      }
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isUpdating}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    }}
                  >
                    {isUpdating ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Change Password
              </Typography>
              <form onSubmit={passwordFormik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="password"
                      id="current_password"
                      name="current_password"
                      label="Current Password"
                      value={passwordFormik.values.current_password}
                      onChange={passwordFormik.handleChange}
                      onBlur={passwordFormik.handleBlur}
                      error={
                        passwordFormik.touched.current_password &&
                        Boolean(passwordFormik.errors.current_password)
                      }
                      helperText={
                        passwordFormik.touched.current_password &&
                        passwordFormik.errors.current_password
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      id="new_password"
                      name="new_password"
                      label="New Password"
                      value={passwordFormik.values.new_password}
                      onChange={passwordFormik.handleChange}
                      onBlur={passwordFormik.handleBlur}
                      error={
                        passwordFormik.touched.new_password &&
                        Boolean(passwordFormik.errors.new_password)
                      }
                      helperText={
                        passwordFormik.touched.new_password &&
                        passwordFormik.errors.new_password
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      label="Confirm New Password"
                      value={passwordFormik.values.confirm_password}
                      onChange={passwordFormik.handleChange}
                      onBlur={passwordFormik.handleBlur}
                      error={
                        passwordFormik.touched.confirm_password &&
                        Boolean(passwordFormik.errors.confirm_password)
                      }
                      helperText={
                        passwordFormik.touched.confirm_password &&
                        passwordFormik.errors.confirm_password
                      }
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="outlined"
                    disabled={isChangingPassword}
                    startIcon={<LockIcon />}
                  >
                    {isChangingPassword ? <CircularProgress size={24} /> : 'Change Password'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;

