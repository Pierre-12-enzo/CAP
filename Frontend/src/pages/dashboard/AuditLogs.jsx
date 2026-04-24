// pages/dashboard/AuditLogs.jsx - FIXED OBJECT RENDERING & ENHANCED EXPORT
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Move actionCategories OUTSIDE the component
const ACTION_CATEGORIES = [
  { value: 'delete', label: '🗑️ Delete Actions', actions: ['DELETE_USER', 'DELETE_STAFF', 'DELETE_SCHOOL', 'DELETE_STUDENT', 'DELETE_CARD', 'DELETE_TEMPLATE', 'DELETE_PHOTO'] },
  { value: 'create', label: '✨ Create Actions', actions: ['CREATE_USER', 'CREATE_STAFF', 'CREATE_SCHOOL', 'CREATE_STUDENT', 'CREATE_TEMPLATE', 'CREATE_REGISTER'] },
  { value: 'update', label: '✏️ Update Actions', actions: ['UPDATE_USER', 'UPDATE_STAFF', 'UPDATE_SCHOOL', 'UPDATE_STUDENT', 'UPDATE_CARD', 'UPDATE_TEMPLATE', 'UPDATE_ATTENDANCE', 'UPDATE_SETTINGS', 'UPDATE_PERMISSIONS'] },
  { value: 'login', label: '🔐 Login Actions', actions: ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET'] },
  { value: 'card', label: '🪪 Card Actions', actions: ['GENERATE_CARD', 'UPDATE_CARD', 'DELETE_CARD', 'BULK_GENERATE_CARDS', 'PRINT_CARD', 'DOWNLOAD_CARD'] },
  { value: 'student', label: '👨‍🎓 Student Actions', actions: ['CREATE_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'BULK_CREATE_STUDENTS', 'IMPORT_STUDENTS_CSV', 'EXPORT_STUDENTS'] },
  { value: 'staff', label: '👥 Staff Actions', actions: ['CREATE_STAFF', 'UPDATE_STAFF', 'DELETE_STAFF', 'DEACTIVATE_STAFF', 'ACTIVATE_STAFF', 'UPDATE_STAFF_PERMISSIONS', 'RESEND_STAFF_INVITE', 'BULK_CREATE_STAFF'] },
  { value: 'attendance', label: '📋 Attendance Actions', actions: ['MARK_ATTENDANCE', 'BULK_MARK_ATTENDANCE', 'UPDATE_ATTENDANCE'] },
  { value: 'photo', label: '📸 Photo Actions', actions: ['UPLOAD_PHOTO', 'BULK_UPLOAD_PHOTOS', 'DELETE_PHOTO'] },
  { value: 'subscription', label: '💳 Subscription Actions', actions: ['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'INVOICE_GENERATED'] },
  { value: 'system', label: '⚙️ System Actions', actions: ['SYSTEM_ERROR', 'SYSTEM_WARNING', 'API_KEY_CREATED', 'API_KEY_REVOKED'] }
];

// Helper functions (don't depend on component state)
const getActionIcon = (action) => {
  if (!action) return 'pi-info-circle';
  if (action.includes('CREATE')) return 'pi-plus-circle';
  if (action.includes('UPDATE') || action.includes('EDIT')) return 'pi-pencil';
  if (action.includes('DELETE') || action.includes('DEACTIVATE')) return 'pi-trash';
  if (action.includes('LOGIN')) return 'pi-sign-in';
  if (action.includes('LOGOUT')) return 'pi-sign-out';
  if (action.includes('GENERATE')) return 'pi-qrcode';
  return 'pi-info-circle';
};

const getImportanceColor = (importance) => {
  switch (importance) {
    case 'critical': return 'bg-red-100 text-red-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status) => {
  if (status === 'success') return 'pi-check-circle text-green-500';
  return 'pi-times-circle text-red-500';
};

const getUserRoleColor = (role) => {
  switch (role) {
    case 'super_admin': return 'bg-purple-100 text-purple-700';
    case 'admin': return 'bg-blue-100 text-blue-700';
    case 'staff': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Safe helper to extract user name
const getUserName = (log) => {
  if (log?.userInfo && typeof log.userInfo === 'object' && log.userInfo.name) {
    return log.userInfo.name;
  }
  if (log?.userId && typeof log.userId === 'object' && log.userId.email) {
    return log.userId.email;
  }
  if (typeof log?.userId === 'string') {
    return log.userId;
  }
  return 'Unknown';
};

// Safe helper to get user email
const getUserEmail = (log) => {
  if (log?.userInfo && typeof log.userInfo === 'object' && log.userInfo.email) {
    return log.userInfo.email;
  }
  if (log?.userId && typeof log.userId === 'object' && log.userId.email) {
    return log.userId.email;
  }
  return '-';
};

// Safe helper for role
const getUserRole = (log) => {
  if (log?.userInfo && typeof log.userInfo === 'object' && log.userInfo.role) {
    return log.userInfo.role;
  }
  return 'staff';
};

// Safe helper for school name
const getSchoolName = (log) => {
  if (log?.schoolInfo && typeof log.schoolInfo === 'object' && log.schoolInfo.name) {
    return log.schoolInfo.name;
  }
  return '-';
};

// Generate Excel styles
const getExcelStyles = () => {
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, size: 12 },
    fill: { fgColor: { rgb: "059669" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "34D399" } },
      bottom: { style: "thin", color: { rgb: "34D399" } },
      left: { style: "thin", color: { rgb: "34D399" } },
      right: { style: "thin", color: { rgb: "34D399" } }
    }
  };

  const dataStyle = {
    alignment: { vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    }
  };

  const successStyle = {
    ...dataStyle,
    font: { color: { rgb: "059669" }, bold: true }
  };

  const failureStyle = {
    ...dataStyle,
    font: { color: { rgb: "DC2626" }, bold: true }
  };

  const criticalStyle = {
    ...dataStyle,
    font: { color: { rgb: "EA580C" }, bold: true },
    fill: { fgColor: { rgb: "FEF2F2" } }
  };

  const titleStyle = {
    font: { bold: true, size: 16, color: { rgb: "064E3B" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const subtitleStyle = {
    font: { size: 11, color: { rgb: "6B7280" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  return { headerStyle, dataStyle, successStyle, failureStyle, criticalStyle, titleStyle, subtitleStyle };
};

const AuditLogs = () => {
  const { user, token, socket } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState(null);
  const [accessibleUsers, setAccessibleUsers] = useState([]);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [pageLimit, setPageLimit] = useState(20);
  const lastFetchRef = useRef(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionCategory: '',
    actionType: '',
    userId: '',
    search: '',
    importance: '',
    status: ''
  });

  const [availableActions, setAvailableActions] = useState([]);

  // Check if current user is the log user
  const isCurrentUser = (log) => {
    const currentId = currentUserInfo?.id;
    if (log?.userId && typeof log.userId === 'object' && log.userId._id) {
      return currentId === log.userId._id;
    }
    if (typeof log?.userId === 'string') {
      return currentId === log.userId;
    }
    return false;
  };

  // Format userName
  const formatUserName = (log) => {
    const name = getUserName(log);
    if (isCurrentUser(log)) {
      return <span className="font-semibold text-emerald-600">You ({name})</span>;
    }
    return <span className="text-sm font-medium text-gray-900">{name}</span>;
  };

  const detectAnomalies = (logsList) => {
    const newAnomalies = [];

    const recentFailedLogins = logsList.filter(
      log => log.action === 'LOGIN_FAILED' &&
        log.status === 'failure' &&
        new Date(log.createdAt) > new Date(Date.now() - 5 * 60 * 1000)
    );

    if (recentFailedLogins.length >= 3) {
      newAnomalies.push({
        type: 'brute_force',
        severity: 'critical',
        message: `${recentFailedLogins.length} failed login attempts in 5 minutes`,
        users: [...new Set(recentFailedLogins.map(l => getUserEmail(l)))],
        timestamp: new Date()
      });
    }

    const massDeletions = logsList.filter(
      log => (log.action === 'DELETE_STUDENT' || log.action === 'DELETE_STAFF') &&
        new Date(log.createdAt) > new Date(Date.now() - 60 * 1000)
    );

    if (massDeletions.length >= 5) {
      newAnomalies.push({
        type: 'mass_deletion',
        severity: 'critical',
        message: `${massDeletions.length} deletions in 1 minute`,
        timestamp: new Date()
      });
    }

    setAnomalies(newAnomalies);
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super_admin':
        return { text: 'Super Admin View - Full System Audit', color: 'bg-purple-600' };
      case 'admin':
        return { text: 'Admin View - Your School & Staff', color: 'bg-blue-600' };
      case 'staff':
        return { text: 'Staff View - Your Actions & Peers', color: 'bg-emerald-600' };
      default:
        return { text: 'Audit Logs', color: 'bg-gray-600' };
    }
  };

  const showCriticalAlert = (criticalLog) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span>⚠️</span>
        <div>
          <p style="font-weight: bold;">Critical Security Event</p>
          <p style="font-size: 14px;">${criticalLog.action} - ${getUserName(criticalLog)}</p>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  // Initialize Socket.io listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('audit:new', (newLog) => {
      if (realtimeEnabled) {
        setLogs(prev => [newLog, ...prev.slice(0, pageLimit - 1)]);
        setNewLogsCount(prev => prev + 1);
        setTimeout(() => setNewLogsCount(0), 5000);
      }
    });

    socket.on('audit:critical', (criticalLog) => {
      showCriticalAlert(criticalLog);
    });

    return () => {
      socket.off('audit:new');
      socket.off('audit:critical');
    };
  }, [socket, realtimeEnabled, pageLimit]);

  // Update available actions when category changes
  useEffect(() => {
    if (filters.actionCategory) {
      const category = ACTION_CATEGORIES.find(c => c.value === filters.actionCategory);
      if (category) {
        setAvailableActions(category.actions);
      } else {
        setAvailableActions([]);
      }
    } else {
      setAvailableActions([]);
    }
  }, [filters.actionCategory]);

  // Build filter params
  const getFilterParams = useCallback(() => {
    let actionFilter = '';
    if (filters.actionType) {
      actionFilter = filters.actionType;
    } else if (filters.actionCategory) {
      const category = ACTION_CATEGORIES.find(c => c.value === filters.actionCategory);
      if (category) {
        actionFilter = category.actions.join(',');
      }
    }

    return {
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(actionFilter && { action: actionFilter }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.search && { search: filters.search }),
      ...(filters.importance && { importance: filters.importance }),
      ...(filters.status && { status: filters.status })
    };
  }, [filters]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const params = {
        page: pagination.page,
        limit: pageLimit,
        ...getFilterParams()
      };

      const response = await auditAPI.getAuditLogs(params);

      if (response.success) {
        setLogs(response.logs || []);
        setStats(response.stats);

        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.pages
          });
        }

        setAccessibleUsers(response.accessibleUsers || []);
        setCurrentUserInfo(response.currentUser);

        if (user?.role === 'super_admin') {
          detectAnomalies(response.logs || []);
        }

        lastFetchRef.current = new Date();
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [pagination.page, pageLimit, getFilterParams, user?.role]);

  // Fetch all filtered data (for export/print)
  const fetchAllFilteredData = useCallback(async () => {
    try {
      const params = {
        page: 1,
        limit: 10000, // Large limit to get all data
        ...getFilterParams()
      };

      const response = await auditAPI.getAuditLogs(params);

      if (response.success) {
        return response.logs || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching all filtered data:', error);
      return [];
    }
  }, [getFilterParams]);

  // Fetch on initial load
  useEffect(() => {
    fetchAuditLogs(true);
  }, []);

  // Fetch when page changes
  useEffect(() => {
    fetchAuditLogs(true);
  }, [pagination.page]);

  // Fetch when filters or pageLimit change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters, pageLimit]);

  // Real-time polling fallback
  useEffect(() => {
    if (!socket || !socket.connected) {
      const interval = setInterval(() => {
        fetchAuditLogs(false);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [socket, fetchAuditLogs]);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      actionCategory: '',
      actionType: '',
      userId: '',
      search: '',
      importance: '',
      status: ''
    });
  };

  // Handle page limit change
  const handlePageLimitChange = (newLimit) => {
    setPageLimit(newLimit);
  };

  // Export to Excel with professional styling
  const handleExport = async () => {
    setExporting(true);

    try {
      // Fetch ALL filtered data
      const allData = await fetchAllFilteredData();

      if (allData.length === 0) {
        alert('No logs to export');
        setExporting(false);
        return;
      }

      const styles = getExcelStyles();

      // Prepare export data
      const exportData = allData.map(log => ({
        'Timestamp': new Date(log.createdAt).toLocaleString(),
        'User': getUserName(log),
        'User Email': getUserEmail(log),
        'User Role': getUserRole(log),
        'Action': log.action?.replace(/_/g, ' ') || '-',
        'Status': log.status?.charAt(0).toUpperCase() + log.status?.slice(1) || '-',
        'Importance': log.importance?.charAt(0).toUpperCase() + log.importance?.slice(1) || 'Low',
        'School': getSchoolName(log),
        'IP Address': log.ipAddress || '-',
        'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '-'),
        'Error': log.errorMessage || '-'
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Calculate items per sheet (50 items per sheet)
      const ITEMS_PER_SHEET = 50;
      const totalSheets = Math.ceil(allData.length / ITEMS_PER_SHEET);

      for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
        const startIdx = sheetIndex * ITEMS_PER_SHEET;
        const endIdx = Math.min(startIdx + ITEMS_PER_SHEET, allData.length);
        const sheetData = exportData.slice(startIdx, endIdx);

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(sheetData);

        // Set column widths
        const colWidths = [
          { wch: 20 }, // Timestamp
          { wch: 20 }, // User
          { wch: 30 }, // User Email
          { wch: 15 }, // User Role
          { wch: 25 }, // Action
          { wch: 10 }, // Status
          { wch: 12 }, // Importance
          { wch: 20 }, // School
          { wch: 18 }, // IP Address
          { wch: 40 }, // Details
          { wch: 30 }  // Error
        ];
        ws['!cols'] = colWidths;

        // Apply styles to header row
        const headerRange = XLSX.utils.decode_range(ws['!ref']);
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
          if (ws[headerCell]) {
            ws[headerCell].s = styles.headerStyle;
          }
        }

        // Apply styles to data rows
        for (let R = 1; R <= sheetData.length; ++R) {
          const statusCell = XLSX.utils.encode_cell({ r: R, c: 5 }); // Status column
          const importanceCell = XLSX.utils.encode_cell({ r: R, c: 6 }); // Importance column

          // Style based on status
          if (ws[statusCell]) {
            ws[statusCell].s = sheetData[R - 1]['Status'] === 'Success' ? styles.successStyle : styles.failureStyle;
          }

          // Style based on importance
          if (ws[importanceCell] && sheetData[R - 1]['Importance'] === 'Critical') {
            ws[importanceCell].s = styles.criticalStyle;
          }

          // Apply base data style to all cells in row
          for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
            const cell = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws[cell] && !ws[cell].s) {
              ws[cell].s = styles.dataStyle;
            }
          }
        }

        // Add sheet to workbook
        const sheetName = totalSheets > 1 ? `Audit Logs - Page ${sheetIndex + 1}` : 'Audit Logs';
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Add title row at top (insert empty rows and add title)
        if (sheetIndex === 0) {
          // We'll add a summary sheet as the first sheet
          const summaryData = [
            { A: 'CAP MIS - Audit Logs Report' },
            { A: `Generated: ${new Date().toLocaleString()}` },
            { A: `Total Records: ${allData.length}` },
            { A: `Filters Applied: ${Object.entries(filters).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}` },
            { A: '' }
          ];

          const summaryWs = XLSX.utils.json_to_sheet(summaryData, { header: ['A'] });
          summaryWs['!cols'] = [{ wch: 80 }];

          // Style summary
          if (summaryWs['A1']) summaryWs['A1'].s = styles.titleStyle;
          if (summaryWs['A2']) summaryWs['A2'].s = styles.subtitleStyle;

          // Insert summary as first sheet
          const originalSheets = wb.SheetNames;
          const originalSheetData = {};
          originalSheets.forEach(name => {
            originalSheetData[name] = wb.Sheets[name];
            delete wb.Sheets[name];
          });

          wb.SheetNames = ['Summary', ...originalSheets];
          wb.Sheets['Summary'] = summaryWs;
          Object.entries(originalSheetData).forEach(([name, data]) => {
            wb.Sheets[name] = data;
          });
        }
      }

      // Generate and download
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const fileName = `audit_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      saveAs(blob, fileName);

      alert(`✅ Successfully exported ${allData.length} records across ${totalSheets} sheet(s)!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  // Print logs (multi-page support)
  const handlePrint = async () => {
    try {
      // Fetch ALL filtered data
      const allData = await fetchAllFilteredData();

      if (allData.length === 0) {
        alert('No logs to print');
        return;
      }

      const printWindow = window.open('', '_blank');
      const ITEMS_PER_PAGE = 30;
      const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);

      let allPagesHTML = '';

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const startIdx = pageIndex * ITEMS_PER_PAGE;
        const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, allData.length);
        const pageData = allData.slice(startIdx, endIdx);

        allPagesHTML += `
          <div class="page">
            <div class="header">
              <h1>CAP MIS - Audit Logs Report</h1>
              <p>Generated: ${new Date().toLocaleString()} | Total Records: ${allData.length}</p>
              ${totalPages > 1 ? `<p>Page ${pageIndex + 1} of ${totalPages}</p>` : ''}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Importance</th>
                  <th>School</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                ${pageData.map(log => `
                  <tr>
                    <td>${new Date(log.createdAt).toLocaleString()}</td>
                    <td>${getUserName(log)}</td>
                    <td>${getUserRole(log)}</td>
                    <td>${log.action?.replace(/_/g, ' ') || '-'}</td>
                    <td class="${log.status === 'success' ? 'success' : 'failure'}">${log.status}</td>
                    <td class="${log.importance === 'critical' ? 'critical' : ''}">${log.importance || 'low'}</td>
                    <td>${getSchoolName(log)}</td>
                    <td>${log.ipAddress || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Audit Logs Report</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #1f2937;
            }
            .page {
              page-break-after: always;
              padding: 20px;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 3px solid #059669;
            }
            .header h1 {
              color: #059669;
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .header p {
              color: #6b7280;
              margin: 5px 0;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background-color: #059669;
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .success {
              color: #059669;
              font-weight: bold;
            }
            .failure {
              color: #dc2626;
              font-weight: bold;
            }
            .critical {
              color: #ea580c;
              font-weight: bold;
              background-color: #fef2f2;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${allPagesHTML}
        </body>
        </html>
      `);

      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print logs');
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold">🔒 Audit Logs</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
                  {roleBadge.text}
                </span>
                {socket?.connected && (
                  <span className="px-2 py-1 bg-green-500 rounded-full text-xs flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </span>
                )}
              </div>
              <p className="text-emerald-200 text-sm mt-2">
                {user?.role === 'super_admin' && 'Complete system activity tracking across all schools with real-time updates'}
                {user?.role === 'admin' && 'Monitoring your school and staff activities'}
                {user?.role === 'staff' && 'Tracking your activities and peer staff actions'}
              </p>
            </div>
            <div className="flex space-x-3">
              {newLogsCount > 0 && (
                <button
                  onClick={() => { fetchAuditLogs(true); setNewLogsCount(0); }}
                  className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 animate-pulse"
                >
                  <i className="pi pi-refresh"></i>
                  <span>{newLogsCount} New</span>
                </button>
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <i className="pi pi-file-excel"></i>
                <span>{exporting ? 'Exporting...' : 'Export All'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <i className="pi pi-print"></i>
                <span>Print All</span>
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={realtimeEnabled}
              onChange={(e) => setRealtimeEnabled(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Real-time Updates</span>
          </label>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select
              value={pageLimit}
              onChange={(e) => handlePageLimitChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Updated: {lastFetchRef.current ? new Date(lastFetchRef.current).toLocaleTimeString() : '--:--:--'}
        </div>
      </div>

      {/* Anomaly Alerts */}
      {user?.role === 'super_admin' && anomalies.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="pi pi-exclamation-triangle text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800">⚠️ Critical Anomalies Detected</h3>
              <div className="mt-2 space-y-1">
                {anomalies.map((anomaly, idx) => (
                  <p key={idx} className="text-sm text-red-700">
                    • {anomaly.message} ({new Date(anomaly.timestamp).toLocaleTimeString()})
                  </p>
                ))}
              </div>
            </div>
            <button onClick={() => setAnomalies([])} className="text-red-500 hover:text-red-700">
              <i className="pi pi-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">🔍 Smart Filters</h3>
          <button
            onClick={resetFilters}
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
          >
            <i className="pi pi-trash text-xs"></i>
            <span>Clear All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importance</label>
            <select
              value={filters.importance}
              onChange={(e) => setFilters({ ...filters, importance: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Importance</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Status</option>
              <option value="success">✅ Success</option>
              <option value="failure">❌ Failure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Category</label>
            <select
              value={filters.actionCategory}
              onChange={(e) => setFilters({ ...filters, actionCategory: e.target.value, actionType: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Actions</option>
              {ACTION_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          {availableActions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Action</label>
              <select
                value={filters.actionType}
                onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All in Category</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
          {accessibleUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Users</option>
                {accessibleUsers.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Total Actions</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalCount?.[0]?.count || 0}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <i className="pi pi-chart-line text-white text-xs"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Success Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.successRate?.[0]?.success
                    ? ((stats.successRate[0].success / stats.successRate[0].total) * 100).toFixed(1) + '%'
                    : '0%'}
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <i className="pi pi-check-circle text-white text-xs"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Failures</p>
                <p className="text-xl font-bold text-red-600">{stats.successRate?.[0]?.failed || 0}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <i className="pi pi-times-circle text-white text-xs"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Critical Events</p>
                <p className="text-xl font-bold text-orange-600">
                  {stats.byImportance?.find(i => i._id === 'critical')?.count || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <i className="pi pi-exclamation-triangle text-white text-xs"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-emerald-200/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-emerald-200/30">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Importance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">School</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <i className="pi pi-inbox text-gray-400 text-4xl mb-2 block"></i>
                    <p className="text-gray-500">No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log._id || index} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-900">{new Date(log.createdAt).toLocaleTimeString()}</p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        {formatUserName(log)}
                        <span className="text-xs text-gray-500">{getUserEmail(log)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getUserRoleColor(getUserRole(log))}`}>
                        {getUserRole(log)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <i className={`pi ${getActionIcon(log.action)} text-emerald-500 text-sm`}></i>
                        <span className="text-sm text-gray-900">{log.action?.replace(/_/g, ' ') || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <i className={`pi ${getStatusIcon(log.status)} text-base`}></i>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(log.importance)}`}>
                        {log.importance || 'low'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-900">{getSchoolName(log)}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => { setSelectedLog(log); setShowDetailsModal(true); }}
                        className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center space-x-1 mx-auto"
                      >
                        <i className="pi pi-eye text-xs"></i>
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-200 gap-4">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pageLimit) + 1} to {Math.min(pagination.page * pageLimit, pagination.total)} of {pagination.total} logs
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (pagination.page > 1) {
                    setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                  }
                }}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <i className="pi pi-chevron-left text-xs mr-1"></i>
                Previous
              </button>
              <div className="flex space-x-1">
                {(() => {
                  const totalPages = pagination.pages;
                  const currentPage = pagination.page;
                  let pagesToShow = [];

                  if (totalPages <= 5) {
                    pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1);
                  } else if (currentPage <= 3) {
                    pagesToShow = [1, 2, 3, 4, '...', totalPages];
                  } else if (currentPage >= totalPages - 2) {
                    pagesToShow = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                  } else {
                    pagesToShow = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                  }

                  return pagesToShow.map((page, idx) => (
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-500">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setPagination(prev => ({ ...prev, page: Number(page) }))}
                        className={`w-8 h-8 rounded-lg transition-colors ${pagination.page === page
                          ? 'bg-emerald-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    )
                  ));
                })()}
              </div>
              <button
                onClick={() => {
                  if (pagination.page < pagination.pages) {
                    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                  }
                }}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Next
                <i className="pi pi-chevron-right text-xs ml-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center space-x-2 border border-emerald-200">
        <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-xs text-gray-600">
          {socket?.connected ? 'Real-time' : 'Polling'}
        </span>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-5 border-b border-gray-200 flex justify-between items-center z-10">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedLog.importance === 'critical' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                  <i className={`pi ${selectedLog.importance === 'critical' ? 'pi-exclamation-triangle text-red-600' : 'pi-info-circle text-emerald-600'}`}></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                  <p className="text-xs text-gray-500 font-mono">Event ID: {selectedLog._id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <i className="pi pi-times text-gray-600"></i>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Action</label>
                  <p className="text-base font-semibold text-gray-900">{selectedLog.action?.replace(/_/g, ' ') || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status & Importance</label>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedLog.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(selectedLog.importance)}`}>
                      {selectedLog.importance || 'medium'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">User</label>
                <p className="text-sm font-medium text-gray-900">
                  {getUserName(selectedLog)}
                  {isCurrentUser(selectedLog) && (
                    <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">You</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">Email: {getUserEmail(selectedLog)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${getUserRoleColor(getUserRole(selectedLog))}`}>
                    {getUserRole(selectedLog)}
                  </span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">School</label>
                <p className="text-sm font-medium text-gray-900">{getSchoolName(selectedLog)}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Timestamp</label>
                <p className="text-sm text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">IP Address</label>
                <code className="text-sm bg-white px-3 py-1 rounded border">{selectedLog.ipAddress || 'N/A'}</code>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">User Agent</label>
                <p className="text-xs font-mono text-gray-700 break-all">{selectedLog.userAgent || 'N/A'}</p>
              </div>

              {selectedLog.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <label className="block text-xs font-medium text-red-700 mb-2">Error</label>
                  <p className="text-sm text-red-700">{selectedLog.errorMessage}</p>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Details</label>
                  <pre className="bg-white p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-60 border">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;