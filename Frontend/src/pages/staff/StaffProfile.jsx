// pages/staff/StaffProfile.jsx - REDESIGNED FOR STAFF
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
        // Clear the needsPasswordChange flag so they won't be reminded again
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

    // For first login, no current password needed
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

        // If this was first login, clear the flag and redirect to dashboard
        if (isFirstLogin) {
          setIsFirstLogin(false);
          updateUser({ needsPasswordChange: false });

          // Show success and redirect after 2 seconds
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Staff Profile</h1>
              <p className="text-emerald-200 text-sm mt-1">
                {isFirstLogin ? 'Please set your password to continue' : 'Manage your personal information and security settings'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="pi pi-user text-white text-xl"></i>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border ${statusMessage.bg} ${statusMessage.border}`}>
          <div className="flex items-center space-x-3">
            <i className={`pi ${statusMessage.icon} ${statusMessage.color}`}></i>
            <span className={`font-medium ${statusMessage.color}`}>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* First Login Warning Banner */}
      {isFirstLogin && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-5">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="pi pi-exclamation-triangle text-white text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 text-lg">⚠️ Action Required: Set Your Password</h3>
              <p className="text-amber-700 mt-1">
                This is your first time logging in. For security reasons, you must set a new password before accessing the dashboard.
              </p>
              <div className="mt-3 bg-amber-100 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-medium">
                  🔒 What you need to know:
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>You will NOT need your current password (this is a temporary account)</li>
                  <li>Create a strong, unique password that you will remember</li>
                  <li>After setting your password, you will be redirected to the dashboard</li>
                  <li className="font-bold text-red-600">
                    ⚠️ If you leave this page without setting a password, you will NOT be reminded again!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Staff Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-3xl">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{user?.firstName} {user?.lastName}</h3>
            <p className="text-sm text-emerald-600 mt-1">@{user?.username}</p>
            <p className="text-xs text-gray-500 mt-2 capitalize">{user?.role}</p>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">School</span>
                <span className="font-medium text-gray-900">{user?.school?.name || 'Loading...'}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${isFirstLogin ? 'text-amber-600' : 'text-green-600'}`}>
                  {isFirstLogin ? 'First Login Required' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links - Only show if not first login */}
          {!isFirstLogin && (
            <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-6 mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/staff/dashboard')} className="w-full flex items-center space-x-3 text-gray-600 hover:text-emerald-600 transition-colors">
                  <i className="pi pi-home text-sm"></i>
                  <span>Dashboard</span>
                </button>
                <button onClick={() => navigate('/staff/students')} className="w-full flex items-center space-x-3 text-gray-600 hover:text-emerald-600 transition-colors">
                  <i className="pi pi-users text-sm"></i>
                  <span>Students</span>
                </button>
                <button onClick={() => navigate('/staff/card-studio')} className="w-full flex items-center space-x-3 text-gray-600 hover:text-emerald-600 transition-colors">
                  <i className="pi pi-id-card text-sm"></i>
                  <span>Card Studio</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
              <i className="pi pi-user-edit text-emerald-600"></i>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={profileData.username}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phoneNumber}
                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="+250 788 123 456"
                  />
                </div>
              </div>

              {!isFirstLogin && (
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password / Set Password */}
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {isFirstLogin ? 'Set Your Password' : 'Change Password'}
              </h2>
              <i className="pi pi-shield text-emerald-600"></i>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password - Only show for normal password change */}
              {!isFirstLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required={!isFirstLogin}
                    placeholder="Enter your current password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isFirstLogin ? 'New Password' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  placeholder={isFirstLogin ? "Create your new password" : "Enter new password"}
                />
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  placeholder="Confirm your password"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <i className="pi pi-spinner pi-spin"></i>
                      <span>{isFirstLogin ? 'Setting Password...' : 'Changing Password...'}</span>
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

          {/* Notification Preferences - Only show if not first login */}
          {!isFirstLogin && (
            <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                <i className="pi pi-bell text-emerald-600"></i>
              </div>

              <div className="space-y-3">
                <ToggleItem
                  label="Email Notifications"
                  description="Receive updates via email"
                  enabled={notifications.email}
                  onChange={() => setNotifications({ ...notifications, email: !notifications.email })}
                />
                <ToggleItem
                  label="System Alerts"
                  description="Get notified about system updates"
                  enabled={notifications.system}
                  onChange={() => setNotifications({ ...notifications, system: !notifications.system })}
                />
                <ToggleItem
                  label="Security Alerts"
                  description="Important security notifications"
                  enabled={notifications.security}
                  onChange={() => setNotifications({ ...notifications, security: !notifications.security })}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="bg-white rounded-2xl shadow-xl border border-red-200/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Logout from Account</h3>
                <p className="text-sm text-gray-600 mt-1">Sign out of your staff account</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <i className="pi pi-sign-out"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Warning Dialog - Only for first login */}
      {isFirstLogin && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleLeaveWithoutChange}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-colors"
          >
            <i className="pi pi-arrow-left"></i>
            <span>Leave without setting password</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Toggle Item Component
const ToggleItem = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
    <div>
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default StaffProfile;