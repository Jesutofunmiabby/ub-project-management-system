import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  alpha,
  Chip,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation } from '@tanstack/react-query';
import { projectsAPI } from '../../services/api';
import { AvailableLecturer } from '../../types';

const steps = ['Project Details', 'Review Similar Projects', 'Supervisor Selection', 'Review & Submit'];

const validationSchema = yup.object({
  title: yup
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must not exceed 200 characters')
    .required('Project title is required'),
  description: yup
    .string()
    .min(200, 'Description must be at least 200 characters')
    .required('Description is required'),
  problem_statement: yup
    .string()
    .min(50, 'Problem statement must be at least 50 characters')
    .required('Problem statement is required'),
  objectives: yup
    .string()
    .min(50, 'Objectives must be at least 50 characters')
    .required('Objectives are required'),
  methodology: yup
    .string()
    .min(50, 'Methodology must be at least 50 characters')
    .required('Methodology is required'),
  supervisor_preference_1: yup.string().optional(),
  supervisor_preference_2: yup.string().optional(),
  supervisor_preference_3: yup.string().optional(),
  originality_declared: yup
    .boolean()
    .oneOf([true], 'You must declare the originality of your work')
    .required(),
});

const ProjectSubmission: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [isResubmission, setIsResubmission] = useState(false);
  const [similarProjects, setSimilarProjects] = useState<any[]>([]);
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);

  // Get current project to check if this is a resubmission
  const { data: dashboard } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response.data.data;
    },
  });

  const { data: lecturers, isLoading: loadingLecturers } = useQuery<AvailableLecturer[]>({
    queryKey: ['availableLecturers'],
    queryFn: async () => {
      const response = await projectsAPI.getAvailableLecturers();
      return response.data.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.create(data),
    onSuccess: (response) => {
      const message = isResubmission 
        ? 'Project proposal resubmitted successfully!' 
        : 'Project proposal submitted successfully!';
      enqueueSnackbar(message, { variant: 'success' });
      navigate('/student/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Submission failed';
      const validationErrors = error.response?.data?.errors;
      
      // Display main error message
      enqueueSnackbar(errorMessage, {
        variant: 'error',
        autoHideDuration: 6000,
      });
      
      // Display detailed validation errors if available
      if (validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        validationErrors.forEach((err: any) => {
          const errorMsg = typeof err === 'string' ? err : err.msg || JSON.stringify(err);
          enqueueSnackbar(errorMsg, {
            variant: 'error',
            autoHideDuration: 5000,
          });
        });
      }
    },
  });

  // Removed checkDuplicateMutation - similarity check is now only done when clicking Next button
  // This prevents conflicts between blur checks and Next button navigation

  const formik = useFormik({
    initialValues: {
      title: dashboard?.project?.status === 'rejected' ? (dashboard.project.title || '') : '',
      description: dashboard?.project?.status === 'rejected' ? (dashboard.project.description || '') : '',
      problem_statement: dashboard?.project?.status === 'rejected' ? (dashboard.project.problem_statement || '') : '',
      objectives: dashboard?.project?.status === 'rejected' ? (dashboard.project.objectives || '') : '',
      methodology: dashboard?.project?.status === 'rejected' ? (dashboard.project.methodology || '') : '',
      supervisor_preference_1: dashboard?.project?.status === 'rejected' ? (dashboard.project.supervisor_preference_1 || '') : '',
      supervisor_preference_2: dashboard?.project?.status === 'rejected' ? (dashboard.project.supervisor_preference_2 || '') : '',
      supervisor_preference_3: dashboard?.project?.status === 'rejected' ? (dashboard.project.supervisor_preference_3 || '') : '',
      originality_declared: dashboard?.project?.status === 'rejected' ? (dashboard.project.originality_declared || false) : false,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      // Clean up supervisor preferences - send null instead of empty strings
      const cleanedValues = {
        ...values,
        supervisor_preference_1: values.supervisor_preference_1 || null,
        supervisor_preference_2: values.supervisor_preference_2 || null,
        supervisor_preference_3: values.supervisor_preference_3 || null,
        // Ensure originality_declared is a boolean
        originality_declared: Boolean(values.originality_declared),
      };
      console.log('Submitting project with values:', cleanedValues);
      submitMutation.mutate(cleanedValues);
    },
  });

  // Check if this is a resubmission
  React.useEffect(() => {
    if (dashboard?.project && dashboard.project.status === 'rejected') {
      setIsResubmission(true);
    } else {
      setIsResubmission(false);
    }
  }, [dashboard]);

  const handleNext = async (e?: React.MouseEvent) => {
    // Prevent form submission if this is called from a button in a form
    if (e) {
      e.preventDefault();
    }

    if (activeStep === 0) {
      // Mark all fields as touched to show validation errors
      formik.setTouched({
        title: true,
        description: true,
        problem_statement: true,
        objectives: true,
        methodology: true,
      });

      // Trigger validation and wait for it to complete
      const errors = await formik.validateForm();

      // Check for validation errors on required fields
      const requiredFieldErrors: string[] = [];
      
      // Check yup validation errors
      if (errors.title) {
        requiredFieldErrors.push(`Title: ${errors.title}`);
      }
      if (errors.description) {
        requiredFieldErrors.push(`Description: ${errors.description}`);
      }
      if (errors.problem_statement) {
        requiredFieldErrors.push(`Problem Statement: ${errors.problem_statement}`);
      }
      if (errors.objectives) {
        requiredFieldErrors.push(`Objectives: ${errors.objectives}`);
      }
      if (errors.methodology) {
        requiredFieldErrors.push(`Methodology: ${errors.methodology}`);
      }

      // Also do a basic check for empty/whitespace-only values
      if (!formik.values.title || !formik.values.title.trim()) {
        if (!requiredFieldErrors.some(e => e.includes('Title'))) {
          requiredFieldErrors.push('Title: Project title is required');
        }
      }
      if (!formik.values.description || !formik.values.description.trim()) {
        if (!requiredFieldErrors.some(e => e.includes('Description'))) {
          requiredFieldErrors.push('Description: Description is required');
        }
      }
      if (!formik.values.problem_statement || !formik.values.problem_statement.trim()) {
        if (!requiredFieldErrors.some(e => e.includes('Problem Statement'))) {
          requiredFieldErrors.push('Problem Statement: Problem statement is required');
        }
      }
      if (!formik.values.objectives || !formik.values.objectives.trim()) {
        if (!requiredFieldErrors.some(e => e.includes('Objectives'))) {
          requiredFieldErrors.push('Objectives: Objectives are required');
        }
      }
      if (!formik.values.methodology || !formik.values.methodology.trim()) {
        if (!requiredFieldErrors.some(e => e.includes('Methodology'))) {
          requiredFieldErrors.push('Methodology: Methodology is required');
        }
      }

      if (requiredFieldErrors.length > 0) {
        console.log('[VALIDATION] Form validation failed:', {
          yupErrors: errors,
          formikErrors: formik.errors,
          values: {
            title: formik.values.title?.length || 0,
            description: formik.values.description?.length || 0,
            problem_statement: formik.values.problem_statement?.length || 0,
            objectives: formik.values.objectives?.length || 0,
            methodology: formik.values.methodology?.length || 0,
          },
          requiredFieldErrors
        });
        
        const errorMessage = requiredFieldErrors.length === 1
          ? requiredFieldErrors[0]
          : `${requiredFieldErrors.length} field(s) need attention: ${requiredFieldErrors.slice(0, 2).join(', ')}${requiredFieldErrors.length > 2 ? '...' : ''}`;
        
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 6000 
        });
        return;
      }

      // Check for duplicates using description before moving to next step
      if (formik.values.description && formik.values.description.length >= 200) {
        setIsCheckingSimilarity(true);
        try {
          const response = await projectsAPI.checkDuplicate(formik.values.description);
          console.log('[SIMILARITY CHECK] Full Response:', JSON.stringify(response.data, null, 2));
          
          // Handle different possible response structures
          const similarProjectsList = 
            response?.data?.data?.similarProjects || 
            response?.data?.similarProjects || 
            [];
          
          console.log(`[SIMILARITY CHECK] Found ${similarProjectsList.length} similar projects`);
          
          if (similarProjectsList.length > 0 && Array.isArray(similarProjectsList)) {
            console.log('[SIMILARITY CHECK] Similarities detected - Navigating to Review Similar Projects step');
            // Set similar projects first, then navigate
            setSimilarProjects(similarProjectsList);
            setActiveStep(1);
            console.log('[SIMILARITY CHECK] Active step set to 1 (Review Similar Projects)');
          } else {
            console.log('[SIMILARITY CHECK] No similar projects found - Navigating to Supervisor Selection');
            setSimilarProjects([]);
            setActiveStep(2);
            console.log('[SIMILARITY CHECK] Active step set to 2 (Supervisor Selection)');
          }
        } catch (error: any) {
          console.error('[SIMILARITY CHECK] Error checking similarity:', error);
          console.error('[SIMILARITY CHECK] Error details:', error?.response?.data || error?.message);
          // On error, proceed to supervisor selection (don't block navigation)
          setSimilarProjects([]);
          setActiveStep(2);
          console.log('[SIMILARITY CHECK] Error occurred - Navigating to Supervisor Selection');
          enqueueSnackbar('Could not check for similar projects. Proceeding to supervisor selection.', { 
            variant: 'info',
            autoHideDuration: 4000 
          });
        } finally {
          setIsCheckingSimilarity(false);
        }
      } else {
        // Description too short, proceed to supervisor selection
        console.log('[SIMILARITY CHECK] Description too short, skipping check - Navigating to Supervisor Selection');
        setSimilarProjects([]);
        setActiveStep(2);
      }
    } else if (activeStep === 1) {
      // Review Similar Projects step - users must edit description, cannot proceed
      // This shouldn't be called since there's no Next button on this step
      enqueueSnackbar('Please edit your description before proceeding. Click "Edit My Description" to continue.', { 
        variant: 'warning',
        autoHideDuration: 5000 
      });
      return;
    } else {
      // For other steps, just increment
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 2) {
      // If going back from Supervisor Selection, check if we came from Review Similar Projects
      // If there were similar projects, go back to Review step, otherwise to Project Details
      if (similarProjects.length > 0) {
        setActiveStep(1);
      } else {
        setActiveStep(0);
      }
    } else if (activeStep === 1) {
      // Going back from Review Similar Projects to Project Details
      setActiveStep(0);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleEditDescription = () => {
    // Return to Project Details to edit
    setSimilarProjects([]);
    setActiveStep(0);
  };


  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              id="title"
              name="title"
              label="Project Title"
              placeholder="Enter a descriptive title for your project"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
              sx={{ mb: 3 }}
            />


            <TextField
              fullWidth
              multiline
              rows={5}
              id="description"
              name="description"
              label="Project Description"
              placeholder="Provide a detailed description of your project (minimum 200 characters)"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={
                formik.touched.description && formik.errors.description
                  ? formik.errors.description
                  : `${formik.values.description.length}/200 characters`
              }
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              id="problem_statement"
              name="problem_statement"
              label="Problem Statement"
              placeholder="Describe the problem your project aims to solve"
              value={formik.values.problem_statement}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.problem_statement && Boolean(formik.errors.problem_statement)}
              helperText={formik.touched.problem_statement && formik.errors.problem_statement}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              id="objectives"
              name="objectives"
              label="Project Objectives"
              placeholder="List the main objectives of your project"
              value={formik.values.objectives}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.objectives && Boolean(formik.errors.objectives)}
              helperText={formik.touched.objectives && formik.errors.objectives}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              id="methodology"
              name="methodology"
              label="Proposed Methodology"
              placeholder="Describe your approach and methodology"
              value={formik.values.methodology}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.methodology && Boolean(formik.errors.methodology)}
              helperText={formik.touched.methodology && formik.errors.methodology}
            />
          </Box>
        );

      case 1:
        // If somehow we're on this step with no similar projects, redirect to supervisor selection
        if (similarProjects.length === 0) {
          // This shouldn't happen, but if it does, navigate to supervisor selection
          setTimeout(() => setActiveStep(2), 0);
          return (
            <Box>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>No similar projects found. Proceeding to supervisor selection...</Typography>
            </Box>
          );
        }
        
        return (
          <Box>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Similar Projects Detected - Action Required
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Your project description has similarities with {similarProjects.length} existing 
                {similarProjects.length === 1 ? ' project' : ' projects'}. You <strong>must</strong> edit your 
                project description to make it more unique before proceeding.
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Please review the similar projects below and then click "Edit My Description" to refine your submission.
              </Typography>
            </Alert>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Similar Projects
            </Typography>

            {similarProjects.map((project, index) => (
              <Card key={project.id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {project.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                        <Chip
                          size="small"
                          label={`${project.similarity.toFixed(1)}% Similar`}
                          color={
                            project.similarity >= 70
                              ? 'error'
                              : project.similarity >= 50
                              ? 'warning'
                              : 'info'
                          }
                        />
                        <Typography variant="caption" color="text.secondary">
                          Academic Year: {project.academic_year} • Status: {project.status.replace('_', ' ')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: alpha('#000000', 0.02),
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Project Description:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {project.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                type="button"
                variant="contained"
                size="large"
                onClick={handleEditDescription}
                sx={{
                  minWidth: 200,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  },
                }}
              >
                Edit My Description
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Select up to three preferred supervisors. The system will attempt to assign your
              first preference if they have available capacity.
            </Typography>

            {loadingLecturers ? (
              <CircularProgress />
            ) : (
              <>
                <TextField
                  fullWidth
                  select
                  id="supervisor_preference_1"
                  name="supervisor_preference_1"
                  label="First Preference"
                  value={formik.values.supervisor_preference_1}
                  onChange={formik.handleChange}
                  sx={{ mb: 3 }}
                >
                  <MenuItem value="">Select a supervisor</MenuItem>
                  {lecturers?.map((lecturer) => (
                    <MenuItem key={lecturer.id} value={lecturer.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Box sx={{ flex: 1 }}>
                          {lecturer.first_name} {lecturer.last_name}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {lecturer.department}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${lecturer.current_students}/${lecturer.max_students}`}
                          color={
                            lecturer.current_students < lecturer.max_students ? 'success' : 'error'
                          }
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  select
                  id="supervisor_preference_2"
                  name="supervisor_preference_2"
                  label="Second Preference (Optional)"
                  value={formik.values.supervisor_preference_2}
                  onChange={formik.handleChange}
                  sx={{ mb: 3 }}
                >
                  <MenuItem value="">Select a supervisor</MenuItem>
                  {lecturers
                    ?.filter((l) => l.id !== formik.values.supervisor_preference_1)
                    .map((lecturer) => (
                      <MenuItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.first_name} {lecturer.last_name} - {lecturer.department}
                      </MenuItem>
                    ))}
                </TextField>

                <TextField
                  fullWidth
                  select
                  id="supervisor_preference_3"
                  name="supervisor_preference_3"
                  label="Third Preference (Optional)"
                  value={formik.values.supervisor_preference_3}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Select a supervisor</MenuItem>
                  {lecturers
                    ?.filter(
                      (l) =>
                        l.id !== formik.values.supervisor_preference_1 &&
                        l.id !== formik.values.supervisor_preference_2
                    )
                    .map((lecturer) => (
                      <MenuItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.first_name} {lecturer.last_name} - {lecturer.department}
                      </MenuItem>
                    ))}
                </TextField>
              </>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Review Your Submission
            </Typography>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                background: alpha('#ffffff', 0.03),
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Project Title
              </Typography>
              <Typography sx={{ mb: 2 }}>{formik.values.title}</Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Description
              </Typography>
              <Typography sx={{ mb: 2 }}>{formik.values.description}</Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Problem Statement
              </Typography>
              <Typography sx={{ mb: 2 }}>{formik.values.problem_statement}</Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Objectives
              </Typography>
              <Typography sx={{ mb: 2 }}>{formik.values.objectives}</Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Methodology
              </Typography>
              <Typography>{formik.values.methodology}</Typography>
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                background: alpha('#ffffff', 0.03),
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Preferred Supervisors
              </Typography>
              {formik.values.supervisor_preference_1 && (
                <Typography>
                  1st:{' '}
                  {lecturers?.find((l) => l.id === formik.values.supervisor_preference_1)
                    ?.first_name}{' '}
                  {lecturers?.find((l) => l.id === formik.values.supervisor_preference_1)?.last_name}
                </Typography>
              )}
              {formik.values.supervisor_preference_2 && (
                <Typography>
                  2nd:{' '}
                  {lecturers?.find((l) => l.id === formik.values.supervisor_preference_2)
                    ?.first_name}{' '}
                  {lecturers?.find((l) => l.id === formik.values.supervisor_preference_2)?.last_name}
                </Typography>
              )}
              {formik.values.supervisor_preference_3 && (
                <Typography>
                  3rd:{' '}
                  {lecturers?.find((l) => l.id === formik.values.supervisor_preference_3)
                    ?.first_name}{' '}
                  {lecturers?.find((l) => l.id === formik.values.supervisor_preference_3)?.last_name}
                </Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  id="originality_declared"
                  name="originality_declared"
                  checked={formik.values.originality_declared}
                  onChange={(e) => formik.setFieldValue('originality_declared', e.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  I declare that this project proposal is my original work and has not been
                  submitted elsewhere.
                </Typography>
              }
            />
            {formik.touched.originality_declared && formik.errors.originality_declared && (
              <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                {formik.errors.originality_declared}
              </Typography>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {isResubmission ? 'Resubmit Project Proposal' : 'Submit Project Proposal'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {isResubmission 
          ? 'Your previous proposal was rejected. Please update your proposal details and resubmit.'
          : 'Fill in the details below to submit your final year project proposal'}
      </Typography>
      
      {isResubmission && dashboard?.project?.rejection_reason && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Previous Rejection Reason
          </Typography>
          <Typography variant="body2">{dashboard.project.rejection_reason}</Typography>
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step 
                key={label}
                disabled={
                  // Disable clicking on steps - force sequential flow
                  index > activeStep + 1 ||
                  // Prevent jumping to Supervisor Selection if there are similar projects to review
                  (index === 2 && activeStep === 1 && similarProjects.length > 0)
                }
              >
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <form onSubmit={formik.handleSubmit}>
            {getStepContent(activeStep)}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button 
                type="button"
                disabled={activeStep === 0} 
                onClick={handleBack}
              >
                Back
              </Button>

              <Box sx={{ display: 'flex', gap: 2 }}>
                {activeStep === 1 ? (
                  // Review Similar Projects step - buttons handled in step content
                  null
                ) : activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitMutation.isPending || !formik.values.originality_declared}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    }}
                  >
                    {submitMutation.isPending ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      isResubmission ? 'Resubmit Proposal' : 'Submit Proposal'
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="contained"
                    onClick={(e) => handleNext(e)}
                    disabled={
                      isCheckingSimilarity ||
                      (activeStep === 0 &&
                        (!formik.values.title?.trim() ||
                          !formik.values.description?.trim() ||
                          !formik.values.problem_statement?.trim() ||
                          !formik.values.objectives?.trim() ||
                          !formik.values.methodology?.trim()))
                    }
                  >
                    {isCheckingSimilarity ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Checking Similarity...
                      </>
                    ) : (
                      'Next'
                    )}
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectSubmission;

