import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  alpha,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  RateReview as ReviewIcon,
  Groups as GroupsIcon,
  Grade as GradeIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { dashboardAPI } from '../../services/api';
import { LecturerDashboard as LecturerDashboardType } from '../../types';

const LecturerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery<LecturerDashboardType>({
    queryKey: ['lecturerDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getLecturerDashboard();
      return response.data.data;
    },
  });

  // Download handler
  const handleDownload = async (filePath: string, fileName?: string, studentName?: string, submissionType?: string) => {
    if (!filePath) return;
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      // Clean the file path - remove 'uploads/' prefix if present
      let cleanPath = filePath;
      if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.replace('uploads/', '');
      }
      if (cleanPath.startsWith('uploads\\')) {
        cleanPath = cleanPath.replace('uploads\\', '');
      }
      // Remove leading/trailing slashes
      cleanPath = cleanPath.replace(/^\/+|\\+|(\/|\\)+$/g, '');
      
      // Create the download URL (use proxy path)
      const downloadUrl = `/api/uploads/${cleanPath}`;
      
      // Generate a better filename if we have student name and submission type
      let downloadFileName = fileName || filePath.split('/').pop() || 'document.pdf';
      if (studentName && submissionType) {
        const safeName = studentName.replace(/\s+/g, '_');
        const extension = downloadFileName.split('.').pop() || 'pdf';
        downloadFileName = `${safeName}_${submissionType}.${extension}`;
      }
      
      // Fetch the file with authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create a temporary URL and download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Lecturer Dashboard
        </Typography>
        <Typography color="text.secondary">
          Academic Year: {dashboard?.academicYear?.year || 'N/A'}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/lecturer/review')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <ReviewIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pending Reviews
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.pendingReviews || 0}
                  </Typography>
                </Box>
              </Box>
              <Button size="small" color="primary">
                Review Now →
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/lecturer/supervisees')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <GroupsIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Supervisees
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.supervisedStudents || 0}/{dashboard?.maxCapacity || 10}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Supervision capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/lecturer/grade')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <GradeIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pending Grading
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.pendingGrading || 0}
                  </Typography>
                </Box>
              </Box>
              <Button size="small" color="primary">
                Grade Now →
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <EventIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Upcoming Presentations
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {dashboard?.upcomingPresentations?.length || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Projects for Review */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Projects Awaiting Review
                </Typography>
                <Button size="small" onClick={() => navigate('/lecturer/review')}>
                  View All
                </Button>
              </Box>

              {dashboard?.projectsForReview && dashboard.projectsForReview.length > 0 ? (
                <List disablePadding>
                  {dashboard.projectsForReview.slice(0, 5).map((project) => (
                    <ListItem
                      key={project.id}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        mb: 1,
                        background: alpha('#ffffff', 0.03),
                        cursor: 'pointer',
                        '&:hover': {
                          background: alpha('#ffffff', 0.06),
                        },
                      }}
                      onClick={() => navigate('/lecturer/review')}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                          {project.student_first_name?.[0]}{project.student_last_name?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={project.title}
                        secondary={`${project.student_first_name} ${project.student_last_name}`}
                        primaryTypographyProps={{ fontWeight: 500, noWrap: true }}
                      />
                      <Chip
                        label="Review"
                        size="small"
                        color="warning"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No projects pending review
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Submissions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Submissions
                </Typography>
                <Button size="small" onClick={() => navigate('/lecturer/grade')}>
                  View All
                </Button>
              </Box>

              {dashboard?.recentSubmissions && dashboard.recentSubmissions.length > 0 ? (
                <List disablePadding>
                  {dashboard.recentSubmissions.slice(0, 5).map((submission) => (
                    <ListItem
                      key={submission.id}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        mb: 1,
                        background: alpha('#ffffff', 0.03),
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ background: alpha('#22c55e', 0.2), color: '#22c55e' }}>
                          <AssignmentIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={submission.project_title}
                        secondary={
                          <>
                            {submission.student_first_name} {submission.student_last_name} •{' '}
                            {submission.submission_type}
                          </>
                        }
                        primaryTypographyProps={{ fontWeight: 500, noWrap: true }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {submission.submitted_at
                            ? formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })
                            : ''}
                        </Typography>
                        {submission.file_path && (
                          <Tooltip title="Download Document">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(
                                  submission.file_path,
                                  submission.file_name,
                                  `${submission.student_first_name}_${submission.student_last_name}`,
                                  submission.submission_type
                                );
                              }}
                              sx={{ ml: 1 }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No recent submissions
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Supervisees List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                My Supervisees
              </Typography>

              {dashboard?.supervisees && dashboard.supervisees.length > 0 ? (
                <Grid container spacing={2}>
                  {dashboard.supervisees.map((student) => (
                    <Grid item xs={12} sm={6} md={4} key={student.id}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: alpha('#ffffff', 0.03),
                          border: `1px solid ${alpha('#ffffff', 0.08)}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                            {student.first_name[0]}{student.last_name[0]}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600 }}>
                              {student.first_name} {student.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.student_id}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                          {student.project_title}
                        </Typography>
                        <Chip
                          label={student.project_status.replace(/_/g, ' ')}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No supervisees yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LecturerDashboard;

