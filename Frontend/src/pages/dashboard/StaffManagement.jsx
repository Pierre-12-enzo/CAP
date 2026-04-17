// pages/dashboard/StaffManagement.jsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const StaffManagement = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'deactivate' or 'permanent'
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    isActive: true,
    permissions: {
      canViewAnalytics: false,
      canGenerateCards: false,
      canManageStudents: false,
      canManageTemplates: false,
      canViewAuditLogs: false,
      canMarkAttendance: false,
      canUploadCSV: false,
      canUploadPhotos: false
    }
  });
  const [bulkData, setBulkData] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [permissionFilter, setPermissionFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Mobile view state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    fetchStaff();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterAndSortStaff();
  }, [staff, searchTerm, statusFilter, permissionFilter, sortBy, sortOrder]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await staffAPI.getStaff();
      if (response.success) {
        setStaff(response.staff);
        setFilteredStaff(response.staff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortStaff = () => {
    let filtered = [...staff];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.firstName?.toLowerCase().includes(term) ||
        member.lastName?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.phoneNumber?.includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(member =>
        statusFilter === 'active' ? member.isActive : !member.isActive
      );
    }

    if (permissionFilter !== 'all') {
      filtered = filtered.filter(member =>
        member.permissions?.[permissionFilter]
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredStaff(filtered);
    setCurrentPage(1);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('perm_')) {
      const permName = name.replace('perm_', '');
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          [permName]: checked
        }
      });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const showSuccess = (message) => {
    setNotification({ show: true, type: 'success', message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
  };

  const showError = (message) => {
    setNotification({ show: true, type: 'error', message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      setLoading(true);
      let response;

      if (selectedStaff) {
        response = await staffAPI.updateStaff(selectedStaff._id, formData);
        if (response.success) {
          showSuccess('✅ Staff member updated successfully!');
          setShowModal(false);
          resetForm();
          fetchStaff();
        } else {
          setModalError(response.error || 'Failed to update staff member');
        }
      } else {
        response = await staffAPI.createStaff(formData);
        if (response.success) {
          showSuccess('✅ Staff member created successfully! Invitation email sent.');
          setShowModal(false);
          resetForm();
          fetchStaff();
        } else {
          if (response.error?.includes('email already exists')) {
            setModalError('This email is already registered. Please use a different email.');
          } else {
            setModalError(response.error || 'Failed to create staff member');
          }
        }
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      setModalError(error.error || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Updated delete handler with options
  const handleDeactivate = async (id) => {
    try {
      const response = await staffAPI.deleteStaff(id); // Soft delete / deactivate
      if (response.success) {
        showSuccess('✅ Staff member deactivated successfully');
        fetchStaff();
      } else {
        showError(response.error || 'Failed to deactivate staff member');
      }
    } catch (error) {
      console.error('Error deactivating staff:', error);
      showError(error.error || 'Failed to deactivate staff member');
    }
    setShowDeleteModal(false);
    setSelectedStaff(null);
  };

  const handlePermanentDelete = async (id) => {
    // Optional: Add confirmation with text input for extra safety
    const confirmText = window.prompt(
      '⚠️ PERMANENT DELETE WARNING!\n\n' +
      'This action cannot be undone. All staff data will be permanently removed.\n\n' +
      'Type "PERMANENT DELETE" to confirm:'
    );

    if (confirmText !== 'PERMANENT DELETE') {
      showError('Permanent delete cancelled - incorrect confirmation text');
      return;
    }

    try {
      const response = await staffAPI.deleteStaff(id, true); // permanent = true
      if (response.success) {
        showSuccess('✅ Staff member permanently deleted');
        fetchStaff();
      } else {
        showError(response.error || 'Failed to permanently delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      showError(error.error || 'Failed to permanently delete staff member');
    }
    setShowDeleteModal(false);
    setSelectedStaff(null);
  };

  const handleResendInvite = async (id) => {
    try {
      const response = await staffAPI.resendInvite(id);
      if (response.success) {
        showSuccess('✅ Invitation resent successfully! The staff member will receive an email with login instructions.');
      } else {
        showError(response.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      showError(error.error || 'Failed to resend invitation');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      isActive: true,
      permissions: {
        canViewAnalytics: false,
        canGenerateCards: false,
        canManageStudents: false,
        canManageTemplates: false,
        canViewAuditLogs: false,
        canMarkAttendance: false,
        canUploadCSV: false,
        canUploadPhotos: false
      }
    });
    setSelectedStaff(null);
  };

  const editStaff = (member) => {
    setSelectedStaff(member);
    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phoneNumber: member.phoneNumber || '',
      isActive: member.isActive || false,
      permissions: member.permissions || {
        canViewAnalytics: false,
        canGenerateCards: false,
        canManageStudents: false,
        canManageTemplates: false,
        canViewAuditLogs: false,
        canMarkAttendance: false,
        canUploadCSV: false,
        canUploadPhotos: false
      }
    });
    setShowModal(true);
  };

  // Helper function to check if resend invite should be disabled
  const shouldDisableResend = (member) => {
    // Disable if user has logged in before (has lastLogin)
    if (member.lastLogin) return true;
    // Disable if user is active (already using the account)
    if (member.isActive) return true;
    return false;
  };

  // Bulk import functions
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setBulkData(jsonData);
        setBulkPreview(jsonData.slice(0, 5));
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@school.com',
        phoneNumber: '0788123456',
        canViewAnalytics: 'YES',
        canGenerateCards: 'YES',
        canManageStudents: 'NO',
        canManageTemplates: 'NO',
        canViewAuditLogs: 'NO',
        canMarkAttendance: 'YES',
        canUploadCSV: 'NO',
        canUploadPhotos: 'NO'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Template');
    XLSX.writeFile(wb, 'staff_import_template.xlsx');
  };

  const handleBulkImport = async () => {
    if (bulkData.length === 0) {
      setModalError('Please upload a file first');
      return;
    }

    setBulkLoading(true);
    setBulkResults(null);

    try {
      const staffList = bulkData.map(row => ({
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phoneNumber: row.phoneNumber,
        permissions: {
          canViewAnalytics: row.canViewAnalytics?.toUpperCase() === 'YES',
          canGenerateCards: row.canGenerateCards?.toUpperCase() === 'YES',
          canManageStudents: row.canManageStudents?.toUpperCase() === 'YES',
          canManageTemplates: row.canManageTemplates?.toUpperCase() === 'YES',
          canViewAuditLogs: row.canViewAuditLogs?.toUpperCase() === 'YES',
          canMarkAttendance: row.canMarkAttendance?.toUpperCase() === 'YES',
          canUploadCSV: row.canUploadCSV?.toUpperCase() === 'YES',
          canUploadPhotos: row.canUploadPhotos?.toUpperCase() === 'YES'
        }
      }));

      const response = await staffAPI.bulkCreateStaff(staffList);
      setBulkResults(response.results);

      if (response.results.success.length > 0) {
        showSuccess(`✅ Successfully imported ${response.results.success.length} staff members`);
        fetchStaff();
      }

      if (response.results.failed.length > 0) {
        setModalError(`Failed to import ${response.results.failed.length} staff members. Check the results for details.`);
      }
    } catch (error) {
      console.error('Error in bulk import:', error);
      setModalError(error.error || 'Failed to import staff members');
    } finally {
      setBulkLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getPermissionNames = (permissions) => {
    const names = [];
    if (permissions?.canViewAnalytics) names.push('Analytics');
    if (permissions?.canGenerateCards) names.push('Cards');
    if (permissions?.canManageStudents) names.push('Students');
    if (permissions?.canManageTemplates) names.push('Templates');
    if (permissions?.canViewAuditLogs) names.push('Audit');
    if (permissions?.canMarkAttendance) names.push('Attendance');
    if (permissions?.canUploadCSV) names.push('CSV');
    if (permissions?.canUploadPhotos) names.push('Photos');
    return names;
  };

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const permissionOptions = [
    { value: 'canViewAnalytics', label: 'Analytics' },
    { value: 'canGenerateCards', label: 'Cards' },
    { value: 'canManageStudents', label: 'Students' },
    { value: 'canManageTemplates', label: 'Templates' },
    { value: 'canViewAuditLogs', label: 'Audit' },
    { value: 'canMarkAttendance', label: 'Attendance' },
    { value: 'canUploadCSV', label: 'CSV' },
    { value: 'canUploadPhotos', label: 'Photos' }
  ];

  if (loading && staff.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-semibold">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-2">Manage your school staff and their permissions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
          >
            <i className="pi pi-upload text-lg"></i>
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
          >
            <i className="pi pi-user-plus text-lg"></i>
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 right-4 z-[100] max-w-md"
          >
            <div className={`rounded-lg shadow-lg p-4 flex items-start border-l-4 ${notification.type === 'success'
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
              }`}>
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <i className="pi pi-check-circle text-green-500 text-xl"></i>
                ) : (
                  <i className="pi pi-exclamation-triangle text-red-500 text-xl"></i>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification({ show: false, type: '', message: '' })}
                className={`ml-4 flex-shrink-0 ${notification.type === 'success'
                  ? 'text-green-500 hover:text-green-600'
                  : 'text-red-500 hover:text-red-600'
                  }`}
              >
                <i className="pi pi-times"></i>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Total Staff" value={staff.length} icon="pi-users" color="emerald" />
        <StatCard title="Active Staff" value={staff.filter(s => s.isActive).length} icon="pi-check-circle" color="blue" />
        <StatCard title="Pending Invites" value={staff.filter(s => !s.isActive && !s.lastLogin).length} icon="pi-envelope" color="amber" />
      </div>

      {/* Search and Filters */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permission</label>
            <select
              value={permissionFilter}
              onChange={(e) => setPermissionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Permissions</option>
              {permissionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Show</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end mt-4 space-x-4">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="createdAt">Join Date</option>
            <option value="firstName">First Name</option>
            <option value="lastName">Last Name</option>
            <option value="email">Email</option>
            <option value="lastLogin">Last Active</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <i className={`pi pi-sort-${sortOrder === 'asc' ? 'amount-down' : 'amount-up'}`}></i>
          </button>
        </div>
      </div>

      {/* Staff List - Desktop Table */}
      {!isMobile ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-emerald-200/30">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Staff Member</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Contact</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Permissions</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Last Login</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {paginatedStaff.map((member) => (
                    <motion.tr
                      key={member._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {getInitials(member.firstName, member.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-sm text-gray-500">@{member.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-900">{member.email}</p>
                        <p className="text-sm text-gray-500">{member.phoneNumber}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {getPermissionNames(member.permissions).map((perm, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {member.isActive ? (
                          <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-900">
                          {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-2">
                          <ActionButton icon="pi-pencil" color="emerald" onClick={() => editStaff(member)} title="Edit" />
                          <ActionButton
                            icon="pi-envelope"
                            color="blue"
                            onClick={() => handleResendInvite(member._id)}
                            title={shouldDisableResend(member) ? 'Cannot resend - User already logged in or active' : 'Resend Invite'}
                            disabled={shouldDisableResend(member)}
                          />
                          <ActionButton
                            icon="pi-trash"
                            color="red"
                            onClick={() => {
                              setSelectedStaff(member);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Options"
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Mobile Card View
        <div className="space-y-4">
          <AnimatePresence>
            {paginatedStaff.map((member) => (
              <motion.div key={member._id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{getInitials(member.firstName, member.lastName)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.firstName} {member.lastName}</h3>
                      <p className="text-sm text-gray-500">@{member.username}</p>
                    </div>
                  </div>
                  {member.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Inactive</span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <p className="text-sm text-gray-600 flex items-center"><i className="pi pi-envelope w-5 text-emerald-600"></i>{member.email}</p>
                  <p className="text-sm text-gray-600 flex items-center"><i className="pi pi-phone w-5 text-emerald-600"></i>{member.phoneNumber || 'No phone'}</p>
                  <p className="text-sm text-gray-600 flex items-center"><i className="pi pi-calendar w-5 text-emerald-600"></i>Last active: {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}</p>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {getPermissionNames(member.permissions).map((perm, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">{perm}</span>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                  <ActionButton icon="pi-pencil" color="emerald" onClick={() => editStaff(member)} title="Edit" />
                  <ActionButton
                    icon="pi-envelope"
                    color="blue"
                    onClick={() => handleResendInvite(member._id)}
                    disabled={shouldDisableResend(member)}
                    title={shouldDisableResend(member) ? 'Cannot resend - User already logged in or active' : 'Resend Invite'}
                  />
                  <ActionButton
                    icon="pi-trash"
                    color="red"
                    onClick={() => {
                      setSelectedStaff(member);
                      setShowDeleteModal(true);
                    }}
                    title="Delete Options"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {filteredStaff.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length} staff
          </p>
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50">Previous</button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1 rounded-lg ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'border border-gray-300'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredStaff.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="pi pi-users text-emerald-600 text-3xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || permissionFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first staff member'}
          </p>
          {(searchTerm || statusFilter !== 'all' || permissionFilter !== 'all') ? (
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPermissionFilter('all'); }} className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl">
              <i className="pi pi-filter-slash"></i><span>Clear Filters</span>
            </button>
          ) : (
            <button onClick={() => { resetForm(); setShowModal(true); }} className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl">
              <i className="pi pi-user-plus"></i><span>Add Staff Member</span>
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      <AnimatePresence>
        {showModal && (
          <StaffModal
            formData={formData}
            selectedStaff={selectedStaff}
            onClose={() => { setShowModal(false); resetForm(); setModalError(''); }}
            onSubmit={handleSubmit}
            onChange={handleInputChange}
            loading={loading}
            modalError={modalError}
            setModalError={setModalError}
          />
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <BulkImportModal
            onClose={() => { setShowBulkModal(false); setBulkData([]); setBulkPreview([]); setBulkResults(null); setModalError(''); }}
            onFileUpload={handleFileUpload}
            onDownloadTemplate={downloadTemplate}
            onImport={handleBulkImport}
            bulkPreview={bulkPreview}
            bulkResults={bulkResults}
            bulkLoading={bulkLoading}
            modalError={modalError}
            setModalError={setModalError}
          />
        )}
      </AnimatePresence>

      {/* Delete Options Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedStaff && (
          <DeleteOptionsModal
            staff={selectedStaff}
            onClose={() => { setShowDeleteModal(false); setSelectedStaff(null); setDeleteType(null); }}
            onDeactivate={() => handleDeactivate(selectedStaff._id)}
            onPermanentDelete={() => handlePermanentDelete(selectedStaff._id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== Stat Card Component =====
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    emerald: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600'
  };
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
      <div className="flex items-center justify-between">
        <div><p className="text-gray-600 text-sm">{title}</p><p className="text-3xl font-bold text-gray-900 mt-2">{value}</p></div>
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center shadow-lg`}>
          <i className={`pi ${icon} text-white text-lg`}></i>
        </div>
      </div>
    </div>
  );
};

// ===== Action Button Component with disabled support =====
const ActionButton = ({ icon, color, onClick, title, disabled = false }) => {
  const colorClasses = {
    emerald: 'hover:bg-emerald-100 text-emerald-600',
    blue: 'hover:bg-blue-100 text-blue-600',
    red: 'hover:bg-red-100 text-red-600'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : colorClasses[color]}`}
      title={title}
    >
      <i className={`pi ${icon}`}></i>
    </button>
  );
};

// ===== Staff Modal Component with Status Toggle =====
const StaffModal = ({ formData, selectedStaff, onClose, onSubmit, onChange, loading, modalError }) => {
  const permissions = [
    { key: 'canViewAnalytics', label: 'View Analytics', icon: 'pi-chart-line' },
    { key: 'canGenerateCards', label: 'Generate Cards', icon: 'pi-id-card' },
    { key: 'canManageStudents', label: 'Manage Students', icon: 'pi-users' },
    { key: 'canManageTemplates', label: 'Manage Templates', icon: 'pi-image' },
    { key: 'canViewAuditLogs', label: 'View Audit Logs', icon: 'pi-history' },
    { key: 'canMarkAttendance', label: 'Mark Attendance', icon: 'pi-calendar' },
    { key: 'canUploadCSV', label: 'Upload CSV', icon: 'pi-file-excel' },
    { key: 'canUploadPhotos', label: 'Upload Photos', icon: 'pi-camera' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <i className="pi pi-times text-gray-600"></i>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <AnimatePresence>
            {modalError && (
              <motion.div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">{modalError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
              <input type="text" name="firstName" value={formData.firstName} onChange={onChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
              <input type="text" name="lastName" value={formData.lastName} onChange={onChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={onChange} required disabled={!!selectedStaff} className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={onChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          {/* Status Toggle - Only show in edit mode */}
          {selectedStaff && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-700">Account Status</span>
                  <p className="text-xs text-gray-500 mt-1">Toggle to activate or deactivate this staff member</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={onChange}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></label>
                </div>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {permissions.map((perm) => (
                <label key={perm.key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input type="checkbox" name={`perm_${perm.key}`} checked={formData.permissions?.[perm.key] || false} onChange={onChange} className="w-4 h-4 text-emerald-600 rounded" />
                  <div className="flex items-center space-x-2"><i className={`pi ${perm.icon} text-emerald-600`}></i><span className="text-sm font-medium text-gray-700">{perm.label}</span></div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{loading ? 'Saving...' : selectedStaff ? 'Update Staff' : 'Add Staff'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ===== Delete Options Modal =====
const DeleteOptionsModal = ({ staff, onClose, onDeactivate, onPermanentDelete }) => {
  const [confirmText, setConfirmText] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Delete Staff Member</h2>
          <p className="text-sm text-gray-600 mt-1">Choose an option for {staff.firstName} {staff.lastName}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Deactivate Option */}
          <button
            onClick={onDeactivate}
            className="w-full text-left p-4 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="pi pi-ban text-amber-600"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Deactivate Account</h3>
                <p className="text-sm text-gray-600">Staff member won't be able to login. Data is preserved. Can be reactivated later.</p>
              </div>
            </div>
          </button>

          {/* Permanent Delete Option */}
          <button
            onClick={onPermanentDelete}
            className="w-full text-left p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <i className="pi pi-trash text-red-600"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Permanently Delete</h3>
                <p className="text-sm text-gray-600">⚠️ This action cannot be undone. All staff data will be permanently removed.</p>
              </div>
            </div>
          </button>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button onClick={onClose} className="w-full px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ===== Bulk Import Modal Component =====
const BulkImportModal = ({ onClose, onFileUpload, onDownloadTemplate, onImport, bulkPreview, modalError, setModalError, bulkResults, setBulkResults, bulkLoading }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Bulk Import Staff</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><i className="pi pi-times text-gray-600"></i></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <AnimatePresence>
            {modalError && (
              <motion.div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800">{modalError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!bulkResults ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">📋 Instructions</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                  <li>Download the template file first</li>
                  <li>Fill in staff details in the Excel file</li>
                  <li>Use YES/NO for permission columns</li>
                  <li>Upload the filled file using the button below</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <button onClick={onDownloadTemplate} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl">
                  <i className="pi pi-download"></i><span>Download Template</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input type="file" id="bulkFile" accept=".xlsx,.xls,.csv" onChange={onFileUpload} className="hidden" />
                <label htmlFor="bulkFile" className="cursor-pointer flex flex-col items-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center"><i className="pi pi-upload text-emerald-600 text-2xl"></i></div>
                  <span className="text-lg font-medium text-gray-700">Click to upload file</span>
                  <span className="text-sm text-gray-500">Excel or CSV files only</span>
                </label>
              </div>

              {bulkPreview.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>{Object.keys(bulkPreview[0]).map(key => <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>)}</tr>
                      </thead>
                      <tbody>{bulkPreview.map((row, i) => (<tr key={i}>{Object.values(row).map((val, j) => <td key={j} className="px-4 py-2 text-sm text-gray-900">{String(val)}</td>)}</tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {bulkPreview.length > 0 && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg">Cancel</button>
                  <button onClick={onImport} disabled={bulkLoading} className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg disabled:opacity-50">
                    {bulkLoading ? <span className="flex items-center space-x-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Importing...</span></span> : 'Import Staff'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg ${bulkResults.success.length > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className="font-semibold text-lg mb-2">Import Results</h3>
                <p>✅ Success: {bulkResults.success.length}</p>
                <p>❌ Failed: {bulkResults.failed.length}</p>
                {bulkResults.success.length > 0 && <div className="mt-4"><h4 className="font-medium mb-2">Successfully Imported:</h4><ul>{bulkResults.success.map((item, i) => <li key={i}>{item.name} ({item.email})</li>)}</ul></div>}
                {bulkResults.failed.length > 0 && <div className="mt-4"><h4 className="font-medium mb-2 text-red-600">Failed:</h4><ul>{bulkResults.failed.map((item, i) => <li key={i}>{item.email}: {item.reason}</li>)}</ul></div>}
              </div>
              <div className="flex justify-end"><button onClick={onClose} className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg">Done</button></div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StaffManagement;