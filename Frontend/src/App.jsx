// App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './pages/auth/Login';
import MultiStepRegistration from './pages/auth/MultiStepRegistration';

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('🛡️ ProtectedRoute check:', { user, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ User authenticated, rendering children');
  return children;
};

// Role-based redirect component
const RoleBasedDashboard = () => {
  const { user } = useAuth();
  
  console.log('🎭 RoleBasedDashboard - User:', user);
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Redirect based on role
  switch(user.role) {
    case 'super_admin':
      return <Navigate to="/super_admin/dashboard" replace />;
    case 'staff':
      return <Navigate to="/staff/dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<MultiStepRegistration />} />
          
          {/* Root redirect based on role */}
          <Route path="/" element={<RoleBasedDashboard />} />
          
          {/* Protected routes with role-based paths */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/super_admin/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/staff/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Catch all - redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;