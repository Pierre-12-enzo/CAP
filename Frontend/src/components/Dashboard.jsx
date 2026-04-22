// components/Dashboard.jsx - FULLY RESPONSIVE WITH MOBILE SIDEBAR
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

// Admin Pages
import Overview from '../pages/dashboard/Overview';
import CardStudio from '../pages/dashboard/CardGeneration';
import PermissionStudio from '../pages/dashboard/PermissionStudio';
import StudentManagement from '../pages/dashboard/StudentManagement';
import TemplateManager from '../pages/dashboard/TemplateManager';
import Profile from '../pages/dashboard/Profile';
import Documentation from '../pages/dashboard/Documentation';
import StaffManagement from '../pages/dashboard/StaffManagement';
import SubscriptionManagement from '../pages/dashboard/SubscriptionManagement';

// Super Admin Pages
import SuperAdminOverview from '../pages/superadmin/Overview';
import PlansManager from '../pages/superadmin/PlansManager';
import SubscriptionsReports from '../pages/superadmin/SubscriptionsReports';
import SchoolsManager from '../pages/superadmin/SchoolsManager';
import SuperAdminSettings from '../pages/superadmin/Settings';

// Staff Pages
import StaffOverview from '../pages/staff/Overview';
import StaffCardStudio from '../pages/staff/CardStudio';
import StaffAttendance from '../pages/staff/Attendance';
import StaffStudents from '../pages/staff/Students';
import StaffPermissions from '../pages/staff/Permissions';
import StaffProfile from '../pages/staff/StaffProfile';

// Theme Toggle Component
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-xl hover:bg-emerald-50 transition-colors"
      title="Toggle theme"
    >
      <i className={`pi ${isDark ? 'pi-sun' : 'pi-moon'} text-emerald-700 text-base`}></i>
    </button>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && mobileSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, mobileSidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Get the base path based on user role
  const getBasePath = () => {
    if (user?.role === 'super_admin') return '/super_admin';
    if (user?.role === 'staff') return '/staff';
    return '/dashboard';
  };

  const basePath = getBasePath();

  useEffect(() => {
    console.log('🔥 Dashboard mounted');
    console.log('📍 Current path:', location.pathname);
    console.log('👤 User from context:', user);
    console.log('📁 Base path:', basePath);
  }, [location, user]);

  // Redirect based on role if accessing wrong dashboard
  if (user?.role === 'super_admin' && !location.pathname.startsWith('/super_admin')) {
    return <Navigate to="/super_admin/dashboard" replace />;
  }
  if (user?.role === 'staff' && !location.pathname.startsWith('/staff')) {
    return <Navigate to="/staff/dashboard" replace />;
  }
  if (user?.role === 'admin' && location.pathname.startsWith('/super_admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Get navigation items based on role
  const getNavItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { icon: 'pi-chart-line', label: 'Overview', path: '/super_admin/dashboard' },
        { icon: 'pi-box', label: 'Plans Manager', path: '/super_admin/plans' },
        { icon: 'pi-chart-pie', label: 'Subscriptions', path: '/super_admin/subscriptions' },
        { icon: 'pi-building', label: 'Schools', path: '/super_admin/schools' },
        { icon: 'pi-cog', label: 'Settings', path: '/super_admin/settings' },
        { icon: 'pi-book', label: 'Documentation', path: '/super_admin/documentation' }
      ];
    } else if (user?.role === 'staff') {
      const permissions = user?.permissions || {};
      const items = [
        { icon: 'pi-chart-line', label: 'Overview', path: '/staff/dashboard', permission: true }
      ];

      if (permissions.canViewAnalytics) {
        items.push({ icon: 'pi-chart-bar', label: 'Analytics', path: '/staff/analytics', permission: true });
      }
      if (permissions.canGenerateCards) {
        items.push({ icon: 'pi-qrcode', label: 'Card Studio', path: '/staff/card-studio', permission: true });
      }
      if (permissions.canManageStudents) {
        items.push({ icon: 'pi-users', label: 'Students', path: '/staff/students', permission: true });
      }
      if (permissions.canMarkAttendance) {
        items.push({ icon: 'pi-calendar', label: 'Attendance', path: '/staff/attendance', permission: true });
      }

      items.push({ icon: 'pi-cog', label: 'Settings', path: '/staff/settings', permission: true });
      items.push({ icon: 'pi-book', label: 'Documentation', path: '/staff/documentation', permission: true });

      return items.filter(item => item.permission);
    } else {
      // Admin
      return [
        { icon: 'pi-chart-line', label: 'Overview', path: '/dashboard' },
        { icon: 'pi-qrcode', label: 'Card Studio', path: '/dashboard/card-studio' },
        { icon: 'pi-shield', label: 'Permission Studio', path: '/dashboard/permissions' },
        { icon: 'pi-users', label: 'Students', path: '/dashboard/students' },
        { icon: 'pi-user-plus', label: 'Staff', path: '/dashboard/staff' },
        { icon: 'pi-credit-card', label: 'Subscription', path: '/dashboard/subscription' },
        { icon: 'pi-image', label: 'Templates', path: '/dashboard/templates' },
        { icon: 'pi-cog', label: 'Settings', path: '/dashboard/settings' },
        { icon: 'pi-book', label: 'Documentation', path: '/dashboard/documentation' }
      ];
    }
  };

  // Helper to check if a route is active
  const isActiveRoute = (path) => {
    if (path === '/dashboard' || path === '/super_admin/dashboard' || path === '/staff/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const navItems = getNavItems();

  // Get page title and subtitle
  const getPageTitle = () => {
    const item = navItems.find(i => isActiveRoute(i.path));
    return item?.label || 'Dashboard';
  };

  const getPageSubtitle = () => {
    const subtitles = {
      '/dashboard': 'System overview and analytics',
      '/dashboard/card-studio': 'ID card design and generation',
      '/dashboard/permissions': 'Student permission management',
      '/dashboard/students': 'Manage student records',
      '/dashboard/staff': 'Manage staff members and permissions',
      '/dashboard/subscription': 'Manage your plan and billing',
      '/dashboard/templates': 'Create and manage templates',
      '/dashboard/settings': 'System configuration and profile settings',
      '/dashboard/documentation': 'User guides and API references',
      '/super_admin/dashboard': 'Platform overview',
      '/super_admin/plans': 'Manage subscription plans',
      '/super_admin/subscriptions': 'View all subscriptions',
      '/super_admin/schools': 'Manage schools',
      '/super_admin/settings': 'System configuration',
      '/staff/dashboard': 'Your dashboard',
      '/staff/attendance': 'Mark attendance',
      '/staff/students': 'Manage students',
      '/staff/card-studio': 'Generate ID cards',
      '/staff/settings': 'Profile settings'
    };
    return subtitles[location.pathname] || 'Manage your operations';
  };

  const sidebarContent = (
    <>
      {/* Logo Section */}
      <div className="relative z-10 p-4 border-b border-emerald-200/30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-800 rounded-xl flex items-center justify-center shadow-xl shadow-emerald-500/30 transform hover:rotate-12 transition-transform duration-500">
              <i className="pi pi-id-card text-white text-sm"></i>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          {(sidebarOpen || isMobile) && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-green-800 bg-clip-text text-transparent">
                CAP_mis
              </h1>
              <p className="text-sm text-emerald-600/80 capitalize">{user?.role} Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLinkItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            to={item.path}
            active={isActiveRoute(item.path)}
            sidebarOpen={sidebarOpen || isMobile}
            onClick={() => isMobile && setMobileSidebarOpen(false)}
          />
        ))}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-emerald-200/30 flex-shrink-0 space-y-3">
        {(sidebarOpen || isMobile) ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/50">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-emerald-600 capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <i className="pi pi-sign-out text-base"></i>
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.firstName?.charAt(0)}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <i className="pi pi-sign-out text-base"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Mobile Menu Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      {!isMobile && (
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white/95 backdrop-blur-xl shadow-2xl border-r border-emerald-200/30 transition-all duration-500 ease-in-out flex flex-col fixed h-screen z-50`}>
          {sidebarContent}
        </div>
      )}

      {/* Sidebar - Mobile (Slide-out) */}
      {isMobile && (
        <div
          ref={sidebarRef}
          className={`fixed top-0 left-0 h-screen w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-emerald-200/30 transition-transform duration-300 ease-in-out flex flex-col z-50 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {sidebarContent}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-16')
        }`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-emerald-200/30 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile menu button */}
              {isMobile && (
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-2 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  <i className="pi pi-bars text-emerald-700 text-base"></i>
                </button>
              )}

              {/* Desktop sidebar toggle */}
              {!isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  <i className={`pi ${sidebarOpen ? 'pi-bars' : 'pi-arrow-right'} text-emerald-700 text-base`}></i>
                </button>
              )}

              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-700 to-green-800 bg-clip-text text-transparent truncate">
                  {getPageTitle()}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-600/80 mt-0.5 sm:mt-1 truncate">
                  {getPageSubtitle()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <ThemeToggle />
              <div className="flex items-center space-x-2">
                <div className="hidden sm:block text-right">
                  <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">Hi, {user?.firstName}!</p>
                  <p className="text-xs sm:text-sm text-emerald-600">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
                  <i className="pi pi-verified text-white text-xs sm:text-sm"></i>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Removed extra padding */}
        <main className="flex-1 overflow-auto">
          {/* Removed wrapper divs that add extra padding */}
          {user?.role === 'admin' && (
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/card-studio" element={<CardStudio />} />
              <Route path="/permissions" element={<PermissionStudio />} />
              <Route path="/students" element={<StudentManagement />} />
              <Route path="/staff" element={<StaffManagement />} />
              <Route path="/subscription" element={<SubscriptionManagement />} />
              <Route path="/templates" element={<TemplateManager />} />
              <Route path="/settings" element={<Profile />} />
              <Route path="/documentation" element={<Documentation />} />
            </Routes>
          )}

          {user?.role === 'super_admin' && (
            <Routes>
              <Route path="/" element={<SuperAdminOverview />} />
              <Route path="/plans" element={<PlansManager />} />
              <Route path="/subscriptions" element={<SubscriptionsReports />} />
              <Route path="/schools" element={<SchoolsManager />} />
              <Route path="/settings" element={<SuperAdminSettings />} />
              <Route path="/documentation" element={<Documentation />} />
            </Routes>
          )}

          {user?.role === 'staff' && (
            <Routes>
              <Route path="/" element={<StaffOverview />} />
              <Route path="/card-studio" element={<StaffCardStudio />} />
              <Route path="/attendance" element={<StaffAttendance />} />
              <Route path="/students" element={<StaffStudents />} />
              <Route path="/permissions" element={<StaffPermissions />} />
              <Route path="/settings" element={<StaffProfile />} />
              <Route path="/documentation" element={<Documentation />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

// Nav Link Item Component
const NavLinkItem = ({ icon, label, to, active, sidebarOpen, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-colors relative ${active
      ? 'bg-gradient-to-r from-emerald-600/10 to-green-700/10 text-emerald-700 border border-emerald-300/50'
      : 'text-gray-700 hover:bg-emerald-50/80 hover:text-emerald-600 border border-transparent'
      }`}
  >
    <i className={`pi ${icon} text-base ${active ? 'text-emerald-600' : 'text-gray-500'}`}></i>
    {sidebarOpen && (
      <span className={`font-semibold text-sm ${active ? 'text-emerald-700' : 'text-gray-700'}`}>
        {label}
      </span>
    )}
    {active && (
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
    )}
  </Link>
);

export default Dashboard;