// components/dashboard/Profile.jsx - CINEMATIC PROFILE
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, studentAPI, permissionAPI } from '../../services/api';

const Profile = () => {
  const { user, logout, updateUser } = useAuth(); // Removed updateUser since it doesn't exist
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // User profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    institution: '',
    role: '',
    notifications: {
      email: true,
      system: true,
      security: true
    }
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    compressionQuality: 85,
    maxFileSize: 10,
    retentionPeriod: 30,
    theme: 'emerald',
    language: 'en'
  });

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        institution: user.institution || 'CAP_mis Institution',
        role: user.role || 'admin'
      }));
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus('saving');

    try {
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        username: profileData.username,
        institution: profileData.institution
      };

      const response = await authAPI.updateProfile(updateData);
      
      //UPDATE THE SESSION
      if(response.user) {
        updateUser(response.user)
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (profileData.newPassword !== profileData.confirmPassword) {
      setSaveStatus('password_mismatch');
      setLoading(false);
      return;
    }

    if (profileData.newPassword.length < 8) {
      setSaveStatus('password_weak');
      setLoading(false);
      return;
    }

    try {
      const passwordData = {
        currentPassword: profileData.currentPassword,
        newPassword: profileData.newPassword
      };

      await authAPI.changePassword(passwordData);
      
      setSaveStatus('password_success');
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setSaveStatus('password_error');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingsSave = async () => {
    setLoading(true);
    setSaveStatus('saving_system');

    try {
      // Simulate system settings save - you might want to create an API for this
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save to localStorage or your preferred storage
      localStorage.setItem('capmis_system_settings', JSON.stringify(systemSettings));
      
      setSaveStatus('system_success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('System settings error:', error);
      setSaveStatus('system_error');
    } finally {
      setLoading(false);
    }
  };

  // Load system settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('capmis_system_settings');
    if (savedSettings) {
      setSystemSettings(JSON.parse(savedSettings));
    }
  }, []);

  const getStatusMessage = () => {
    const messages = {
      saving: { text: 'Saving changes...', color: 'text-blue-600' },
      success: { text: 'Profile updated successfully!', color: 'text-green-600' },
      error: { text: 'Failed to update profile', color: 'text-red-600' },
      saving_system: { text: 'Updating system settings...', color: 'text-blue-600' },
      system_success: { text: 'System settings saved!', color: 'text-green-600' },
      system_error: { text: 'Failed to save settings', color: 'text-red-600' },
      password_mismatch: { text: 'New passwords do not match', color: 'text-red-600' },
      password_weak: { text: 'Password must be at least 8 characters', color: 'text-red-600' },
      password_success: { text: 'Password changed successfully!', color: 'text-green-600' },
      password_error: { text: 'Failed to change password - check current password', color: 'text-red-600' }
    };
    return messages[saveStatus] || null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="p-8 space-y-8">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Control Panel</h1>
              <p className="text-emerald-200 text-lg">
                Manage your profile, security, and system preferences
              </p>
            </div>
            <div className="text-right">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 transform rotate-6">
                <i className="pi pi-cog text-white text-3xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Control Panel Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6 space-y-2">
            <ControlTab
              icon="pi-user"
              title="Profile Settings"
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
            />
            <ControlTab
              icon="pi-shield"
              title="Security"
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
            />
            <ControlTab
              icon="pi-bell"
              title="Notifications"
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
            />
            <ControlTab
              icon="pi-sliders-h"
              title="System Settings"
              active={activeTab === 'system'}
              onClick={() => setActiveTab('system')}
            />
            <ControlTab
              icon="pi-info-circle"
              title="About & Help"
              active={activeTab === 'about'}
              onClick={() => setActiveTab('about')}
            />
            <ControlTab
              icon="pi-trash"
              title="Cleanup Files"
              active={activeTab === 'cleanup'}
              onClick={() => setActiveTab('cleanup')}
            />
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl border border-emerald-200/50 p-6 mt-6">
            <h4 className="font-semibold text-emerald-900 mb-4">Account Overview</h4>
            <div className="space-y-3">
              <StatItem label="Member Since" value="Today" />
              <StatItem label="User Role" value={user?.role} />
              <StatItem label="System Access" value="Full" />
              <StatItem label="Last Login" value="Just now" />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-3">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-8">
            {/* Status Message */}
            {statusMessage && (
              <div className={`mb-6 p-4 rounded-2xl border ${statusMessage.color.includes('green')
                  ? 'bg-green-50 border-green-200'
                  : statusMessage.color.includes('red')
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                <div className="flex items-center space-x-3">
                  <i className={`pi ${statusMessage.color.includes('green') ? 'pi-check-circle' :
                      statusMessage.color.includes('red') ? 'pi-times-circle' :
                        'pi-spinner pi-spin'
                    } ${statusMessage.color}`}></i>
                  <span className={`font-medium ${statusMessage.color}`}>
                    {statusMessage.text}
                  </span>
                </div>
              </div>
            )}

            {/* Dynamic Content */}
            {activeTab === 'profile' && (
              <ProfileSettings
                data={profileData}
                onChange={setProfileData}
                onSave={handleProfileUpdate}
                loading={loading}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySettings
                data={profileData}
                onChange={setProfileData}
                onSave={handlePasswordChange}
                loading={loading}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationSettings
                data={profileData.notifications}
                onChange={(notifications) => setProfileData(prev => ({ ...prev, notifications }))}
              />
            )}

            {activeTab === 'system' && (
              <SystemSettings
                data={systemSettings}
                onChange={setSystemSettings}
                onSave={handleSystemSettingsSave}
                loading={loading}
              />
            )}

            {activeTab === 'about' && <AboutSection />}
            {activeTab === 'cleanup' && <CleanupSection />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Control Tab Component
const ControlTab = ({ icon, title, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all duration-500 ${active
        ? 'bg-gradient-to-r from-emerald-600/10 to-green-700/10 text-emerald-700 border border-emerald-300/50 shadow-lg'
        : 'text-gray-700 hover:bg-emerald-50/80 hover:text-emerald-600 hover:shadow-md border border-transparent'
      }`}
  >
    <i className={`pi ${icon} text-xl ${active ? 'text-emerald-600' : 'text-gray-500'}`}></i>
    <span className="font-semibold">{title}</span>
  </button>
);

// Stat Item Component
const StatItem = ({ label, value }) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-sm text-emerald-800">{label}</span>
    <span className="text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
      {value}
    </span>
  </div>
);

// Profile Settings Component
const ProfileSettings = ({ data, onChange, onSave, loading }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-900">Profile Information</h3>
      <i className="pi pi-user-edit text-emerald-600 text-2xl"></i>
    </div>

    <form onSubmit={onSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="First Name"
          type="text"
          value={data.firstName}
          onChange={(value) => onChange({ ...data, firstName: value })}
          required
        />
        <FormField
          label="Last Name"
          type="text"
          value={data.lastName}
          onChange={(value) => onChange({ ...data, lastName: value })}
          required
        />
        <FormField
          label="Email Address"
          type="email"
          value={data.email}
          onChange={(value) => onChange({ ...data, email: value })}
          required
        />
        <FormField
          label="Username"
          type="text"
          value={data.username}
          onChange={(value) => onChange({ ...data, username: value })}
          required
        />
        <FormField
          label="Institution"
          type="text"
          value={data.institution}
          onChange={(value) => onChange({ ...data, institution: value })}
        />
        <FormField
          label="Role"
          type="select"
          value={data.role}
          options={['admin', 'staff']}
          onChange={(value) => onChange({ ...data, role: value })}
          disabled={true}
        />
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <i className="pi pi-spinner pi-spin"></i>
              <span>Saving...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <i className="pi pi-save"></i>
              <span>Update Profile</span>
            </span>
          )}
        </button>
      </div>
    </form>
  </div>
);

// Security Settings Component
const SecuritySettings = ({ data, onChange, onSave, loading }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-900">Security Settings</h3>
      <i className="pi pi-shield text-emerald-600 text-2xl"></i>
    </div>

    <form onSubmit={onSave} className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <i className="pi pi-info-circle text-amber-600 text-xl mt-0.5"></i>
          <div>
            <p className="font-semibold text-amber-800">Password Requirements</p>
            <p className="text-sm text-amber-700 mt-1">
              Use at least 8 characters with a mix of letters, numbers, and symbols
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <FormField
          label="Current Password"
          type="password"
          value={data.currentPassword}
          onChange={(value) => onChange({ ...data, currentPassword: value })}
          required
        />
        <FormField
          label="New Password"
          type="password"
          value={data.newPassword}
          onChange={(value) => onChange({ ...data, newPassword: value })}
          required
        />
        <FormField
          label="Confirm New Password"
          type="password"
          value={data.confirmPassword}
          onChange={(value) => onChange({ ...data, confirmPassword: value })}
          required
        />
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <i className="pi pi-spinner pi-spin"></i>
              <span>Updating...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <i className="pi pi-lock"></i>
              <span>Change Password</span>
            </span>
          )}
        </button>
      </div>
    </form>
  </div>
);

// Notification Settings Component
const NotificationSettings = ({ data, onChange }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-900">Notification Preferences</h3>
      <i className="pi pi-bell text-emerald-600 text-2xl"></i>
    </div>

    <div className="space-y-4">
      <ToggleSetting
        label="Email Notifications"
        description="Receive important updates via email"
        enabled={data.email}
        onChange={(enabled) => onChange({ ...data, email: enabled })}
      />
      <ToggleSetting
        label="System Alerts"
        description="Get notified about system maintenance and updates"
        enabled={data.system}
        onChange={(enabled) => onChange({ ...data, system: enabled })}
      />
      <ToggleSetting
        label="Security Alerts"
        description="Immediate notifications for security-related events"
        enabled={data.security}
        onChange={(enabled) => onChange({ ...data, security: enabled })}
      />
    </div>
  </div>
);

// System Settings Component
const SystemSettings = ({ data, onChange, onSave, loading }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-900">System Configuration</h3>
      <i className="pi pi-sliders-h text-emerald-600 text-2xl"></i>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ToggleSetting
        label="Auto Backup"
        description="Automatically backup system data daily"
        enabled={data.autoBackup}
        onChange={(enabled) => onChange({ ...data, autoBackup: enabled })}
      />

      <FormField
        label="Compression Quality"
        type="range"
        value={data.compressionQuality}
        min="50"
        max="100"
        onChange={(value) => onChange({ ...data, compressionQuality: parseInt(value) })}
      />

      <FormField
        label="Max File Size (MB)"
        type="number"
        value={data.maxFileSize}
        onChange={(value) => onChange({ ...data, maxFileSize: parseInt(value) })}
      />

      <FormField
        label="Data Retention (Days)"
        type="number"
        value={data.retentionPeriod}
        onChange={(value) => onChange({ ...data, retentionPeriod: parseInt(value) })}
      />
    </div>

    <div className="flex justify-end pt-6 border-t border-gray-200">
      <button
        onClick={onSave}
        disabled={loading}
        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center space-x-2">
            <i className="pi pi-spinner pi-spin"></i>
            <span>Saving Settings...</span>
          </span>
        ) : (
          <span className="flex items-center space-x-2">
            <i className="pi pi-save"></i>
            <span>Save System Settings</span>
          </span>
        )}
      </button>
    </div>
  </div>
);

// About Section Component
const AboutSection = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-900">About CAP_mis</h3>
      <i className="pi pi-info-circle text-emerald-600 text-2xl"></i>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
          <h4 className="font-semibold text-emerald-900 mb-3">System Information</h4>
          <div className="space-y-2 text-sm">
            <InfoItem label="Version" value="1.0.0" />
            <InfoItem label="License" value="Proprietary" />
            <InfoItem label="Last Updated" value="Today" />
            <InfoItem label="Support" value="support@capmis.com" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">Quick Support</h4>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-300 transition-colors duration-200">
              <span className="font-medium text-blue-700">Documentation</span>
              <p className="text-sm text-blue-600 mt-1">User guides and tutorials</p>
            </button>
            <button className="w-full text-left p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-300 transition-colors duration-200">
              <span className="font-medium text-blue-700">Contact Support</span>
              <p className="text-sm text-blue-600 mt-1">Get help from our team</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Reusable Form Field Component
const FormField = ({ label, type, value, onChange, options, required, disabled, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    ) : type === 'range' ? (
      <div className="space-y-2">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
          {...props}
        />
        <div className="text-sm text-gray-600 text-center">{value}%</div>
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
        {...props}
      />
    )}
  </div>
);

// Toggle Setting Component
const ToggleSetting = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
    <div className="flex-1">
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled ? 'bg-emerald-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// Info Item Component
const InfoItem = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-emerald-800">{label}</span>
    <span className="font-medium text-emerald-600">{value}</span>
  </div>
);

// Cleanup Section Component
const CleanupSection = () => {
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [stats, setStats] = useState({
    students: 0,
    permissions: 0,
    studentsWithPhotos: 0
  });

  // Fetch statistics on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get student stats
      const studentsRes = await studentAPI.getStudents();
      const studentStats = await studentAPI.getStudentStats?.();
      
      // Get permission stats
      let permissionsCount = 0;
      try {
        const permissionsRes = await permissionAPI.getAll();
        permissionsCount = permissionsRes.data?.permissions?.length || 0;
      } catch (error) {
        console.log('Could not fetch permissions:', error.message);
      }
      
      setStats({
        students: studentsRes.length || 0,
        permissions: permissionsCount,
        studentsWithPhotos: studentStats?.stats?.studentsWithPhotos || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (confirmAction !== 'delete-students') {
      setConfirmAction('delete-students');
      setConfirmationText('');
      setResult(null);
      return;
    }

    if (confirmationText.toLowerCase() !== 'delete all students') {
      setResult({
        type: 'error',
        message: '❌ Please type "DELETE ALL STUDENTS" exactly to confirm'
      });
      return;
    }

    setCleaning(true);
    
    try {
      const response = await studentAPI.deleteAllStudents();
      
      if (response.success) {
        setResult({
          type: 'success',
          message: `✅ ${response.message}\n🗑️ Deleted: ${response.deletedCount} students, ${response.deletedPhotos} photos`
        });
        fetchStats();
      } else {
        setResult({
          type: 'error',
          message: `❌ Failed: ${response.error || response.message}`
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `❌ Error: ${error.message || 'Unknown error'}`
      });
    } finally {
      setCleaning(false);
      setConfirmAction(null);
      setConfirmationText('');
    }
  };

  const handleDeleteAllPermissions = async () => {
    if (confirmAction !== 'delete-permissions') {
      setConfirmAction('delete-permissions');
      setConfirmationText('');
      setResult(null);
      return;
    }

    if (confirmationText.toLowerCase() !== 'delete all permissions') {
      setResult({
        type: 'error',
        message: '❌ Please type "DELETE ALL PERMISSIONS" exactly to confirm'
      });
      return;
    }

    setCleaning(true);
    
    try {
      const response = await permissionAPI.deleteAllPermissions();
      
      if (response.success) {
        setResult({
          type: 'success',
          message: `✅ ${response.message}\n🗑️ Deleted: ${response.deletedCount} permission records`
        });
        fetchStats();
      } else {
        setResult({
          type: 'error',
          message: `❌ Failed: ${response.error || response.message}`
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `❌ Error: ${error.message || 'Unknown error'}`
      });
    } finally {
      setCleaning(false);
      setConfirmAction(null);
      setConfirmationText('');
    }
  };

  const handleCancel = () => {
    setConfirmAction(null);
    setConfirmationText('');
    setResult(null);
  };

  const ConfirmationDialog = () => {
    const getActionDetails = () => {
      switch (confirmAction) {
        case 'delete-students':
          return {
            title: 'Delete All Students',
            warning: `This will PERMANENTLY delete ALL ${stats.students} students and their ${stats.studentsWithPhotos} photos from Cloudinary.`,
            instruction: 'Type "DELETE ALL STUDENTS" to confirm:',
            confirmText: 'DELETE ALL STUDENTS',
            buttonColor: 'bg-red-600 hover:bg-red-700',
            buttonText: 'Delete All Students'
          };
        case 'delete-permissions':
          return {
            title: 'Delete All Permissions',
            warning: `This will PERMANENTLY delete ALL ${stats.permissions} permission records.`,
            instruction: 'Type "DELETE ALL PERMISSIONS" to confirm:',
            confirmText: 'DELETE ALL PERMISSIONS',
            buttonColor: 'bg-red-600 hover:bg-red-700',
            buttonText: 'Delete All Permissions'
          };
        default:
          return null;
      }
    };

    const details = getActionDetails();
    if (!details) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{details.title}</h3>
            <i className="pi pi-exclamation-triangle text-red-600 text-2xl"></i>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <i className="pi pi-exclamation-circle text-red-600 text-xl mt-0.5"></i>
              <div>
                <p className="font-semibold text-red-800">⚠️ DANGEROUS ACTION</p>
                <p className="text-sm text-red-700 mt-1">{details.warning}</p>
                <p className="text-sm text-red-700 mt-2 font-bold">This action cannot be undone!</p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {details.instruction}
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder={details.confirmText}
              autoFocus
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              disabled={cleaning}
            >
              Cancel
            </button>
            <button
              onClick={confirmAction === 'delete-students' ? handleDeleteAllStudents : handleDeleteAllPermissions}
              disabled={cleaning || confirmationText.toLowerCase() !== details.confirmText.toLowerCase()}
              className={`flex-1 ${details.buttonColor} text-white px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {cleaning ? (
                <span className="flex items-center justify-center space-x-2">
                  <i className="pi pi-spinner pi-spin"></i>
                  <span>Processing...</span>
                </span>
              ) : (
                details.buttonText
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">System Cleanup</h3>
        <i className="pi pi-trash text-emerald-600 text-2xl"></i>
      </div>

      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
        {/* Statistics Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Students</p>
                <p className="text-2xl font-bold text-blue-800">{stats.students}</p>
              </div>
              <i className="pi pi-users text-blue-500 text-xl"></i>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {stats.studentsWithPhotos} with photos
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Total Permissions</p>
                <p className="text-2xl font-bold text-purple-800">{stats.permissions}</p>
              </div>
              <i className="pi pi-file text-purple-500 text-xl"></i>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Storage Status</p>
                <p className="text-lg font-bold text-amber-800">Cloud Storage</p>
              </div>
              <i className="pi pi-cloud text-amber-500 text-xl"></i>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Using Cloudinary (no local cleanup needed)
            </p>
          </div>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`mb-6 p-4 rounded-2xl border ${
            result.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start space-x-3">
              <i className={`pi ${
                result.type === 'success' ? 'pi-check-circle' : 'pi-times-circle'
              } text-xl mt-0.5`}></i>
              <div>
                <p className="font-medium whitespace-pre-line">{result.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <i className="pi pi-exclamation-triangle text-red-600 text-xl mt-0.5"></i>
            <div>
              <p className="font-semibold text-red-800">⚠️ DANGEROUS ACTIONS BELOW</p>
              <p className="text-sm text-red-700 mt-1">
                These actions will permanently delete data. Use with extreme caution!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleDeleteAllStudents}
            disabled={cleaning || stats.students === 0}
            className="group relative bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-center space-x-3">
              <i className="pi pi-users text-xl"></i>
              <span>Delete All Students</span>
            </div>
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
            <div className="absolute top-2 right-2 bg-red-800 text-white text-xs px-2 py-1 rounded-full">
              {stats.students}
            </div>
          </button>

          <button
            onClick={handleDeleteAllPermissions}
            disabled={cleaning || stats.permissions === 0}
            className="group relative bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
          >
            <div className="relative z-10 flex items-center justify-center space-x-3">
              <i className="pi pi-file text-xl"></i>
              <span>Delete All Permissions</span>
            </div>
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
            <div className="absolute top-2 right-2 bg-red-800 text-white text-xs px-2 py-1 rounded-full">
              {stats.permissions}
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-600 space-y-2">
          <p className="flex items-center space-x-2">
            <i className="pi pi-info-circle text-gray-500"></i>
            <span>Students: Deletes all student records and their Cloudinary photos</span>
          </p>
          <p className="flex items-center space-x-2">
            <i className="pi pi-info-circle text-gray-500"></i>
            <span>Permissions: Deletes all permission slip records</span>
          </p>
          <p className="flex items-center space-x-2 text-red-600 font-medium">
            <i className="pi pi-exclamation-triangle"></i>
            <span>These actions require confirmation and cannot be undone</span>
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && <ConfirmationDialog />}
    </div>
  );
};

export default Profile;