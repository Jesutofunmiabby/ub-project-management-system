import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { coordinatorAPI } from '../../services/api';
import { AcademicYearConfig as AcademicYearConfigType } from '../../types';

// Helper function to validate that end date/time is after start date/time
// Allows same-day dates if end time is after start time
const validateEndAfterStart = (startRef: string, fieldName: string) => {
  return yup
    .date()
    .required(`${fieldName} end date is required`)
    .test(
      'end-after-start',
      `End date/time must be after start date/time. Same-day dates are allowed if end time is later than start time.`,
      function (endDate) {
        const startDate = this.resolve(yup.ref(startRef));
        if (!startDate || !endDate) return true; // Let required validation handle missing values
        // End date/time must be strictly greater than start date/time
        return endDate.getTime() > (startDate as Date).getTime();
      }
    );
};

const validationSchema = yup.object({
  year: yup
    .string()
    .matches(/^\d{4}\/\d{4}$/, 'Year must be in format YYYY/YYYY')
    .required('Academic year is required'),
  topic_submission_start: yup.date().required('Topic submission start date is required'),
  topic_submission_end: validateEndAfterStart('topic_submission_start', 'Topic submission'),
  alpha_deadline_start: yup.date().required('Alpha deadline start date is required'),
  alpha_deadline_end: validateEndAfterStart('alpha_deadline_start', 'Alpha deadline'),
  beta_deadline_start: yup.date().required('Beta deadline start date is required'),
  beta_deadline_end: validateEndAfterStart('beta_deadline_start', 'Beta deadline'),
  presentation_start: yup.date().required('Presentation start date is required'),
  presentation_end: validateEndAfterStart('presentation_start', 'Presentation'),
  final_deadline_start: yup.date().required('Final deadline start date is required'),
  final_deadline_end: validateEndAfterStart('final_deadline_start', 'Final deadline'),
  max_supervisor_load: yup.number().min(1).max(50).required('Max supervisor load is required'),
});

const AcademicYearConfig: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: years, isLoading } = useQuery<AcademicYearConfigType[]>({
    queryKey: ['academicYears'],
    queryFn: async () => {
      const response = await coordinatorAPI.getAcademicYears();
      return response.data.data;
    },
  });

  const activeYear = years?.find((y) => y.is_active);

  const saveMutation = useMutation({
    mutationFn: (data: any) => coordinatorAPI.configureAcademicYear(data),
    onSuccess: (response: any) => {
      const message = response.data?.message || 'Academic year configuration saved';
      const projectsUpdated = response.data?.data?.projectsUpdated || 0;
      const usersNotified = response.data?.data?.usersNotified || 0;
      
      enqueueSnackbar(message, { variant: 'success', autoHideDuration: 6000 });
      
      // Show additional info about what was updated
      if (projectsUpdated > 0) {
        enqueueSnackbar(`✓ Deadlines updated for ${projectsUpdated} existing project(s)`, { 
          variant: 'info',
          autoHideDuration: 5000 
        });
      }
      
      if (usersNotified > 0) {
        enqueueSnackbar(`✓ ${usersNotified} student(s) and lecturer(s) have been notified`, { 
          variant: 'info',
          autoHideDuration: 5000 
        });
      }
      
      // Invalidate related queries so dashboards refresh
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['lecturerDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['coordinatorDashboard'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to save configuration';
      const validationErrors = error.response?.data?.errors;
      
      // Display main error message
      enqueueSnackbar(errorMessage, {
        variant: 'error',
        autoHideDuration: 6000,
      });
      
      // Display detailed validation errors if available
      if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        validationErrors.forEach((err: string) => {
          enqueueSnackbar(err, {
            variant: 'error',
            autoHideDuration: 5000,
          });
        });
      }
    },
  });

  const currentYear = new Date().getFullYear();
  const defaultYear = `${currentYear}/${currentYear + 1}`;

  const formik = useFormik({
    initialValues: {
      year: activeYear?.year || defaultYear,
      topic_submission_start: activeYear?.topic_submission_start
        ? new Date(activeYear.topic_submission_start)
        : new Date(currentYear, 8, 1),
      topic_submission_end: activeYear?.topic_submission_end
        ? new Date(activeYear.topic_submission_end)
        : new Date(currentYear, 8, 30),
      alpha_deadline_start: activeYear?.alpha_deadline_start
        ? new Date(activeYear.alpha_deadline_start)
        : activeYear?.alpha_deadline
        ? new Date(new Date(activeYear.alpha_deadline).getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(currentYear, 10, 8),
      alpha_deadline_end: activeYear?.alpha_deadline_end
        ? new Date(activeYear.alpha_deadline_end)
        : activeYear?.alpha_deadline
        ? new Date(activeYear.alpha_deadline)
        : new Date(currentYear, 10, 15),
      beta_deadline_start: activeYear?.beta_deadline_start
        ? new Date(activeYear.beta_deadline_start)
        : activeYear?.beta_deadline
        ? new Date(new Date(activeYear.beta_deadline).getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(currentYear + 1, 0, 24),
      beta_deadline_end: activeYear?.beta_deadline_end
        ? new Date(activeYear.beta_deadline_end)
        : activeYear?.beta_deadline
        ? new Date(activeYear.beta_deadline)
        : new Date(currentYear + 1, 0, 31),
      presentation_start: activeYear?.presentation_start
        ? new Date(activeYear.presentation_start)
        : new Date(currentYear + 1, 2, 1),
      presentation_end: activeYear?.presentation_end
        ? new Date(activeYear.presentation_end)
        : new Date(currentYear + 1, 2, 31),
      final_deadline_start: activeYear?.final_deadline_start
        ? new Date(activeYear.final_deadline_start)
        : activeYear?.final_deadline
        ? new Date(new Date(activeYear.final_deadline).getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(currentYear + 1, 4, 8),
      final_deadline_end: activeYear?.final_deadline_end
        ? new Date(activeYear.final_deadline_end)
        : activeYear?.final_deadline
        ? new Date(activeYear.final_deadline)
        : new Date(currentYear + 1, 4, 15),
      plagiarism_threshold: activeYear?.plagiarism_threshold || 25,
      max_supervisor_load: activeYear?.max_supervisor_load || 10,
      is_active: activeYear?.is_active === true || (activeYear?.is_active as unknown) === 1 || (activeYear?.is_active as unknown) === '1' || (activeYear === undefined ? true : false),
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      saveMutation.mutate({
        ...values,
        topic_submission_start: values.topic_submission_start.toISOString(),
        topic_submission_end: values.topic_submission_end.toISOString(),
        // Send new start/end dates
        alpha_deadline_start: values.alpha_deadline_start.toISOString(),
        alpha_deadline_end: values.alpha_deadline_end.toISOString(),
        beta_deadline_start: values.beta_deadline_start.toISOString(),
        beta_deadline_end: values.beta_deadline_end.toISOString(),
        presentation_start: values.presentation_start.toISOString(),
        presentation_end: values.presentation_end.toISOString(),
        final_deadline_start: values.final_deadline_start.toISOString(),
        final_deadline_end: values.final_deadline_end.toISOString(),
        // Also send old deadline fields for backward compatibility (use end dates)
        alpha_deadline: values.alpha_deadline_end.toISOString(),
        beta_deadline: values.beta_deadline_end.toISOString(),
        final_deadline: values.final_deadline_end.toISOString(),
        // Ensure is_active is boolean
        is_active: Boolean(values.is_active),
      });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Academic Year Configuration
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Configure deadlines and settings for the academic year
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        <strong>Note:</strong> Any changes to deadlines will automatically apply to all existing students 
        and lecturers in this academic year. They will receive a notification about the updated deadlines.
      </Alert>

      <form onSubmit={formik.handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Basic Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="year"
                  name="year"
                  label="Academic Year"
                  placeholder="e.g., 2024/2025"
                  value={formik.values.year}
                  onChange={formik.handleChange}
                  error={formik.touched.year && Boolean(formik.errors.year)}
                  helperText={formik.touched.year && formik.errors.year}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  id="max_supervisor_load"
                  name="max_supervisor_load"
                  label="Max Supervisor Load"
                  value={formik.values.max_supervisor_load}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.max_supervisor_load && Boolean(formik.errors.max_supervisor_load)
                  }
                  helperText={
                    formik.touched.max_supervisor_load && formik.errors.max_supervisor_load
                  }
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Topic Submission Period
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Start Date"
                  value={formik.values.topic_submission_start}
                  onChange={(value) => formik.setFieldValue('topic_submission_start', value)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: formik.touched.topic_submission_start && Boolean(formik.errors.topic_submission_start),
                      helperText: formik.touched.topic_submission_start && (formik.errors.topic_submission_start as string | undefined)
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="End Date"
                  value={formik.values.topic_submission_end}
                  onChange={(value) => formik.setFieldValue('topic_submission_end', value)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: formik.touched.topic_submission_end && Boolean(formik.errors.topic_submission_end),
                      helperText: formik.touched.topic_submission_end && (formik.errors.topic_submission_end as string | undefined)
                    } 
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Submission Deadlines
            </Typography>
            
            {/* Alpha Deadline */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Alpha Deadline
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Start Date"
                    value={formik.values.alpha_deadline_start}
                    onChange={(value) => formik.setFieldValue('alpha_deadline_start', value)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        error: formik.touched.alpha_deadline_start && Boolean(formik.errors.alpha_deadline_start),
                        helperText: formik.touched.alpha_deadline_start && (formik.errors.alpha_deadline_start as string | undefined)
                      } 
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="End Date"
                    value={formik.values.alpha_deadline_end}
                    onChange={(value) => formik.setFieldValue('alpha_deadline_end', value)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        error: formik.touched.alpha_deadline_end && Boolean(formik.errors.alpha_deadline_end),
                        helperText: formik.touched.alpha_deadline_end && (formik.errors.alpha_deadline_end as string | undefined)
                      } 
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Beta Deadline */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Beta Deadline
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Start Date"
                    value={formik.values.beta_deadline_start}
                    onChange={(value) => formik.setFieldValue('beta_deadline_start', value)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        error: formik.touched.beta_deadline_start && Boolean(formik.errors.beta_deadline_start),
                        helperText: formik.touched.beta_deadline_start && (formik.errors.beta_deadline_start as string | undefined)
                      } 
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="End Date"
                    value={formik.values.beta_deadline_end}
                    onChange={(value) => formik.setFieldValue('beta_deadline_end', value)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        error: formik.touched.beta_deadline_end && Boolean(formik.errors.beta_deadline_end),
                        helperText: formik.touched.beta_deadline_end && (formik.errors.beta_deadline_end as string | undefined)
                      } 
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Final Deadline */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Final Deadline
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Start Date"
                    value={formik.values.final_deadline_start}
                    onChange={(value) => formik.setFieldValue('final_deadline_start', value)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        error: formik.touched.final_deadline_start && Boolean(formik.errors.final_deadline_start),
                        helperText: formik.touched.final_deadline_start && (formik.errors.final_deadline_start as string | undefined)
                      } 
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="End Date"
                    value={formik.values.final_deadline_end}
                    onChange={(value) => formik.setFieldValue('final_deadline_end', value)}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        error: formik.touched.final_deadline_end && Boolean(formik.errors.final_deadline_end),
                        helperText: formik.touched.final_deadline_end && (formik.errors.final_deadline_end as string | undefined)
                      } 
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Presentation Period
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="Start Date"
                  value={formik.values.presentation_start}
                  onChange={(value) => formik.setFieldValue('presentation_start', value)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: formik.touched.presentation_start && Boolean(formik.errors.presentation_start),
                      helperText: formik.touched.presentation_start && (formik.errors.presentation_start as string | undefined)
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="End Date"
                  value={formik.values.presentation_end}
                  onChange={(value) => formik.setFieldValue('presentation_end', value)}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      error: formik.touched.presentation_end && Boolean(formik.errors.presentation_end),
                      helperText: formik.touched.presentation_end && (formik.errors.presentation_end as string | undefined)
                    } 
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(formik.values.is_active)}
                onChange={(e) => formik.setFieldValue('is_active', e.target.checked)}
              />
            }
            label="Set as Active Academic Year"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={saveMutation.isPending}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            }}
          >
            {saveMutation.isPending ? <CircularProgress size={24} /> : 'Save Configuration'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AcademicYearConfig;

