import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Home Page
import HomePage from './pages/HomePage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ProjectSubmission from './pages/student/ProjectSubmission';
import MyProject from './pages/student/MyProject';
import SubmitDocument from './pages/student/SubmitDocument';
import Submission from './pages/student/Submission';
import ViewGrades from './pages/student/ViewGrades';

// Lecturer Pages
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import ReviewProjects from './pages/lecturer/ReviewProjects';
import Supervisees from './pages/lecturer/Supervisees';
import GradeSubmissions from './pages/lecturer/GradeSubmissions';

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import ManageUsers from './pages/coordinator/ManageUsers';
import AcademicYearConfig from './pages/coordinator/AcademicYearConfig';
import SystemReports from './pages/coordinator/SystemReports';
import ProposalsManagement from './pages/coordinator/ProposalsManagement';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Shared Pages
import MessagesPage from './pages/shared/MessagesPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ProfilePage from './pages/shared/ProfilePage';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'lecturer':
        return <Navigate to="/lecturer/dashboard" replace />;
      case 'coordinator':
        return <Navigate to="/coordinator/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated && user) {
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'lecturer':
        return <Navigate to="/lecturer/dashboard" replace />;
      case 'coordinator':
        return <Navigate to="/coordinator/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
      </Route>

      {/* Protected Routes with MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/submit-project"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProjectSubmission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/my-project"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/submit-document/:type"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <SubmitDocument />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/submission"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <Submission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/grades"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ViewGrades />
            </ProtectedRoute>
          }
        />

        {/* Lecturer Routes */}
        <Route
          path="/lecturer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['lecturer']}>
              <LecturerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/review"
          element={
            <ProtectedRoute allowedRoles={['lecturer']}>
              <ReviewProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/supervisees"
          element={
            <ProtectedRoute allowedRoles={['lecturer']}>
              <Supervisees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/grade"
          element={
            <ProtectedRoute allowedRoles={['lecturer']}>
              <GradeSubmissions />
            </ProtectedRoute>
          }
        />

        {/* Coordinator Routes */}
        <Route
          path="/coordinator/dashboard"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/users"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/academic-year"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <AcademicYearConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/reports"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <SystemReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/proposals"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <ProposalsManagement />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Shared Routes */}
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Home Page */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate
              to={
                user.role === 'student'
                  ? '/student/dashboard'
                  : user.role === 'lecturer'
                  ? '/lecturer/dashboard'
                  : user.role === 'coordinator'
                  ? '/coordinator/dashboard'
                  : '/admin/dashboard'
              }
              replace
            />
          ) : (
            <HomePage />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

