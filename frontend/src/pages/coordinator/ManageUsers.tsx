import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { coordinatorAPI } from '../../services/api';
import { User, PaginatedResponse } from '../../types';

interface UserFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  student_id: string;
  department: string;
  phone: string;
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'student',
  student_id: '',
  department: '',
  phone: '',
};

const departments = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Mathematics',
  'Physics',
  'Chemistry',
];

const ManageUsers: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page, rowsPerPage, search, roleFilter],
    queryFn: async () => {
      const response = await coordinatorAPI.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      return response.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => coordinatorAPI.toggleUserStatus(userId),
    onSuccess: () => {
      enqueueSnackbar('User status updated', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update status', { variant: 'error' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => coordinatorAPI.createUser(data),
    onSuccess: () => {
      enqueueSnackbar('User created successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseCreateDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to create user', { variant: 'error' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserFormData> }) =>
      coordinatorAPI.updateUser(userId, data),
    onSuccess: () => {
      enqueueSnackbar('User updated successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseEditDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to update user', { variant: 'error' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => coordinatorAPI.deleteUser(userId),
    onSuccess: () => {
      enqueueSnackbar('User deleted successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseDeleteDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message || 'Failed to delete user', { variant: 'error' });
    },
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFormChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = (isCreate: boolean = true): boolean => {
    const errors: Partial<UserFormData> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (isCreate && !formData.password) {
      errors.password = 'Password is required';
    } else if (isCreate && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.first_name) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name) {
      errors.last_name = 'Last name is required';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    if (formData.role === 'student' && !formData.student_id) {
      errors.student_id = 'Student ID is required for students';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Dialog
  const handleOpenCreateDialog = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleCreateUser = () => {
    if (validateForm(true)) {
      createUserMutation.mutate(formData);
    }
  };

  // View Dialog
  const handleOpenViewDialog = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedUser(null);
  };

  // Edit Dialog
  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      student_id: user.student_id || '',
      department: user.department || '',
      phone: user.phone || '',
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleUpdateUser = () => {
    if (validateForm(false) && selectedUser) {
      const updateData: Partial<UserFormData> = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateUserMutation.mutate({ userId: selectedUser.id, data: updateData });
    }
  };

  // Delete Dialog
  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const getRoleColor = (role: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (role) {
      case 'coordinator':
        return 'error';
      case 'lecturer':
        return 'primary';
      case 'student':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Manage Users
          </Typography>
          <Typography color="text.secondary">
            View and manage all system users
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
          sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          }}
        >
          Add New User
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="lecturer">Lecturer</MenuItem>
              <MenuItem value="coordinator">Coordinator</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>
                        {user.first_name} {user.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={getRoleColor(user.role)}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{user.student_id || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={user.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenViewDialog(user)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit User">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditDialog(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() => toggleStatusMutation.mutate(user.id)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {user.is_active ? (
                              <BlockIcon sx={{ color: 'warning.main' }} />
                            ) : (
                              <ActiveIcon sx={{ color: 'success.main' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDeleteDialog(user)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data?.pagination.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Add New User
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                error={!!formErrors.first_name}
                helperText={formErrors.first_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                error={!!formErrors.last_name}
                helperText={formErrors.last_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!formErrors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => handleFormChange('role', e.target.value)}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="lecturer">Lecturer</MenuItem>
                  <MenuItem value="coordinator">Coordinator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  label="Department"
                  onChange={(e) => handleFormChange('department', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.role === 'student' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Student ID"
                  value={formData.student_id}
                  onChange={(e) => handleFormChange('student_id', e.target.value)}
                  error={!!formErrors.student_id}
                  helperText={formErrors.student_id}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={createUserMutation.isPending}
          >
            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          User Details
          <IconButton onClick={handleCloseViewDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{selectedUser.email}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Role
                </Typography>
                <Chip
                  label={selectedUser.role}
                  size="small"
                  color={getRoleColor(selectedUser.role)}
                  sx={{ textTransform: 'capitalize', mt: 0.5 }}
                />
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Department
                </Typography>
                <Typography variant="body1">{selectedUser.department || 'Not specified'}</Typography>
              </Box>
              {selectedUser.role === 'student' && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Student ID
                    </Typography>
                    <Typography variant="body1">{selectedUser.student_id || 'Not specified'}</Typography>
                  </Box>
                </>
              )}
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">{selectedUser.phone || 'Not specified'}</Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedUser.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={selectedUser.is_active ? 'success' : 'error'}
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              handleCloseViewDialog();
              if (selectedUser) handleOpenEditDialog(selectedUser);
            }}
          >
            Edit User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Edit User
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            Leave the password field empty to keep the current password.
          </Alert>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                error={!!formErrors.first_name}
                helperText={formErrors.first_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                error={!!formErrors.last_name}
                helperText={formErrors.last_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Password (optional)"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password || 'Leave empty to keep current password'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!formErrors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => handleFormChange('role', e.target.value)}
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="lecturer">Lecturer</MenuItem>
                  <MenuItem value="coordinator">Coordinator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  label="Department"
                  onChange={(e) => handleFormChange('department', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.role === 'student' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Student ID"
                  value={formData.student_id}
                  onChange={(e) => handleFormChange('student_id', e.target.value)}
                  error={!!formErrors.student_id}
                  helperText={formErrors.student_id}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateUser}
            disabled={updateUserMutation.isPending}
          >
            {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
          Delete User
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The user will be permanently deleted from the system.
          </Alert>
          {selectedUser && (
            <Typography>
              Are you sure you want to delete{' '}
              <strong>
                {selectedUser.first_name} {selectedUser.last_name}
              </strong>{' '}
              ({selectedUser.email})?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageUsers;
