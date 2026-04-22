// pages/staff/Overview.jsx - STAFF DASHBOARD
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { studentAPI, cardAPI } from '../../services/api';

const StaffOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    cardsGenerated: 0,
    pendingTasks: 0,
    recentActivity: []
  });

  useEffect(() => {
    fetchStaffData();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);

      // Fetch students count
      const studentsRes = await studentAPI.getStudents({ limit: 1 });
      const totalStudents = studentsRes.data?.total || studentsRes.total || studentsRes.length || 0;

      // Fetch cards count
      const cardsRes = await cardAPI.getCardHistory();
      const cardsGenerated = cardsRes.statistics?.totalCards || 0;

      setStats({
        totalStudents,
        cardsGenerated,
        pendingTasks: 0,
        recentActivity: [
          { action: 'Logged in', time: 'Just now', icon: 'pi-sign-in', color: 'emerald' }
        ]
      });
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's permissions
  const permissions = user?.permissions || {};

  // Permission list with details
  const permissionList = [
    { key: 'canViewAnalytics', label: 'View Analytics', icon: 'pi-chart-line', description: 'Access statistics and reports', color: 'blue' },
    { key: 'canGenerateCards', label: 'Generate Cards', icon: 'pi-id-card', description: 'Create and print ID cards', color: 'emerald' },
    { key: 'canManageStudents', label: 'Manage Students', icon: 'pi-users', description: 'Add, edit, and remove students', color: 'purple' },
    { key: 'canMarkAttendance', label: 'Mark Attendance', icon: 'pi-calendar', description: 'Record student attendance', color: 'amber' },
    { key: 'canUploadCSV', label: 'Bulk Upload', icon: 'pi-file-excel', description: 'Import data via CSV files', color: 'green' },
    { key: 'canUploadPhotos', label: 'Upload Photos', icon: 'pi-camera', description: 'Manage student photos', color: 'pink' }
  ];

  const userPermissions = permissionList.filter(p => permissions[p.key]);

  const quickActions = [];
  if (permissions.canManageStudents) quickActions.push({ label: 'Manage Students', icon: 'pi-users', path: '/staff/students', color: 'emerald' });
  if (permissions.canGenerateCards) quickActions.push({ label: 'Generate Cards', icon: 'pi-id-card', path: '/staff/card-studio', color: 'blue' });
  if (permissions.canMarkAttendance) quickActions.push({ label: 'Mark Attendance', icon: 'pi-calendar', path: '/staff/attendance', color: 'purple' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitials = () => {
    return `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold">{getInitials()}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{getGreeting()}, {user?.firstName}!</h1>
                <p className="text-emerald-200 text-sm mt-1">
                  Welcome to your staff dashboard • {time.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm inline-block backdrop-blur-sm">
                <i className="pi pi-building mr-2"></i>
                {user?.schoolId?.name || 'Your School'}
              </div>
              <p className="text-emerald-200 text-xs mt-2">
                <i className="pi pi-calendar mr-1"></i>
                {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="School"
          value={user?.schoolId?.name || 'N/A'}
          icon="pi-building"
          color="emerald"
          subtitle="Your institution"
        />
        <StatCard
          title="Your Role"
          value={user?.role?.toUpperCase() || 'STAFF'}
          icon="pi-user"
          color="blue"
          subtitle={user?.permissions ? `${Object.values(user.permissions).filter(Boolean).length} permissions` : 'Limited access'}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon="pi-users"
          color="purple"
          subtitle="Under your school"
        />
        <StatCard
          title="Cards Generated"
          value={stats.cardsGenerated}
          icon="pi-id-card"
          color="amber"
          subtitle="Total ID cards"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Permissions & Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Your Permissions Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Your Permissions</h3>
                <i className="pi pi-shield text-white text-xl"></i>
              </div>
              <p className="text-emerald-100 text-sm mt-1">
                What you can do in the system
              </p>
            </div>
            <div className="p-5 space-y-3">
              {userPermissions.length > 0 ? (
                userPermissions.map((perm) => (
                  <div key={perm.key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-${perm.color}-100`}>
                      <i className={`pi ${perm.icon} text-${perm.color}-600 text-sm`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{perm.label}</p>
                      <p className="text-xs text-gray-500">{perm.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <i className="pi pi-info-circle text-gray-400 text-3xl mb-2 block"></i>
                  <p className="text-gray-500 text-sm">No specific permissions assigned</p>
                  <p className="text-gray-400 text-xs mt-1">Contact your admin for access</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Permissions</span>
                  <span className="font-semibold text-emerald-600">{userPermissions.length} / {permissionList.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(userPermissions.length / permissionList.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl border border-emerald-200/50 p-5">
            <h3 className="font-semibold text-emerald-900 mb-4 flex items-center">
              <i className="pi pi-info-circle mr-2"></i>
              Quick Information
            </h3>
            <div className="space-y-3">
              <InfoRow label="Staff ID" value={user?.id?.slice(-8) || 'N/A'} icon="pi-id-card" />
              <InfoRow label="Username" value={`@${user?.username}`} icon="pi-user" />
              <InfoRow label="Email" value={user?.email} icon="pi-envelope" />
              <InfoRow label="Phone" value={user?.phoneNumber || 'Not provided'} icon="pi-phone" />
              <InfoRow label="Joined" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'} icon="pi-calendar" />
            </div>
          </div>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <i className="pi pi-bolt text-emerald-600 mr-2"></i>
                  Quick Actions
                </h3>
                <i className="pi pi-arrow-right text-gray-400 text-sm"></i>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-xl bg-${action.color}-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <i className={`pi ${action.icon} text-${action.color}-600 text-lg`}></i>
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <i className="pi pi-history text-emerald-600 mr-2"></i>
                Recent Activity
              </h3>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Live</span>
            </div>
            <div className="space-y-3">
              <ActivityItem
                action="Logged into your account"
                time="Just now"
                icon="pi-sign-in"
                color="emerald"
              />
              <ActivityItem
                action="Dashboard session started"
                time="Just now"
                icon="pi-desktop"
                color="blue"
              />
              <ActivityItem
                action={`Welcome back to ${user?.schoolId?.name || 'your school'}`}
                time="Now"
                icon="pi-building"
                color="purple"
              />
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-xl border border-blue-200/50 p-5">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="pi pi-question-circle text-white text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Need Help?</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Contact your school administrator for assistance with permissions or access issues.
                </p>
                <div className="mt-3 flex items-center space-x-3">
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    <i className="pi pi-envelope mr-1"></i>
                    {user?.schoolId?.email || 'admin@school.com'}
                  </span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    <i className="pi pi-book mr-1"></i>
                    Documentation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600'
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-5 group hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <i className={`pi ${icon} text-white text-base`}></i>
        </div>
        <i className="pi pi-ellipsis-h text-gray-400 text-sm"></i>
      </div>
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

// Info Row Component
const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-2 border-b border-emerald-100 last:border-0">
    <div className="flex items-center space-x-2">
      <i className={`pi ${icon} text-emerald-500 text-sm w-5`}></i>
      <span className="text-sm text-emerald-800">{label}</span>
    </div>
    <span className="text-sm font-medium text-gray-900 truncate ml-4">{value}</span>
  </div>
);

// Activity Item Component
const ActivityItem = ({ action, time, icon, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-white transition-all duration-300">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
        <i className={`pi ${icon} text-sm`}></i>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{action}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
    </div>
  );
};

export default StaffOverview;