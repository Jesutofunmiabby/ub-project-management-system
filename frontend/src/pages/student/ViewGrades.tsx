import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  CircularProgress,
  Paper,
  Divider,
  alpha,
  Chip,
  Alert,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Slideshow as PresentationIcon,
  ManageAccounts as ManagementIcon,
  MenuBook as FinalIcon,
} from '@mui/icons-material';
import { dashboardAPI } from '../../services/api';

interface StudentDashboard {
  project: {
    id: string;
    title: string;
    status: string;
  } | null;
  submissions: Array<{
    id: string;
    submission_type: string;
    status: string;
    marks: number | null;
    max_marks: number;
    feedback: string | null;
    graded_at: string | null;
  }>;
}

const gradeInfo: Record<string, { title: string; maxMarks: number; color: string; icon: React.ReactNode; category: string }> = {
  alpha: {
    title: 'Alpha Submission',
    maxMarks: 6,
    color: '#3b82f6',
    icon: <AssignmentIcon />,
    category: 'CA',
  },
  beta: {
    title: 'Beta Submission',
    maxMarks: 4,
    color: '#8b5cf6',
    icon: <AssignmentIcon />,
    category: 'CA',
  },
  presentation: {
    title: 'Presentation',
    maxMarks: 20,
    color: '#f59e0b',
    icon: <PresentationIcon />,
    category: 'CA',
  },
  project_management: {
    title: 'Project Management',
    maxMarks: 10,
    color: '#10b981',
    icon: <ManagementIcon />,
    category: 'CA',
  },
  final: {
    title: 'Final Documentation',
    maxMarks: 60,
    color: '#ef4444',
    icon: <FinalIcon />,
    category: 'Exam',
  },
};

const ViewGrades: React.FC = () => {
  const { data: dashboard, isLoading } = useQuery<StudentDashboard>({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard?.project) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          View My Grades
        </Typography>
        <Alert severity="info">
          You don't have an active project yet. Your grades will appear here once you have a project.
        </Alert>
      </Box>
    );
  }

  // Calculate totals
  const caSubmissions = dashboard.submissions?.filter((s) => 
    ['alpha', 'beta', 'presentation', 'project_management'].includes(s.submission_type)
  ) || [];
  
  const finalSubmission = dashboard.submissions?.find((s) => s.submission_type === 'final');

  const caTotal = caSubmissions.reduce((sum, s) => sum + (s.marks || 0), 0);
  const caMaxTotal = 40;
  const finalMarks = finalSubmission?.marks || 0;
  const finalMaxTotal = 60;
  const grandTotal = caTotal + finalMarks;
  const grandMaxTotal = 100;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 70) return '#10b981';
    if (percentage >= 60) return '#3b82f6';
    if (percentage >= 50) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const hasAnyGrades = dashboard.submissions?.some((s) => s.marks !== null && s.marks !== undefined);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        View My Grades
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Track your academic performance across all submission types
      </Typography>

      {!hasAnyGrades && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You don't have any grades yet. Your grades will appear here once your submissions have been graded by your supervisor.
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* CA Total */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.15)} 0%, ${alpha('#8b5cf6', 0.15)} 100%)`,
              border: `1px solid ${alpha('#3b82f6', 0.3)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#3b82f6', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {caTotal} / {caMaxTotal}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Continuous Assessment (CA)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(caTotal / caMaxTotal) * 100}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  background: alpha('#3b82f6', 0.2),
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: 4,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Final Exam */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#ef4444', 0.15)} 0%, ${alpha('#f97316', 0.15)} 100%)`,
              border: `1px solid ${alpha('#ef4444', 0.3)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <FinalIcon sx={{ fontSize: 40, color: '#ef4444', mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {finalMarks} / {finalMaxTotal}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Final Documentation
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(finalMarks / finalMaxTotal) * 100}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  background: alpha('#ef4444', 0.2),
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)',
                    borderRadius: 4,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Grand Total */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#10b981', 0.15)} 0%, ${alpha('#059669', 0.15)} 100%)`,
              border: `1px solid ${alpha('#10b981', 0.3)}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <TrophyIcon sx={{ fontSize: 40, color: getGradeColor((grandTotal / grandMaxTotal) * 100), mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700, color: getGradeColor((grandTotal / grandMaxTotal) * 100) }}>
                {grandTotal} / {grandMaxTotal}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" color="text.secondary">
                  Total Score
                </Typography>
                <Chip
                  label={`Grade: ${getGradeLetter((grandTotal / grandMaxTotal) * 100)}`}
                  sx={{
                    background: alpha(getGradeColor((grandTotal / grandMaxTotal) * 100), 0.2),
                    color: getGradeColor((grandTotal / grandMaxTotal) * 100),
                    fontWeight: 700,
                  }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={(grandTotal / grandMaxTotal) * 100}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  background: alpha('#10b981', 0.2),
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${getGradeColor((grandTotal / grandMaxTotal) * 100)} 0%, ${alpha(getGradeColor((grandTotal / grandMaxTotal) * 100), 0.7)} 100%)`,
                    borderRadius: 4,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Grade Breakdown */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Grade Breakdown
      </Typography>

      {/* CA Components */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: alpha('#ffffff', 0.03),
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#3b82f6' }}>
          Continuous Assessment (CA) - 40 Marks
        </Typography>
        <Grid container spacing={2}>
          {['alpha', 'beta', 'presentation', 'project_management'].map((type) => {
            const submission = dashboard.submissions?.find((s) => s.submission_type === type);
            const info = gradeInfo[type];
            const marks = submission?.marks;
            const hasGrade = marks !== null && marks !== undefined;
            const percentage = hasGrade ? (marks / info.maxMarks) * 100 : 0;

            return (
              <Grid item xs={12} sm={6} key={type}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: alpha(info.color, 0.05),
                    border: `1px solid ${alpha(info.color, 0.2)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        background: alpha(info.color, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: info.color,
                      }}
                    >
                      {info.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {info.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Max: {info.maxMarks} marks
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: hasGrade ? info.color : 'text.secondary',
                      }}
                    >
                      {hasGrade ? marks : '-'} / {info.maxMarks}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      background: alpha(info.color, 0.15),
                      '& .MuiLinearProgress-bar': {
                        background: info.color,
                        borderRadius: 3,
                      },
                    }}
                  />
                  {submission?.feedback && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                      Feedback: {submission.feedback}
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Final Component */}
      <Paper
        sx={{
          p: 3,
          background: alpha('#ffffff', 0.03),
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#ef4444' }}>
          Final Documentation - 60 Marks
        </Typography>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: alpha('#ef4444', 0.05),
            border: `1px solid ${alpha('#ef4444', 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                background: alpha('#ef4444', 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <FinalIcon />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Final Documentation
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Comprehensive final report and documentation
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: finalSubmission?.marks !== null && finalSubmission?.marks !== undefined ? '#ef4444' : 'text.secondary',
              }}
            >
              {finalSubmission?.marks !== null && finalSubmission?.marks !== undefined ? finalSubmission.marks : '-'} / 60
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={finalSubmission?.marks ? (finalSubmission.marks / 60) * 100 : 0}
            sx={{
              height: 6,
              borderRadius: 3,
              background: alpha('#ef4444', 0.15),
              '& .MuiLinearProgress-bar': {
                background: '#ef4444',
                borderRadius: 3,
              },
            }}
          />
          {finalSubmission?.feedback && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              Feedback: {finalSubmission.feedback}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Grade Scale */}
      <Paper
        sx={{
          p: 3,
          mt: 4,
          background: alpha('#ffffff', 0.03),
          border: `1px solid ${alpha('#ffffff', 0.08)}`,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Grade Scale
        </Typography>
        <Grid container spacing={2}>
          {[
            { grade: 'A', range: '70-100%', color: '#10b981' },
            { grade: 'B', range: '60-69%', color: '#3b82f6' },
            { grade: 'C', range: '50-59%', color: '#f59e0b' },
            { grade: 'D', range: '45-49%', color: '#f97316' },
            { grade: 'E', range: '40-44%', color: '#ef4444' },
            { grade: 'F', range: '0-39%', color: '#dc2626' },
          ].map((item) => (
            <Grid item xs={6} sm={4} md={2} key={item.grade}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: alpha(item.color, 0.1),
                  border: `1px solid ${alpha(item.color, 0.3)}`,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, color: item.color }}>
                  {item.grade}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.range}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ViewGrades;

