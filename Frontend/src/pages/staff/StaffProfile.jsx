// pages/staff/StaffProfile.jsx - CINEMATIC STAFF PROFILE (Matches Admin Profile Design)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

const StaffProfile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // Track if this is first login (force password change)
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [hasLeftWarning, setHasLeftWarning] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phoneNumber: '',
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    system: true,
    security: true
  });

  // Check if force password change is required (first login)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const forceFromUrl = params.get('forcePasswordChange') === 'true';
    const needsFromUser = user?.needsPasswordChange === true;

    if (forceFromUrl || needsFromUser) {
      setIsFirstLogin(true);
      setSaveStatus('force_change_required');
    }
  }, [location, user]);

  // Load user data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        phoneNumber: user.phoneNumber || '',
      });

      if (user.notifications) {
        setNotifications(user.notifications);
      }
    }
  }, [user]);

  // Handle leaving the page without changing password on first login
  const handleLeaveWithoutChange = () => {
    if (isFirstLogin && !hasLeftWarning) {
      const confirmLeave = window.confirm(
        '⚠️ WARNING: You have not changed your temporary password!\n\n' +
        'If you leave now, you will NOT be reminded again.\n\n' +
        'Your account will remain active but with a temporary password.\n' +
        'For security reasons, we strongly recommend changing it now.\n\n' +
        'Are you sure you want to leave?'
      );

      if (confirmLeave) {
        setHasLeftWarning(true);
        updateUser({ needsPasswordChange: false });
        navigate('/staff/dashboard');
      }
    } else {
      navigate(-1);
    }
  };

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
        phoneNumber: profileData.phoneNumber,
        notifications: notifications
      };

      const response = await authAPI.updateProfile(updateData);

      if (response.success && response.user) {
        updateUser(response.user);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveStatus('password_mismatch');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setSaveStatus('password_weak');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    if (!isFirstLogin && !passwordData.currentPassword) {
      setSaveStatus('password_no_current');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setLoading(true);
    setSaveStatus('saving');

    try {
      const payload = isFirstLogin
        ? { newPassword: passwordData.newPassword, isFirstLogin: true }
        : { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword };

      const response = await authAPI.changePassword(payload);

      if (response.success) {
        setSaveStatus('password_success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        if (isFirstLogin) {
          setIsFirstLogin(false);
          updateUser({ needsPasswordChange: false });
          setTimeout(() => {
            navigate('/staff/dashboard');
          }, 2000);
        }

        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('password_error');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (error) {
      console.error('Password change error:', error);
      setSaveStatus('password_error');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    const messages = {
      saving: { text: 'Saving changes...', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'pi-spinner pi-spin' },
      success: { text: 'Profile updated successfully!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
      error: { text: 'Failed to update profile', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_mismatch: { text: 'New passwords do not match', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_weak: { text: 'Password must be at least 6 characters', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_no_current: { text: 'Please enter your current password', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      password_success: { text: isFirstLogin ? 'Password set successfully! Redirecting to dashboard...' : 'Password changed successfully!', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: 'pi-check-circle' },
      password_error: { text: 'Failed to change password. Check your current password.', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: 'pi-times-circle' },
      force_change_required: { text: '⚠️ FIRST LOGIN: You must set a new password to continue.', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'pi-exclamation-triangle' }
    };
    return messages[saveStatus] || null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        {/* Profile Header - Cinematic Style */}
        <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-6 lg:p-8 text-white">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold mb-2">Staff Control Panel</h1>
                <p className="text-emerald-200 text-sm lg:text-lg">
                  {isFirstLogin ? 'Set your password to continue' : 'Manage your profile, security, and preferences'}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 transform rotate-6">
                  <i className="pi pi-user text-white text-2xl lg:text-3xl"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 lg:w-48 h-32 lg:h-48 bg-green-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* First Login Warning Banner */}
        {isFirstLogin && (
          <div className="bg-amber-50 border-2 border-amber-500 rounded-2xl lg:rounded-3xl p-5 lg:p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="pi pi-exclamation-triangle text-white text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 text-base lg:text-lg">⚠️ Action Required: Set Your Password</h3>
                <p className="text-amber-700 text-sm lg:text-base mt-1">
                  This is your first time logging in. For security reasons, you must set a new password.
                </p>
                <div className="mt-3 bg-amber-100 rounded-lg p-3 lg:p-4">
                  <p className="text-sm lg:text-base font-medium text-amber-800">🔒 Important:</p>
                  <ul className="text-xs lg:text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                    <li>You will NOT need your current password</li>
                    <li>Create a strong, unique password</li>
                    <li>If you leave without setting a password, you will NOT be reminded again!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout - Matches Admin Profile */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar Navigation */}
          <div className="xl:col-span-1">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-4 lg:p-6 space-y-2">
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
              {!isFirstLogin && (
                <ControlTab
                  icon="pi-bell"
                  title="Notifications"
                  active={activeTab === 'notifications'}
                  onClick={() => setActiveTab('notifications')}
                />
              )}
            </div>

            {/* Quick Stats - Matches Admin Profile */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl border border-emerald-200/50 p-4 lg:p-6 mt-6">
              <h4 className="font-semibold text-emerald-900 mb-4 text-base lg:text-lg">Account Overview</h4>
              <div className="space-y-3">
                <StatItem label="Username" value={`@${user?.username || 'N/A'}`} />
                <StatItem label="User Role" value={user?.role || 'staff'} />
                <StatItem label="School" value={user?.school?.name || 'Loading...'} />
                <StatItem 
                  label="Status" 
                  value={isFirstLogin ? 'First Login Required' : 'Active'} 
                  valueClass={isFirstLogin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                />
              </div>
            </div>

            {/* Quick Links */}
            {!isFirstLogin && (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-4 lg:p-6 mt-6">
                <h4 className="font-semibold text-emerald-900 mb-4 text-base lg:text-lg">Quick Links</h4>
                <div className="space-y-2">
                  <QuickLink icon="pi-home" label="Dashboard" onClick={() => navigate('/staff/dashboard')} />
                  <QuickLink icon="pi-users" label="Students" onClick={() => navigate('/staff/students')} />
                  <QuickLink icon="pi-id-card" label="Card Studio" onClick={() => navigate('/staff/card-studio')} />
                  <QuickLink icon="pi-calendar" label="Attendance" onClick={() => navigate('/staff/attendance')} />
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6 lg:p-8">
              {/* Status Message */}
              {statusMessage && (
                <div className={`mb-6 p-4 rounded-2xl border ${statusMessage.bg} ${statusMessage.border}`}>
                  <div className="flex items-center space-x-3">
                    <i className={`pi ${statusMessage.icon} ${statusMessage.color} text-xl`}></i>
                    <span className={`font-medium ${statusMessage.color}`}>{statusMessage.text}</span>
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
                  isFirstLogin={isFirstLogin}
                />
              )}

              {activeTab === 'security' && (
                <SecuritySettings
                  data={passwordData}
                  onChange={setPasswordData}
                  onSave={handlePasswordChange}
                  loading={loading}
                  isFirstLogin={isFirstLogin}
                />
              )}

              {activeTab === 'notifications' && !isFirstLogin && (
                <NotificationSettings
                  data={notifications}
                  onChange={setNotifications}
                  onSave={handleProfileUpdate}
                  loading={loading}
                />
              )}
            </div>

            {/* Logout Card - Only show if not first login */}
            {!isFirstLogin && (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-red-200/30 p-6 lg:p-8 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Logout from Account</h3>
                    <p className="text-sm lg:text-base text-gray-600 mt-1">Sign out of your staff account</p>
                  </div>
                  <button
                    onClick={logout}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 lg:px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-3"
                  >
                    <i className="pi pi-sign-out text-lg"></i>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave Warning Button - Only for first login */}
        {isFirstLogin && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleLeaveWithoutChange}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 transition-all text-sm lg:text-base"
            >
              <i className="pi pi-arrow-left"></i>
              <span>Leave without setting password</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Control Tab Component - Matches Admin Profile
const ControlTab = ({ icon, title, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 lg:space-x-4 p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all duration-500 ${
      active
        ? 'bg-gradient-to-r from-emerald-600/10 to-green-700/10 text-emerald-700 border border-emerald-300/50 shadow-lg'
        : 'text-gray-700 hover:bg-emerald-50/80 hover:text-emerald-600 hover:shadow-md border border-transparent'
    }`}
  >
    <i className={`pi ${icon} text-lg lg:text-xl ${active ? 'text-emerald-600' : 'text-gray-500'}`}></i>
    <span className="font-semibold text-sm lg:text-base">{title}</span>
  </button>
);

// Stat Item Component - Matches Admin Profile
const StatItem = ({ label, value, valueClass }) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-xs lg:text-sm text-emerald-800">{label}</span>
    <span className={`text-xs lg:text-sm font-medium px-3 py-1 rounded-full truncate max-w-[150px] ${
      valueClass || 'bg-emerald-100 text-emerald-600'
    }`}>
      {value}
    </span>
  </div>
);

// Quick Link Component
const QuickLink = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center space-x-3 p-2 lg:p-3 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
  >
    <i className={`pi ${icon} text-sm lg:text-base`}></i>
    <span className="text-sm lg:text-base">{label}</span>
  </button>
);

// Profile Settings Component
const ProfileSettings = ({ data, onChange, onSave, loading, isFirstLogin }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Profile Information</h3>
      <i className="pi pi-user-edit text-emerald-600 text-xl lg:text-2xl"></i>
    </div>

    <form onSubmit={onSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
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
          disabled
        />
        <FormField
          label="Username"
          type="text"
          value={data.username}
          disabled
        />
        <div className="md:col-span-2">
          <FormField
            label="Phone Number"
            type="tel"
            value={data.phoneNumber}
            onChange={(value) => onChange({ ...data, phoneNumber: value })}
            placeholder="+250 788 123 456"
          />
        </div>
      </div>

      {!isFirstLogin && (
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 lg:px-8 py-3 rounded-xl lg:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
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
      )}
    </form>
  </div>
);

// Security Settings Component
const SecuritySettings = ({ data, onChange, onSave, loading, isFirstLogin }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl lg:text-2xl font-bold text-gray-900">
        {isFirstLogin ? 'Set Your Password' : 'Security Settings'}
      </h3>
      <i className="pi pi-shield text-emerald-600 text-xl lg:text-2xl"></i>
    </div>

    {!isFirstLogin && (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 lg:p-6">
        <div className="flex items-start space-x-3">
          <i className="pi pi-info-circle text-amber-600 text-xl mt-0.5"></i>
          <div>
            <p className="font-semibold text-amber-800 text-sm lg:text-base">Password Requirements</p>
            <p className="text-xs lg:text-sm text-amber-700 mt-1">
              Use at least 6 characters for your password
            </p>
          </div>
        </div>
      </div>
    )}

    <form onSubmit={onSave} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        {!isFirstLogin && (
          <FormField
            label="Current Password"
            type="password"
            value={data.currentPassword}
            onChange={(value) => onChange({ ...data, currentPassword: value })}
            required={!isFirstLogin}
            placeholder="Enter your current password"
          />
        )}
        <FormField
          label={isFirstLogin ? "New Password" : "New Password"}
          type="password"
          value={data.newPassword}
          onChange={(value) => onChange({ ...data, newPassword: value })}
          required
          placeholder={isFirstLogin ? "Create your new password" : "Enter new password"}
          hint="Password must be at least 6 characters"
        />
        <FormField
          label="Confirm Password"
          type="password"
          value={data.confirmPassword}
          onChange={(value) => onChange({ ...data, confirmPassword: value })}
          required
          placeholder="Confirm your password"
        />
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 lg:px-8 py-3 rounded-xl lg:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <i className="pi pi-spinner pi-spin"></i>
              <span>{isFirstLogin ? 'Setting Password...' : 'Updating...'}</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <i className="pi pi-lock"></i>
              <span>{isFirstLogin ? 'Set Password & Continue' : 'Change Password'}</span>
            </span>
          )}
        </button>
      </div>
    </form>
  </div>
);

// Notification Settings Component
const NotificationSettings = ({ data, onChange, onSave, loading }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Notification Preferences</h3>
      <i className="pi pi-bell text-emerald-600 text-xl lg:text-2xl"></i>
    </div>

    <div className="space-y-4">
      <ToggleSetting
        label="Email Notifications"
        description="Receive updates via email"
        enabled={data.email}
        onChange={(enabled) => onChange({ ...data, email: enabled })}
      />
      <ToggleSetting
        label="System Alerts"
        description="Get notified about system updates"
        enabled={data.system}
        onChange={(enabled) => onChange({ ...data, system: enabled })}
      />
      <ToggleSetting
        label="Security Alerts"
        description="Important security notifications"
        enabled={data.security}
        onChange={(enabled) => onChange({ ...data, security: enabled })}
      />
    </div>

    <div className="flex justify-end pt-6 border-t border-gray-200">
      <button
        onClick={onSave}
        disabled={loading}
        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 lg:px-8 py-3 rounded-xl lg:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
      >
        {loading ? (
          <span className="flex items-center space-x-2">
            <i className="pi pi-spinner pi-spin"></i>
            <span>Saving...</span>
          </span>
        ) : (
          <span className="flex items-center space-x-2">
            <i className="pi pi-save"></i>
            <span>Save Preferences</span>
          </span>
        )}
      </button>
    </div>
  </div>
);

// Reusable Form Field Component
const FormField = ({ label, type, value, onChange, required, disabled, placeholder, hint, options }) => (
  <div>
    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-gray-300 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-sm lg:text-base ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      >
        {options?.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border border-gray-300 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-sm lg:text-base ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />
    )}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

// Toggle Setting Component
const ToggleSetting = ({ label, description, enabled, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl lg:rounded-2xl border border-gray-200 gap-3">
    <div className="flex-1">
      <p className="font-medium text-gray-900 text-sm lg:text-base">{label}</p>
      <p className="text-xs lg:text-sm text-gray-600 mt-1">{description}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0 ${
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

export default StaffProfile;