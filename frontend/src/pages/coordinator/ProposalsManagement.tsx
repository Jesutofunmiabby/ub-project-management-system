import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Alert,
  Tooltip,
  InputAdornment,
  TablePagination,
  Collapse,
  Divider,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Send as SendIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  CheckBox as CheckBoxIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { projectsAPI, coordinatorAPI, gradesAPI } from '../../services/api';
import { Project } from '../../types';

interface ProjectWithDetails extends Project {
  student_first_name: string;
  student_last_name: string;
  student_matric: string;
  student_email: string;
  supervisor_first_name?: string;
  supervisor_last_name?: string;
  grades?: {
    alpha?: { marks: number; max_marks: number; is_published: boolean; updated_at: string };
    beta?: { marks: number; max_marks: number; is_published: boolean; updated_at: string };
    final?: { marks: number; max_marks: number; is_published: boolean; updated_at: string };
    project_management?: { marks: number; max_marks: number; is_published: boolean; updated_at: string };
    presentation?: { marks: number; max_marks: number; is_published: boolean; updated_at: string };
  };
  similarity?: {
    maxSimilarity: number;
    similarProjects?: Array<{
      id: string;
      title: string;
      similarity: number;
      created_at: string;
    }>;
  };
}

interface Lecturer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  max_students: number;
  current_students: number;
  is_available: boolean;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  approved_with_modifications: 'warning',
  rejected: 'error',
  in_progress: 'primary',
  completed: 'success',
};

const ProposalsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  // Fetch all projects with grades
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['assessmentProjects', page, rowsPerPage, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await coordinatorAPI.getProjectsWithGrades(params);
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds to get updated grades
  });

  // Fetch available lecturers
  const { data: lecturersData } = useQuery<{ success: boolean; data: Lecturer[] }>({
    queryKey: ['availableLecturers'],
    queryFn: async () => {
      const response = await projectsAPI.getAvailableLecturers();
      return response.data;
    },
  });

  // Forward/Assign supervisor mutation
  const forwardMutation = useMutation({
    mutationFn: async ({ projectId, supervisorId }: { projectId: string; supervisorId: string }) => {
      return coordinatorAPI.assignSupervisor(projectId, supervisorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessmentProjects'] });
      setForwardDialogOpen(false);
      setSelectedProject(null);
      setSelectedLecturer('');
    },
  });

  // Reveal grades mutation
  const revealGradesMutation = useMutation({
    mutationFn: async ({ projectIds, submissionType }: { projectIds: string[]; submissionType?: string }) => {
      return gradesAPI.publish(projectIds, submissionType);
    },
    onSuccess: (data) => {
      enqueueSnackbar(data.data.message || 'Grades revealed successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['assessmentProjects'] });
      setSelectedProjects(new Set());
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to reveal grades', { variant: 'error' });
    },
  });

  const projects = projectsData?.data as ProjectWithDetails[] || [];
  const pagination = projectsData?.pagination;
  const lecturers = lecturersData?.data || [];

  // Debug: Log projects with grades
  React.useEffect(() => {
    if (projects.length > 0) {
      console.log('Projects loaded:', projects.length);
      console.log('Sample project with grades:', projects[0]?.grades);
    }
  }, [projects]);

  const filteredProjects = projects.filter(project => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      project.title.toLowerCase().includes(searchLower) ||
      project.student_first_name?.toLowerCase().includes(searchLower) ||
      project.student_last_name?.toLowerCase().includes(searchLower) ||
      project.student_matric?.toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (project: ProjectWithDetails) => {
    setSelectedProject(project);
    setDetailsOpen(true);
  };

  const handleForward = (project: ProjectWithDetails) => {
    setSelectedProject(project);
    // Pre-select current supervisor if reassigning
    setSelectedLecturer(project.supervisor_id || '');
    setForwardDialogOpen(true);
  };

  const handleConfirmForward = () => {
    if (selectedProject && selectedLecturer) {
      forwardMutation.mutate({
        projectId: selectedProject.id,
        supervisorId: selectedLecturer,
      });
    }
  };

  const toggleRowExpand = (projectId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatGrade = (grade: { marks: number; max_marks: number; is_published: boolean } | undefined) => {
    if (!grade) return '-';
    const marks = typeof grade.marks === 'number' ? grade.marks : parseFloat(String(grade.marks)) || 0;
    const maxMarks = typeof grade.max_marks === 'number' ? grade.max_marks : parseFloat(String(grade.max_marks)) || 0;
    if (isNaN(marks) || isNaN(maxMarks)) return '-';
    return `${marks.toFixed(2)}/${maxMarks}`;
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleRevealSelected = () => {
    if (selectedProjects.size === 0) {
      enqueueSnackbar('Please select at least one project', { variant: 'warning' });
      return;
    }
    revealGradesMutation.mutate({ projectIds: Array.from(selectedProjects) });
  };

  const handleRevealIndividual = (projectId: string) => {
    revealGradesMutation.mutate({ projectIds: [projectId] });
  };

  if (loadingProjects) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          Assessment
        </Typography>
        <Card>
          <CardContent>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={60} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Assessment
          </Typography>
          <Typography color="text.secondary">
            View and manage all student projects with grades
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {selectedProjects.size > 0 && (
            <>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={handleRevealSelected}
                disabled={revealGradesMutation.isPending}
                color="success"
              >
                Reveal Grades ({selectedProjects.size})
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedProjects(new Set())}
              >
                Clear Selection
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<CheckBoxIcon />}
            onClick={handleSelectAll}
            color="primary"
          >
            {selectedProjects.size === filteredProjects.length ? 'Deselect All' : 'Select All'}
          </Button>
        </Stack>
      </Box>

      {/* Similarity Alerts Summary */}
      {filteredProjects.filter(p => p.similarity && p.similarity.maxSimilarity >= 30).length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          icon={<WarningIcon />}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Similarity Alert: {filteredProjects.filter(p => p.similarity && p.similarity.maxSimilarity >= 30).length} project(s) have similar proposals
          </Typography>
          <Typography variant="body2">
            Projects with 30%+ similarity are flagged below. Review them carefully to identify potential duplicates. The submission time is shown to help apply first-come, first-serve policy.
          </Typography>
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by title, student name, or matric..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="approved_with_modifications">Needs Modifications</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell width={50}>
                  <Checkbox
                    indeterminate={selectedProjects.size > 0 && selectedProjects.size < filteredProjects.length}
                    checked={filteredProjects.length > 0 && selectedProjects.size === filteredProjects.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell width={50}></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Project Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Matric Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Supervisor</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Alpha</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Beta</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Final</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Program Management</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Presentation</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      No project proposals found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <React.Fragment key={project.id}>
                    <TableRow hover>
                      <TableCell>
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          onChange={() => handleSelectProject(project.id)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpand(project.id)}
                        >
                          {expandedRows.has(project.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 500 }}>
                            {project.title}
                          </Typography>
                          {project.similarity && project.similarity.maxSimilarity >= 30 && (
                            <Tooltip 
                              title={
                                <Box>
                                  <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                    Similarity Alert ({project.similarity.maxSimilarity}% match)
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                    Similar projects:
                                  </Typography>
                                  {project.similarity.similarProjects?.map((similar) => (
                                    <Typography key={similar.id} variant="caption" sx={{ display: 'block' }}>
                                      • {similar.title} ({similar.similarity}%)
                                    </Typography>
                                  ))}
                                </Box>
                              }
                            >
                              <Chip 
                                label={`${project.similarity.maxSimilarity}% similar`}
                                size="small"
                                color={project.similarity.maxSimilarity >= 70 ? 'error' : project.similarity.maxSimilarity >= 50 ? 'warning' : 'info'}
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {project.student_first_name} {project.student_last_name}
                      </TableCell>
                      <TableCell>{project.student_matric}</TableCell>
                      <TableCell>
                        <Chip
                          label={project.status.replace(/_/g, ' ')}
                          color={statusColors[project.status] || 'default'}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        {project.supervisor_first_name ? (
                          `${project.supervisor_first_name} ${project.supervisor_last_name}`
                        ) : (
                          <Typography color="text.secondary" variant="body2">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {project.grades?.alpha ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatGrade(project.grades.alpha)}
                            </Typography>
                            {!project.grades.alpha.is_published && (
                              <Chip label="Hidden" size="small" color="warning" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {project.grades?.beta ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatGrade(project.grades.beta)}
                            </Typography>
                            {!project.grades.beta.is_published && (
                              <Chip label="Hidden" size="small" color="warning" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {project.grades?.final ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatGrade(project.grades.final)}
                            </Typography>
                            {!project.grades.final.is_published && (
                              <Chip label="Hidden" size="small" color="warning" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {project.grades?.project_management ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatGrade(project.grades.project_management)}
                            </Typography>
                            {!project.grades.project_management.is_published && (
                              <Chip label="Hidden" size="small" color="warning" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {project.grades?.presentation ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatGrade(project.grades.presentation)}
                            </Typography>
                            {!project.grades.presentation.is_published && (
                              <Chip label="Hidden" size="small" color="warning" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(project.created_at)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleViewDetails(project)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {['submitted', 'under_review', 'approved', 'approved_with_modifications', 'in_progress'].includes(project.status) && (
                            <Tooltip title={project.supervisor_id ? "Reassign Supervisor" : "Assign Supervisor"}>
                              <IconButton
                                color={project.supervisor_id ? "warning" : "secondary"}
                                size="small"
                                onClick={() => handleForward(project)}
                              >
                                <SendIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(project.grades?.alpha || project.grades?.beta || project.grades?.final || 
                            project.grades?.project_management || project.grades?.presentation) && (
                            <Tooltip title="Reveal Grades to Student">
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleRevealIndividual(project.id)}
                                disabled={revealGradesMutation.isPending}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={15} sx={{ py: 0 }}>
                        <Collapse in={expandedRows.has(project.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 4, backgroundColor: 'action.hover' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                              Description:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {project.description || 'No description provided'}
                            </Typography>
                            {project.problem_statement && (
                              <>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                  Problem Statement:
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {project.problem_statement}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination?.total || 0}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Project Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedProject && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Project Title
                </Typography>
                <Typography variant="h6">{selectedProject.title}</Typography>
              </Box>

              <Divider />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Student Name
                  </Typography>
                  <Typography>
                    {selectedProject.student_first_name} {selectedProject.student_last_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Matric Number
                  </Typography>
                  <Typography>{selectedProject.student_matric}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography>{selectedProject.student_email}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedProject.status.replace(/_/g, ' ')}
                    color={statusColors[selectedProject.status] || 'default'}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Typography>{selectedProject.description || 'No description provided'}</Typography>
              </Box>

              {selectedProject.problem_statement && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Problem Statement
                  </Typography>
                  <Typography>{selectedProject.problem_statement}</Typography>
                </Box>
              )}

              {selectedProject.objectives && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Objectives
                  </Typography>
                  <Typography style={{ whiteSpace: 'pre-line' }}>{selectedProject.objectives}</Typography>
                </Box>
              )}

              {selectedProject.methodology && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Methodology
                  </Typography>
                  <Typography style={{ whiteSpace: 'pre-line' }}>{selectedProject.methodology}</Typography>
                </Box>
              )}

              {selectedProject.supervisor_first_name && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Assigned Supervisor
                    </Typography>
                    <Typography>
                      {selectedProject.supervisor_first_name} {selectedProject.supervisor_last_name}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          {selectedProject && ['submitted', 'under_review', 'approved', 'approved_with_modifications', 'in_progress'].includes(selectedProject.status) && (
            <Button
              variant={selectedProject.supervisor_id ? "outlined" : "contained"}
              color={selectedProject.supervisor_id ? "warning" : "primary"}
              startIcon={<PersonAddIcon />}
              onClick={() => {
                setDetailsOpen(false);
                handleForward(selectedProject);
              }}
            >
              {selectedProject.supervisor_id ? 'Reassign Supervisor' : 'Assign Supervisor'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Forward to Lecturer Dialog */}
      <Dialog
        open={forwardDialogOpen}
        onClose={() => {
          setForwardDialogOpen(false);
          setSelectedLecturer('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedProject?.supervisor_id ? 'Reassign Supervisor' : 'Assign Supervisor'}
        </DialogTitle>
        <DialogContent>
          <Alert severity={selectedProject?.supervisor_id ? "warning" : "info"} sx={{ mb: 3 }}>
            {selectedProject?.supervisor_id 
              ? `This project currently has ${selectedProject.supervisor_first_name} ${selectedProject.supervisor_last_name} as supervisor. Select a different lecturer to reassign.`
              : 'Select a lecturer to assign as the supervisor for this project. The lecturer will receive a notification and can then review and approve the proposal.'}
          </Alert>
          
          {selectedProject && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Project
              </Typography>
              <Typography sx={{ fontWeight: 500 }}>{selectedProject.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                by {selectedProject.student_first_name} {selectedProject.student_last_name}
              </Typography>
              {selectedProject.supervisor_first_name && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="warning.dark" sx={{ fontWeight: 600 }}>
                    Current Supervisor
                  </Typography>
                  <Typography variant="body2">
                    {selectedProject.supervisor_first_name} {selectedProject.supervisor_last_name}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <FormControl fullWidth>
            <InputLabel>Select Lecturer</InputLabel>
            <Select
              value={selectedLecturer}
              label="Select Lecturer"
              onChange={(e) => setSelectedLecturer(e.target.value)}
            >
              {lecturers.map((lecturer) => (
                <MenuItem key={lecturer.id} value={lecturer.id}>
                  <Box>
                    <Typography>
                      {lecturer.first_name} {lecturer.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {lecturer.department} • {lecturer.current_students}/{lecturer.max_students} students
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmForward}
            disabled={!selectedLecturer || forwardMutation.isPending || selectedLecturer === selectedProject?.supervisor_id}
            startIcon={<SendIcon />}
          >
            {forwardMutation.isPending 
              ? (selectedProject?.supervisor_id ? 'Reassigning...' : 'Assigning...') 
              : (selectedProject?.supervisor_id ? 'Reassign Supervisor' : 'Assign Supervisor')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProposalsManagement;

