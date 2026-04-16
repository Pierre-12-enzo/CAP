// components/dashboard/PermissionStudio.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { studentAPI, permissionAPI, analyticsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PermissionDocument from '../../components/PermissionDocument';

const PermissionStudio = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStudentSelect, setShowStudentSelect] = useState(false);
  const [createdPermissions, setCreatedPermissions] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const { user } = useAuth();

  // New states for analytics
  const [analytics, setAnalytics] = useState({
    summary: null,
    monthlyReport: null,
    trends: null,
    punctuality: null
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('monthly');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // New states for active permissions
  const [activePermissions, setActivePermissions] = useState([]);

  const printRef = useRef();

  // Permission form state
  const [permissionForms, setPermissionForms] = useState({});

  useEffect(() => {
    fetchStudents();
    fetchPermissions();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (analyticsTimeRange) {
      fetchTrends();
    }
  }, [analyticsTimeRange]);

  // Helper to check if any selected student has active permission
  const checkForActivePermissions = () => {
    return selectedStudents.some(student =>
      activePermissions.some(p => p.student?._id === student._id || p.student === student._id)
    );
  };

  // Add this useEffect to update when activePermissions change
  useEffect(() => {
    console.log('Active permissions updated:', activePermissions.length);
  }, [activePermissions]);

  const fetchStudents = async () => {
    try {
      const data = await studentAPI.getStudents();
      setStudents(data || []);
      console.log('Students', data)
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      console.log('🔍 Fetching permissions...');
      const response = await permissionAPI.getAll();

      // Check different possible response structures
      const permissionsData = response.data?.permissions ||
        response.data ||
        response.permissions ||
        [];

      console.log('✅ Permissions data fetched:', {
        count: permissionsData.length,
        firstItem: permissionsData[0]
      });

      setPermissions(permissionsData);

      // Update active permissions
      const approvedPermissions = permissionsData.filter(p =>
        p && (p.status === 'approved' || p.status === 'pending')
      );
      setActivePermissions(approvedPermissions);

    } catch (error) {
      console.error('❌ Error fetching permissions:', error);
      // Set empty array to prevent crashes
      setPermissions([]);
      setActivePermissions([]);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const now = new Date();

      // Fetch all data in parallel
      const [summaryRes, monthlyRes, punctualityRes] = await Promise.all([
        analyticsAPI.getDashboardSummary(),
        analyticsAPI.getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
        analyticsAPI.getReturnPunctuality()
      ]);

      setAnalytics({
        summary: summaryRes.summary || {},
        monthlyReport: monthlyRes.report || {},
        punctuality: punctualityRes.stats || {}
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        summary: {},
        monthlyReport: {},
        punctuality: {}
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const trendsRes = await analyticsAPI.getTrends(analyticsTimeRange);
      setAnalytics(prev => ({
        ...prev,
        trends: trendsRes.data?.trends || {}
      }));
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const handleStudentSelect = (student) => {
    if (!selectedStudents.find(s => s._id === student._id)) {
      setSelectedStudents(prev => [...prev, student]);
      // Initialize form for this student
      setPermissionForms(prev => ({
        ...prev,
        [student._id]: {
          reason: '',
          destination: '',
          guardian: { name: '', relationship: '', phone: '' },
          returnDate: '',
          departure: new Date().toISOString().split('T')[0]
        }
      }));
    }
    setShowStudentSelect(false);
    setSearchTerm('');
  };

  const removeStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(s => s._id !== studentId));
    setPermissionForms(prev => {
      const newForms = { ...prev };
      delete newForms[studentId];
      return newForms;
    });
  };

  const handleFormChange = (studentId, field, value) => {
    setPermissionForms(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleGuardianChange = (studentId, field, value) => {
    setPermissionForms(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        guardian: {
          ...prev[studentId].guardian,
          [field]: value
        }
      }
    }));
  };

  // Handle create permissions
  // In PermissionStudio.jsx, update the createPermissions function:

  const createPermissions = async () => {
    // Check if any student has active permission BEFORE trying to create
    const studentsWithActivePermission = selectedStudents.filter(student =>
      activePermissions.some(p => p.student?._id === student._id || p.student === student._id)
    );

    if (studentsWithActivePermission.length > 0) {
      alert(`❌ Cannot create permissions for students with active permissions:\n\n${studentsWithActivePermission.map(s => `• ${s.name}`).join('\n')
        }\n\nPlease mark their current permissions as returned first.`);
      return;
    }

    setLoading(true);
    try {
      // Validate forms
      const validationErrors = [];
      selectedStudents.forEach(student => {
        const form = permissionForms[student._id];
        if (!form?.reason?.trim()) validationErrors.push(`${student.name}: Reason is required`);
        if (!form?.destination?.trim()) validationErrors.push(`${student.name}: Destination is required`);
        if (!form?.guardian?.name?.trim()) validationErrors.push(`${student.name}: Guardian name is required`);
        if (!form?.returnDate) validationErrors.push(`${student.name}: Return date is required`);
      });

      if (validationErrors.length > 0) {
        alert(`Please fix the following errors:\n\n${validationErrors.join('\n')}`);
        setLoading(false);
        return;
      }

      // Prepare data with timeout protection
      const permissionsData = selectedStudents.map(student => {
        const form = permissionForms[student._id];
        return {
          student: student._id,
          studentName: student.name, // Include as backup
          studentId: student.student_id,
          studentClass: student.class,
          reason: form.reason.trim(),
          destination: form.destination.trim(),
          guardian: {
            name: form.guardian.name.trim(),
            relationship: form.guardian.relationship || 'Parent',
            phone: form.guardian.phone || ''
          },
          returnDate: form.returnDate,
          departure: form.departure || new Date().toISOString().split('T')[0],
          createdBy: user?._id || user?.id || 'system'
        };
      });

      console.log('Creating permissions:', permissionsData);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout. The server is taking too long to respond.'));
        }, 30000); // 30 second timeout
      });

      // Call the API with timeout protection
      let result;
      if (permissionsData.length === 1) {
        result = await Promise.race([
          permissionAPI.create(permissionsData[0]),
          timeoutPromise
        ]);
      } else {
        result = await Promise.race([
          permissionAPI.createBulk(permissionsData),
          timeoutPromise
        ]);
      }

      console.log('Creation result:', result);

      // Handle response
      let newPermissions = [];

      if (result && result.success !== false) {
        if (result.permissions) {
          if (Array.isArray(result.permissions)) {
            newPermissions = result.permissions;
          } else {
            newPermissions = [result.permissions];
          }
        } else if (result.permission) {
          newPermissions = [result.permission];
        } else {
          newPermissions = [result];
        }

        console.log('✅ Permissions created successfully:', newPermissions);

        // Show success message with auto-close
        const successMessage = document.createElement('div');
        successMessage.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
          max-width: 400px;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 40px;
              height: 40px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
            ">
              ✓
            </div>
            <div>
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                Success!
              </div>
              <div style="font-size: 14px; opacity: 0.9;">
                Created ${newPermissions.length} permission(s) successfully!
              </div>
            </div>
          </div>
        </div>
        <style>
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        </style>
      `;

        document.body.appendChild(successMessage);

        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
              if (successMessage.parentNode) {
                document.body.removeChild(successMessage);
              }
            }, 300);
          }
        }, 3000);

        // Set created permissions for printing
        setCreatedPermissions(newPermissions);
        setPrintMode(true);
        setShowPrintModal(true);

        // Refresh data in background
        setTimeout(() => {
          fetchPermissions();
          fetchAnalytics();
        }, 1000);

      } else {
        throw new Error(result?.message || result?.error || 'Failed to create permissions');
      }

    } catch (error) {
      console.error('Error creating permissions:', error);

      // Check if it's a timeout error
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        // Show user-friendly timeout message
        const timeoutMessage = document.createElement('div');
        timeoutMessage.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.4);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
          max-width: 400px;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 40px;
              height: 40px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
            ">
              ⏱️
            </div>
            <div>
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                Processing...
              </div>
              <div style="font-size: 14px; opacity: 0.9;">
                Request timed out. Permissions may still be created.<br>
                <button onclick="location.reload()" style="
                  margin-top: 8px;
                  background: rgba(255, 255, 255, 0.2);
                  border: none;
                  color: white;
                  padding: 6px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 12px;
                ">
                  ↻ Refresh to check
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

        document.body.appendChild(timeoutMessage);

        // Auto-refresh after 5 seconds
        setTimeout(() => {
          if (timeoutMessage.parentNode) {
            document.body.removeChild(timeoutMessage);
          }
          fetchPermissions(); // Refresh to check if permissions were created
          fetchAnalytics();
        }, 5000);

      } else {
        // Regular error handling
        let errorMessage = 'Failed to create permissions: ';

        if (error.response?.data) {
          if (error.response.data.details) {
            errorMessage += error.response.data.details.join(', ');
          } else if (error.response.data.error) {
            errorMessage += error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage += error.response.data.message;
          } else {
            errorMessage += JSON.stringify(error.response.data);
          }
        } else {
          errorMessage += error.message;
        }

        alert(`❌ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Mark as returned function
  const handleMarkReturned = async (permissionId) => {
    try {
      const response = await permissionAPI.updateStatus(permissionId, {
        status: 'returned'
      });

      // Update local state
      setPermissions(prev => prev.map(p =>
        p._id === permissionId
          ? { ...p, status: 'returned', returnedAt: new Date() }
          : p
      ));

      // Update active permissions
      setActivePermissions(prev => prev.filter(p => p._id !== permissionId));

      // Refresh analytics
      fetchAnalytics();

      alert('✅ Permission marked as returned successfully!');
      return response;
    } catch (error) {
      console.error('Error marking as returned:', error);
      alert(`Failed to mark as returned: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  };

  // REACT-TO-PRINT CONFIGURATION - FIXED
  const handlePrintNow = () => {
    console.log('🖨️ Triggering print...');

    if (createdPermissions.length === 0) {
      alert('No permission documents to print.');
      return;
    }

    // Create a print window
    const printWindow = window.open('', '_blank', 'width=1100,height=700,scrollbars=yes');

    if (!printWindow) {
      alert('Please allow pop-ups to print the document.');
      return;
    }

    // Create HTML content with ULTRA-COMPACT design
    const printContent = createdPermissions.map((permission, index) => {
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return 'Invalid Date';
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        } catch (error) {
          return 'Invalid Date';
        }
      };

      const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
          return '';
        }
      };

      return `
      <div class="permission-document" style="
        background: white;
        color: #1f2937;
        padding: 8mm 10mm;
        margin: 0 auto;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        font-family: 'Segoe UI', Arial, sans-serif;
        ${index < createdPermissions.length - 1 ? 'page-break-after: always;' : ''}
      ">
        <!-- Ultra-Compact Border -->
        <div style="
          border: 1.5px solid #059669;
          border-radius: 6px;
          padding: 8mm;
          position: relative;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        ">
          
          <!-- SUPER COMPACT Header -->
          <div style="
            text-align: center;
            margin-bottom: 4mm;
            border-bottom: 1px solid #a7f3d0;
            padding-bottom: 2mm;
            flex-shrink: 0;
          ">
            <h1 style="
              font-size: 18pt;
              font-weight: bold;
              color: #065f46;
              margin: 0 0 1mm 0;
              line-height: 1;
              letter-spacing: 0.5px;
            ">
              OFFICIAL PERMISSION SLIP
            </h1>
            <div style="
              width: 50mm;
              height: 0.5px;
              background: linear-gradient(to right, #34d399, #22d3ee);
              margin: 0 auto 1mm;
            "></div>
            <p style="font-size: 9pt; color: #4b5563; margin: 0; font-weight: 500;">
              School Authorization Document
            </p>
          </div>

          <!-- MAIN CONTENT - 2 columns with minimal padding -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5mm;
            margin-bottom: 4mm;
            flex: 1;
            min-height: 0;
          ">
            <!-- LEFT COLUMN: Student & Guardian -->
            <div style="display: flex; flex-direction: column; gap: 4mm;">
              <!-- Student Info - COMPACT -->
              <div style="
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 4px;
                padding: 2.5mm;
                flex: 1;
              ">
                <div style="
                  font-size: 8.5pt;
                  font-weight: 700;
                  color: #0369a1;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                  margin-bottom: 1.5mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px dashed #bae6fd;
                ">
                  <i style="font-style: normal;">👤</i> STUDENT INFORMATION
                </div>
                <table style="width: 100%; font-size: 8.5pt; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600; width: 38%; vertical-align: top;">Full Name:</td>
                    <td style="padding: 0.8mm 0; font-weight: 700; color: #1e40af;">${permission.student?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Student ID:</td>
                    <td style="padding: 0.8mm 0; font-family: 'Courier New', monospace; font-weight: 600;">
                      ${permission.student?.student_id || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Class:</td>
                    <td style="padding: 0.8mm 0; font-weight: 600;">${permission.student?.class || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Parent Phone:</td>
                    <td style="padding: 0.8mm 0;">${permission.student?.parent_phone || 'N/A'}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Guardian Info - COMPACT -->
              <div style="
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 4px;
                padding: 2.5mm;
                flex: 1;
              ">
                <div style="
                  font-size: 8.5pt;
                  font-weight: 700;
                  color: #dc2626;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                  margin-bottom: 1.5mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px dashed #fecaca;
                ">
                  <i style="font-style: normal;">🛡️</i> GUARDIAN INFORMATION
                </div>
                <table style="width: 100%; font-size: 8.5pt; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600; width: 38%;">Name:</td>
                    <td style="padding: 0.8mm 0; font-weight: 700;">${permission.guardian?.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Relationship:</td>
                    <td style="padding: 0.8mm 0;">${permission.guardian?.relationship || 'N/A'}</td>
                  </tr>
                  ${permission.guardian?.phone ? `
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Phone:</td>
                    <td style="padding: 0.8mm 0; color: #1d4ed8; font-weight: 600;">${permission.guardian.phone}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </div>

            <!-- RIGHT COLUMN: Permission Details & Purpose -->
            <div style="display: flex; flex-direction: column; gap: 4mm;">
              <!-- Permission Details - COMPACT -->
              <div style="
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 4px;
                padding: 2.5mm;
                flex: 1;
              ">
                <div style="
                  font-size: 8.5pt;
                  font-weight: 700;
                  color: #059669;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                  margin-bottom: 1.5mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px dashed #bbf7d0;
                ">
                  <i style="font-style: normal;">📋</i> PERMISSION DETAILS
                </div>
                <table style="width: 100%; font-size: 8.5pt; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600; width: 42%;">Permission #:</td>
                    <td style="padding: 0.8mm 0; font-family: 'Courier New', monospace; font-weight: 700; color: #065f46;">
                      ${permission.permissionNumber || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Issue Date:</td>
                    <td style="padding: 0.8mm 0;">${formatDate(permission.createdAt)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Departure:</td>
                    <td style="padding: 0.8mm 0;">${formatDate(permission.departure)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Return Date:</td>
                    <td style="padding: 0.8mm 0; font-weight: 700; color: #059669;">
                      ${formatDate(permission.returnDate)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0.8mm 0; font-weight: 600;">Status:</td>
                    <td style="padding: 0.8mm 0; font-weight: 700; color: ${permission.status === 'approved' ? '#059669' : '#d97706'}">
                      ${permission.status?.toUpperCase() || 'PENDING'}
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Purpose & Destination - COMPACT -->
              <div style="
                background: #fef3c7;
                border: 1px solid #fde68a;
                border-radius: 4px;
                padding: 2.5mm;
                flex: 1;
                display: flex;
                flex-direction: column;
              ">
                <div style="
                  font-size: 8.5pt;
                  font-weight: 700;
                  color: #d97706;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                  margin-bottom: 1.5mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px dashed #fde68a;
                ">
                  <i style="font-style: normal;">🎯</i> PURPOSE & DESTINATION
                </div>
                
                <div style="flex: 1; display: flex; flex-direction: column; gap: 2mm;">
                  <div style="flex: 1;">
                    <div style="font-size: 7.5pt; font-weight: 600; color: #78350f; margin-bottom: 0.5mm;">
                      REASON FOR PERMISSION:
                    </div>
                    <div style="
                      background: white;
                      border: 1px solid #fbbf24;
                      border-radius: 3px;
                      padding: 1.5mm;
                      font-size: 8.5pt;
                      font-weight: 500;
                      min-height: 12mm;
                      line-height: 1.3;
                    ">
                      ${permission.reason || 'No reason provided'}
                    </div>
                  </div>
                  
                  <div style="flex: 1;">
                    <div style="font-size: 7.5pt; font-weight: 600; color: #78350f; margin-bottom: 0.5mm;">
                      DESTINATION ADDRESS:
                    </div>
                    <div style="
                      background: white;
                      border: 1px solid #fbbf24;
                      border-radius: 3px;
                      padding: 1.5mm;
                      font-size: 8.5pt;
                      font-weight: 500;
                      min-height: 8mm;
                      line-height: 1.3;
                    ">
                      ${permission.destination || 'No destination provided'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BOTTOM SECTION - ULTRA COMPACT (2mm padding) -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 3mm;
            margin-top: 2mm;
            flex-shrink: 0;
            padding-top: 2mm;
            border-top: 1px dashed #d1d5db;
          ">
            <!-- SMS Status - TINY -->
            <div style="
              background: linear-gradient(135deg, #fce7f3, #fbcfe8);
              border: 1px solid #f9a8d4;
              border-radius: 3px;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
            ">
              <div style="
                font-size: 7.5pt;
                font-weight: 700;
                color: #be185d;
                text-transform: uppercase;
                letter-spacing: 0.2px;
                margin-bottom: 1mm;
              ">
                📱 NOTIFICATION
              </div>
              <div style="display: flex; align-items: center; gap: 1.5mm; margin-bottom: 0.5mm;">
                <div style="
                  width: 5px;
                  height: 5px;
                  border-radius: 50%;
                  background: ${permission.smsNotifications?.permissionCreated?.sent ? '#10b981' : '#9ca3af'};
                "></div>
                <span style="font-size: 7.5pt; font-weight: 600;">
                  ${permission.smsNotifications?.permissionCreated?.sent ? 'SMS SENT' : 'SMS PENDING'}
                </span>
              </div>
              ${permission.smsNotifications?.permissionCreated?.sentAt ? `
              <div style="font-size: 6.5pt; color: #6b7280; line-height: 1.2;">
                ${formatDate(permission.smsNotifications.permissionCreated.sentAt)} ${formatTime(permission.smsNotifications.permissionCreated.sentAt)}
              </div>
              ` : ''}
            </div>

            <!-- Guardian Signature - TINY -->
            <div style="
              border: 1px solid #d1d5db;
              border-radius: 3px;
              padding: 2mm;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            ">
              <div style="
                font-size: 7.5pt;
                font-weight: 700;
                color: #4b5563;
                text-transform: uppercase;
                letter-spacing: 0.2px;
                margin-bottom: 1.5mm;
              ">
                ✍️ GUARDIAN SIGNATURE
              </div>
              <div style="
                height: 12mm;
                border-bottom: 1px solid #9ca3af;
                margin-bottom: 1mm;
              "></div>
              <div style="font-size: 6.5pt; color: #6b7280; font-weight: 500; line-height: 1.2;">
                ${permission.guardian?.name || 'Guardian Name'}
              </div>
              <div style="font-size: 6pt; color: #9ca3af; margin-top: 0.5mm;">
                Date: ${formatDate(permission.departure)}
              </div>
            </div>

            <!-- School Signature - TINY -->
            <div style="
              border: 1px solid #d1d5db;
              border-radius: 3px;
              padding: 2mm;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            ">
              <div style="
                font-size: 7.5pt;
                font-weight: 700;
                color: #4b5563;
                text-transform: uppercase;
                letter-spacing: 0.2px;
                margin-bottom: 1.5mm;
              ">
                🏫 SCHOOL AUTHORITY
              </div>
              <div style="
                height: 12mm;
                border-bottom: 1px solid #9ca3af;
                margin-bottom: 1mm;
              "></div>
              <div style="font-size: 6.5pt; color: #6b7280; font-weight: 500; line-height: 1.2;">
                Approved by: ${user?.firstName || ''} ${user?.lastName || ''}
              </div>
              <div style="font-size: 6.5pt; color: #6b7280; margin-top: 0.5mm;">
                Date: ${formatDate(permission.createdAt)}
              </div>
              <div style="font-size: 6pt; color: #9ca3af; margin-top: 0.5mm;">
                Time: ${formatTime(permission.createdAt)}
              </div>
            </div>
          </div>

          <!-- MICRO Footer -->
          <div style="
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 0.5px solid #e5e7eb;
            text-align: center;
            font-size: 5.5pt;
            color: #6b7280;
            line-height: 1.2;
            flex-shrink: 0;
          ">
            <div style="margin-bottom: 0.5mm; font-weight: 500;">
              ⚠️ Official School Document • Unauthorized Duplication Prohibited
            </div>
            <div>
              ID: ${permission._id?.substring(0, 8) || 'N/A'} • Generated: ${formatDate(permission.createdAt)} ${formatTime(permission.createdAt)}
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Create the complete HTML document
    const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Permissions - ${new Date().toLocaleDateString()}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Segoe UI', Arial, sans-serif !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .permission-document {
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
          }
          
          /* Force one page per document */
          .permission-document:last-child {
            page-break-after: auto !important;
          }
          
          /* Prevent text from being cut */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        @media screen {
          body {
            font-family: 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            padding: 0;
            margin: 0;
            overflow-x: hidden;
          }
          
          .print-controls {
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 10000;
            display: flex;
            gap: 8px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 14px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          }
          
          .print-btn, .close-btn {
            padding: 9px 18px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
          }
          
          .print-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
          }
          
          .print-btn:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          }
          
          .close-btn {
            background: #64748b;
            color: white;
            box-shadow: 0 2px 10px rgba(100, 116, 139, 0.3);
          }
          
          .close-btn:hover {
            background: #475569;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(100, 116, 139, 0.4);
          }
          
          .print-instructions {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px 24px;
            margin: 70px auto 25px;
            max-width: 800px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          }
          
          .print-instructions h3 {
            color: #0f172a;
            margin: 0 0 14px 0;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .print-instructions ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .print-instructions li {
            padding: 6px 0;
            color: #475569;
            font-size: 14px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            line-height: 1.5;
          }
          
          .print-instructions li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            flex-shrink: 0;
            font-size: 13px;
            margin-top: 1px;
          }
          
          .documents-container {
            margin: 25px auto;
            max-width: 900px;
            padding: 0 20px;
          }
          
          .page-counter {
            position: fixed;
            bottom: 15px;
            right: 15px;
            background: rgba(15, 23, 42, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            z-index: 10000;
            backdrop-filter: blur(4px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          
          /* Scale preview for screen */
          .permission-document {
            transform: scale(0.8);
            transform-origin: top center;
            margin: 0 auto 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border-radius: 8px;
            overflow: hidden;
          }
          
          @media screen and (max-width: 1200px) {
            .permission-document {
              transform: scale(0.75);
            }
          }
          
          @media screen and (max-width: 992px) {
            .permission-document {
              transform: scale(0.7);
            }
            
            .documents-container {
              padding: 0 10px;
            }
          }
          
          @media screen and (max-width: 768px) {
            .permission-document {
              transform: scale(0.65);
            }
            
            .print-controls {
              flex-direction: column;
              top: 10px;
              right: 10px;
            }
            
            .print-instructions {
              margin: 100px 15px 20px;
              padding: 16px;
            }
          }
          
          @media screen and (max-width: 480px) {
            .permission-document {
              transform: scale(0.55);
            }
          }
        }
      </style>
    </head>
    <body>
      <div class="print-controls no-print">
        <button class="print-btn" onclick="window.print()" title="Open Print Dialog">
          🖨️ Print All (${createdPermissions.length})
        </button>
        <button class="close-btn" onclick="window.close()" title="Close Window">
          ✕ Close
        </button>
      </div>
      
      <div class="print-instructions no-print">
        <h3>📄 Ready to Print</h3>
        <ul>
          <li>Each permission is optimized to fit on <strong>one A4 landscape page</strong></li>
          <li>Click "Print All" above or use <strong>Ctrl+P (Cmd+P on Mac)</strong></li>
          <li><strong>Landscape orientation</strong> is automatically selected</li>
          <li>For best results: enable <strong>"Background Graphics"</strong> in print settings</li>
          <li>To save digitally: choose <strong>"Save as PDF"</strong> as printer</li>
          ${createdPermissions.length > 1 ? `<li>You have <strong>${createdPermissions.length} document(s)</strong> to print</li>` : ''}
        </ul>
      </div>
      
      <div class="documents-container">
        ${printContent}
      </div>
      
      ${createdPermissions.length > 1 ? `
      <div class="page-counter no-print">
        📄 ${createdPermissions.length} Document${createdPermissions.length > 1 ? 's' : ''} • ${createdPermissions.length} Page${createdPermissions.length > 1 ? 's' : ''}
      </div>
      ` : ''}
      
      <script>
        // Focus window for better UX
        setTimeout(() => {
          window.focus();
          // Scroll to first document
          window.scrollTo(0, 0);
        }, 200);
        
        // Optional: Uncomment for auto-print
        // setTimeout(() => {
        //   console.log('Auto-printing...');
        //   window.print();
        // }, 1500);
        
        // Close window after printing
        let hasPrinted = false;
        window.onafterprint = function() {
          if (!hasPrinted) {
            hasPrinted = true;
            setTimeout(() => {
              window.close();
            }, 800);
          }
        };
      </script>
    </body>
    </html>
  `;

    // Write to the new window
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleOpenPrintModal = () => {
    setShowPrintModal(true);
  };

  const handleClosePrintModal = () => {
    setShowPrintModal(false);
    setPrintMode(false);
    setCreatedPermissions([]);
    setSelectedStudents([]);
    setPermissionForms({});
  };



  // Auto-open print modal when permissions are created
  useEffect(() => {
    if (printMode && createdPermissions.length > 0) {
      console.log('🎯 Auto-opening print modal');
      setShowPrintModal(true);

      // Small delay before auto-print (optional)
      // setTimeout(() => handlePrintNow(), 500);
    }
  }, [printMode, createdPermissions]);

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      (student.name?.toLowerCase() || '').includes(searchLower) ||
      (student.student_id?.toLowerCase() || '').includes(searchLower) ||
      (student.class?.toLowerCase() || '').includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
          Permission Studio
        </h1>
        <p className="text-gray-400 text-lg">
          Manage student permissions with professional documentation
        </p>
      </div>

      {/* Analytics Dashboard Toggle */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <i className={`pi ${showAnalytics ? 'pi-chart-line' : 'pi-chart-bar'}`}></i>
          <span>{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
        </button>
      </div>

      {/* Analytics Dashboard Section */}
      {showAnalytics && (
        <AnalyticsDashboard
          analytics={analytics}
          loadingAnalytics={loadingAnalytics}
          timeRange={analyticsTimeRange}
          onTimeRangeChange={setAnalyticsTimeRange}
        />
      )}

      {/* Student Selection */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-emerald-500/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Create Student Permissions
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowStudentSelect(!showStudentSelect)}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2"
            >
              <i className="pi pi-plus"></i>
              <span>Add Students Permission</span>
            </button>

            {/* Student Search Dropdown */}
            {showStudentSelect && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-gray-800 border border-emerald-500/30 rounded-xl shadow-2xl z-10">
                <div className="p-4 border-b border-gray-700">
                  <div className="relative">
                    <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Search students... (type to filter)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                      autoFocus
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {!searchTerm.trim() ? 'Showing recent students' : `Searching for: "${searchTerm}"`}
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredStudents.length > 0 ? (
                    <>
                      {!searchTerm.trim() && filteredStudents.length > 10 && (
                        <div className="px-4 py-2 bg-emerald-900/20 border-b border-emerald-500/20">
                          <div className="text-xs text-emerald-300 flex items-center">
                            <i className="pi pi-info-circle mr-1"></i>
                            Showing 10 of {filteredStudents.length} students. Type to search...
                          </div>
                        </div>
                      )}

                      {(searchTerm.trim() ? filteredStudents : filteredStudents.slice(0, 10)).map(student => (
                        <button
                          key={student._id}
                          onClick={() => handleStudentSelect(student)}
                          className="w-full text-left p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                        >
                          <div className="text-white font-medium">{student.name}</div>
                          <div className="text-gray-400 text-sm">
                            {student.student_id} • {student.class}
                          </div>
                        </button>
                      ))}

                      {!searchTerm.trim() && filteredStudents.length > 10 && (
                        <button
                          onClick={() => setSearchTerm(' ')}
                          className="w-full text-center p-3 text-cyan-400 hover:text-cyan-300 hover:bg-gray-700/50 transition-colors border-t border-gray-700"
                        >
                          <div className="flex items-center justify-center">
                            <i className="pi pi-list mr-2"></i>
                            View All Students ({filteredStudents.length})
                          </div>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <i className="pi pi-user-slash text-3xl text-gray-600 mb-3"></i>
                      <p className="text-gray-400 font-medium">No students found</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {searchTerm.trim() ? `No match for "${searchTerm}"` : 'No students available'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Students */}
        {selectedStudents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {selectedStudents.map(student => (
              <div key={student._id} className="bg-gray-800/50 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-semibold">{student.name}</h3>
                    <p className="text-gray-400 text-sm">{student.student_id} • {student.class}</p>
                  </div>
                  <button
                    onClick={() => removeStudent(student._id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <i className="pi pi-times"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Forms */}
      {selectedStudents.length > 0 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-cyan-500/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Permission Details</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {selectedStudents.map(student => (
                <PermissionForm
                  key={student._id}
                  student={student}
                  formData={permissionForms[student._id] || {}}
                  onChange={handleFormChange}
                  onGuardianChange={handleGuardianChange}
                  hasActivePermission={activePermissions.some(p =>
                    p.student?._id === student._id || p.student === student._id
                  )}
                />
              ))}
            </div>


            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setSelectedStudents([]);
                  setPermissionForms({});
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-300"
              >
                Cancel
              </button>

              {/* Check if any selected student has active permission */}
              {(() => {
                const hasActivePermissionStudent = selectedStudents.some(student =>
                  activePermissions.some(p => p.student?._id === student._id || p.student === student._id)
                );

                const isFormValid = selectedStudents.every(student => {
                  const form = permissionForms[student._id];
                  return form?.reason?.trim() &&
                    form?.destination?.trim() &&
                    form?.guardian?.name?.trim() &&
                    form?.returnDate;
                });

                const isDisabled = loading ||
                  selectedStudents.length === 0 ||
                  !isFormValid ||
                  hasActivePermissionStudent;

                let tooltipText = '';
                if (selectedStudents.length === 0) {
                  tooltipText = 'Please select at least one student';
                } else if (!isFormValid) {
                  tooltipText = 'Please fill all required fields';
                } else if (hasActivePermissionStudent) {
                  tooltipText = 'Some students have active permissions';
                }

                return (
                  <div className="relative group">
                    <button
                      onClick={createPermissions}
                      disabled={isDisabled}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 relative"
                    >
                      {loading ? (
                        <>
                          <i className="pi pi-spin pi-spinner"></i>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          {hasActivePermissionStudent ? (
                            <i className="pi pi-exclamation-triangle"></i>
                          ) : (
                            <i className="pi pi-save"></i>
                          )}
                          <span>
                            {hasActivePermissionStudent ? 'Cannot Create' : `Create Permissions (${selectedStudents.length})`}
                          </span>
                        </>
                      )}
                    </button>

                    {tooltipText && (
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
                        <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                          <div className="absolute bottom-0 right-3 -mb-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                          {tooltipText}
                        </div>
                      </div>
                    )}

                    {/* Active permission warning badge */}
                    {hasActivePermissionStudent && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-lg flex items-center space-x-1 z-10">
                        <i className="pi pi-exclamation-triangle text-xs"></i>
                        <span>Active Permission</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Student Stats */}
      <StudentStats />

      {/* Permission History with Return Functionality */}
      <PermissionHistory
        permissions={permissions}
        onMarkReturned={handleMarkReturned}
        fetchPermissions={fetchPermissions}
      />

      {/* SMS Dashboard */}
      <SMSDashboard permissions={permissions} />

      {/* Print Preview Modal */}
      {showPrintModal && createdPermissions.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white">Ready to Print</h2>
                <p className="text-gray-400">
                  {createdPermissions.length} permission document(s) created successfully
                </p>
              </div>
              <button
                onClick={handleClosePrintModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                <i className="pi pi-times"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <i className="pi pi-check text-2xl text-emerald-400"></i>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">
                  Permissions Created Successfully!
                </h3>
                <p className="text-gray-300 text-center">
                  Your permission documents are ready for printing. Click "Open Print Window"
                  to view and print the documents.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">Document Summary</h4>
                <div className="space-y-2">
                  {createdPermissions.slice(0, 3).map((perm, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                      <div>
                        <span className="text-white font-medium">{perm.student?.name}</span>
                        <span className="text-gray-400 text-sm ml-2">• {perm.student?.class}</span>
                      </div>
                      <span className="text-emerald-400 text-sm">{perm.permissionNumber}</span>
                    </div>
                  ))}
                  {createdPermissions.length > 3 && (
                    <div className="text-center text-gray-400 text-sm py-2">
                      + {createdPermissions.length - 3} more document(s)
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-gray-300 font-medium mb-2 flex items-center">
                  <i className="pi pi-info-circle text-cyan-400 mr-2"></i>
                  Print Instructions
                </h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li className="flex items-start">
                    <i className="pi pi-check text-green-400 mr-2 mt-0.5"></i>
                    <span>A new window will open with the print-ready documents</span>
                  </li>
                  <li className="flex items-start">
                    <i className="pi pi-check text-green-400 mr-2 mt-0.5"></i>
                    <span>Use <strong>Landscape</strong> orientation for best results</span>
                  </li>
                  <li className="flex items-start">
                    <i className="pi pi-check text-green-400 mr-2 mt-0.5"></i>
                    <span>Click the "Print Document" button in the new window</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-700">
              <button
                onClick={handleClosePrintModal}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-300 flex items-center space-x-2"
              >
                <i className="pi pi-times"></i>
                <span>Close</span>
              </button>
              <button
                onClick={handlePrintNow}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl transition-all duration-300 flex items-center space-x-2"
              >
                <i className="pi pi-external-link"></i>
                <span>Open Print Window</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard = ({ analytics, loadingAnalytics, timeRange, onTimeRangeChange }) => {
  const [weeklyStats, setWeeklyStats] = useState({
    active: 0,
    returned: 0
  });
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    setLoadingWeekly(true);
    try {
      const [activeRes, returnedRes] = await Promise.all([
        analyticsAPI.getWeeklyActive(),
        analyticsAPI.getWeeklyReturned()
      ]);

      setWeeklyStats({
        active: activeRes.count || 0,
        returned: returnedRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    } finally {
      setLoadingWeekly(false);
    }
  };

  if (loadingAnalytics) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6">
        <div className="text-center py-8">
          <i className="pi pi-spin pi-spinner text-2xl text-cyan-400"></i>
          <p className="text-gray-400 mt-2">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Weekly Active */}
        <div className="bg-gray-900 border border-emerald-200/30 to-gray-50 rounded-xl p-6 shadow-xl">
          {loadingWeekly ? (
            <div className="flex items-center justify-center h-full">
              <i className="pi pi-spin pi-spinner text-2xl text-white"></i>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white">{weeklyStats.active}</div>
              <div className="text-emerald-200">Active (This Week)</div>
            </>
          )}
        </div>

        {/* Weekly Returned */}
        <div className="bg-gray-900 border border-emerald-200/30 to-gray-50 rounded-xl p-6 shadow-xl">
          {loadingWeekly ? (
            <div className="flex items-center justify-center h-full">
              <i className="pi pi-spin pi-spinner text-2xl text-white"></i>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white">{weeklyStats.returned}</div>
              <div className="text-green-200">Returned (This Week)</div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Report & Return Punctuality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Report */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="pi pi-chart-bar mr-2 text-cyan-400"></i>
            This Month's Report
          </h3>
          {analytics.monthlyReport ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Total Permissions</span>
                <span className="text-2xl font-bold text-white">{analytics.monthlyReport.totalPermissions || 0}</span>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-gray-300 font-medium mb-2">By Status</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.monthlyReport.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-gray-400 capitalize">{status}</span>
                      <span className={`font-semibold ${status === 'returned' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-gray-300 font-medium mb-2">Top Classes</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.monthlyReport.byClass || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([className, count]) => (
                      <div key={className} className="flex justify-between items-center">
                        <span className="text-gray-400">{className}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="pi pi-chart-line text-3xl text-gray-600 mb-3"></i>
              <p className="text-gray-400">No monthly data available</p>
            </div>
          )}
        </div>

        {/* Return Punctuality */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <i className="pi pi-clock mr-2 text-emerald-400"></i>
            Return Punctuality
          </h3>
          {analytics.punctuality ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-400">
                    {analytics.punctuality.onTimePercentage || 0}%
                  </div>
                  <div className="text-gray-400 text-sm mt-1">On Time Rate</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-white">
                    {analytics.punctuality.totalReturned || 0}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">Total Returned</div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-gray-300 font-medium mb-3">Return Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-gray-400">On Time</span>
                    </div>
                    <span className="text-green-400 font-semibold">{analytics.punctuality.onTime || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-gray-400">Late (≤24h)</span>
                    </div>
                    <span className="text-yellow-400 font-semibold">{analytics.punctuality.late || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-gray-400">Very Late</span>
                    </div>
                    <span className="text-red-400 font-semibold">{analytics.punctuality.early || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Delay</span>
                  <span className="text-white font-semibold">
                    {analytics.punctuality.averageDelayHours || 0} hours
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="pi pi-clock text-3xl text-gray-600 mb-3"></i>
              <p className="text-gray-400">No punctuality data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Permission Form Component (with active permission warning)
const PermissionForm = ({ student, formData, onChange, onGuardianChange, hasActivePermission }) => {

  return (
    <div className={`bg-gray-800/30 rounded-xl p-6 border ${hasActivePermission ? 'border-red-500/50' : 'border-cyan-500/10'} relative transition-all duration-300`}>

      {/* Active Permission Warning Badge */}
      {hasActivePermission && (
        <div className="mb-4 p-3 bg-gradient-to-r from-red-900/40 to-red-800/40 border border-red-500/50 rounded-lg">
          <div className="flex items-start space-x-2">
            <i className="pi pi-exclamation-circle text-red-300 mt-0.5 text-lg"></i>
            <div>
              <p className="text-red-200 text-sm font-semibold">⚠️ Active Permission Detected</p>
              <p className="text-red-300/80 text-xs mt-1">
                This student cannot receive a new permission until the current one is marked as returned.
              </p>
              <div className="mt-2 text-xs text-red-200/70">
                <i className="pi pi-info-circle mr-1"></i>
                Current permission must be marked as "Returned" first
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Header with Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${hasActivePermission ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}></div>
          <h3 className="text-lg font-semibold text-white">{student.name}</h3>
        </div>
        <div className="text-xs text-gray-400">
          {student.student_id} • {student.class}
        </div>
      </div>

      {/* Warning Message if has active permission */}
      {hasActivePermission && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <i className="pi pi-exclamation-circle text-red-400 mt-0.5"></i>
            <div>
              <p className="text-red-300 text-sm font-medium">Student has active permission</p>
              <p className="text-red-400/80 text-xs mt-1">
                This student cannot receive a new permission until the current one is marked as returned.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields - Disabled if has active permission */}
      <div className={`space-y-4 ${hasActivePermission ? 'opacity-60 pointer-events-none' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            Reason *
            {hasActivePermission && <span className="text-red-400 ml-2">(Disabled)</span>}
          </label>
          <input
            type="text"
            value={formData.reason || ''}
            onChange={(e) => onChange(student._id, 'reason', e.target.value)}
            placeholder="e.g., Family visit, Medical appointment"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={hasActivePermission}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            Destination *
            {hasActivePermission && <span className="text-red-400 ml-2">(Disabled)</span>}
          </label>
          <input
            type="text"
            value={formData.destination || ''}
            onChange={(e) => onChange(student._id, 'destination', e.target.value)}
            placeholder="e.g., Home address, Hospital"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={hasActivePermission}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            Guardian Name *
            {hasActivePermission && <span className="text-red-400 ml-2">(Disabled)</span>}
          </label>
          <input
            type="text"
            value={formData.guardian?.name || ''}
            onChange={(e) => onGuardianChange(student._id, 'name', e.target.value)}
            placeholder="Full name of guardian"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={hasActivePermission}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Relationship *
              {hasActivePermission && <span className="text-red-400 ml-2">(Disabled)</span>}
            </label>
            <select
              value={formData.guardian?.relationship || ''}
              onChange={(e) => onGuardianChange(student._id, 'relationship', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={hasActivePermission}
            >
              <option value="">Select</option>
              <option value="Parent">Parent</option>
              <option value="Guardian">Guardian</option>
              <option value="Relative">Relative</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Return Date *
              {hasActivePermission && <span className="text-red-400 ml-2">(Disabled)</span>}
            </label>
            <input
              type="date"
              value={formData.returnDate || ''}
              onChange={(e) => onChange(student._id, 'returnDate', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={hasActivePermission}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            Guardian Phone
            {hasActivePermission && <span className="text-red-400 ml-2">(Disabled)</span>}
          </label>
          <input
            type="text"
            value={formData.guardian?.phone || ''}
            onChange={(e) => onGuardianChange(student._id, 'phone', e.target.value)}
            placeholder="Phone number"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={hasActivePermission}
          />
        </div>
      </div>
    </div>
  );
};

// Permission History Component with Return Functionality
const PermissionHistory = ({ permissions, onMarkReturned, fetchPermissions }) => {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [filter, setFilter] = useState('approved');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingReturn, setLoadingReturn] = useState({});

  const uniqueStudents = [...new Set(permissions
    .filter(p => p.student)
    .map(p => ({ id: p.student._id, name: p.student.name }))
  )].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const filteredPermissions = permissions.filter(permission => {
    const today = new Date();
    const returnDate = new Date(permission.returnDate);
    const isOverdue = returnDate < today && permission.status === 'approved';

    let statusMatch = true;
    switch (filter) {
      case 'approved': statusMatch = permission.status === 'approved'; break;
      case 'returned': statusMatch = permission.status === 'returned'; break;
      case 'overdue': statusMatch = isOverdue; break;
      default: statusMatch = true;
    }

    const studentMatch = !selectedStudent || permission.student?._id === selectedStudent;

    const searchMatch = !searchTerm.trim() ||
      permission.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.permissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && studentMatch && searchMatch;
  });

  const handleMarkReturned = async (permissionId) => {
    setLoadingReturn(prev => ({ ...prev, [permissionId]: true }));

    try {
      await onMarkReturned(permissionId);
      if (fetchPermissions) {
        await fetchPermissions();
      }
    } catch (error) {
      console.error('Error marking as returned:', error);
      alert('Failed to mark as returned: ' + error.message);
    } finally {
      setLoadingReturn(prev => ({ ...prev, [permissionId]: false }));
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-emerald-500/20 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Permission History</h2>
        <div className="text-sm text-gray-400">
          {filteredPermissions.length} of {permissions.length} permissions
        </div>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">Filter by Status</label>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All', color: 'bg-gray-700' },
              { value: 'approved', label: 'Active', color: 'bg-yellow-600' },
              { value: 'returned', label: 'Returned', color: 'bg-green-600' },
              { value: 'overdue', label: 'Overdue', color: 'bg-red-600' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === option.value ? option.color + ' text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">Filter by Student</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
          >
            <option value="">All Students</option>
            {uniqueStudents.map(student => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-2">Search</label>
          <div className="relative">
            <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
            />
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{permissions.length}</div>
          <div className="text-gray-400 text-sm">Total</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {[...new Set(permissions.map(p => p.student?._id))].length}
          </div>
          <div className="text-gray-400 text-sm">Students</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {permissions.filter(p => p.status === 'approved').length}
          </div>
          <div className="text-gray-400 text-sm">Active</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {permissions.filter(p => p.status === 'returned').length}
          </div>
          <div className="text-gray-400 text-sm">Returned</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {permissions.filter(p => {
              const today = new Date();
              const returnDate = new Date(p.returnDate);
              return returnDate < today && p.status === 'approved';
            }).length}
          </div>
          <div className="text-gray-400 text-sm">Overdue</div>
        </div>
      </div>

      {/* Permission List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredPermissions.length > 0 ? (
          filteredPermissions.map(permission => {
            const today = new Date();
            const returnDate = new Date(permission.returnDate);
            const isOverdue = returnDate < today && permission.status === 'approved';

            return (
              <div
                key={permission._id}
                className={`bg-gray-800/30 rounded-xl p-4 border ${isOverdue ? 'border-red-500/50' : permission.status === 'returned' ? 'border-green-500/50' : 'border-gray-600/30'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">{permission.student?.name}</h4>
                      <div className="flex items-center space-x-2">
                        {isOverdue && (
                          <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded-full">
                            <i className="pi pi-exclamation-triangle mr-1"></i>
                            OVERDUE
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${permission.status === 'returned' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                          {permission.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-gray-400 text-sm">Class</div>
                        <div className="text-white">{permission.student?.class || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Permission #</div>
                        <div className="text-emerald-400 font-mono">{permission.permissionNumber}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Reason</div>
                        <div className="text-white">{permission.reason}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Destination</div>
                        <div className="text-white">{permission.destination}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                      <div className="text-gray-500 text-sm">
                        <div>
                          <i className="pi pi-calendar mr-1"></i>
                          Departure: {new Date(permission.departure).toLocaleDateString()}
                        </div>
                        <div>
                          <i className="pi pi-calendar-plus mr-1"></i>
                          Expected Return: {new Date(permission.returnDate).toLocaleDateString()}
                        </div>
                      </div>

                      {permission.status === 'approved' && (
                        <button
                          onClick={() => handleMarkReturned(permission._id)}
                          disabled={loadingReturn[permission._id]}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {loadingReturn[permission._id] ? (
                            <>
                              <i className="pi pi-spin pi-spinner"></i>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <i className="pi pi-check"></i>
                              <span>Mark as Returned</span>
                            </>
                          )}
                        </button>
                      )}

                      {permission.status === 'returned' && permission.returnedAt && (
                        <div className="text-green-400 text-sm">
                          <i className="pi pi-check-circle mr-1"></i>
                          Returned: {new Date(permission.returnedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <i className="pi pi-inbox text-4xl text-gray-600 mb-4"></i>
            <p className="text-gray-400">No permissions found</p>
            {permissions.length > 0 && (
              <p className="text-gray-500 text-sm mt-1">Try changing your filters</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// SMS Notifications Dashboard Component
const SMSDashboard = ({ permissions }) => {
  const [smsStats, setSmsStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    demoMode: false
  });

  useEffect(() => {
    if (permissions.length > 0) {
      let sent = 0;
      let failed = 0;
      let demoMode = false;

      permissions.forEach(perm => {
        if (perm.smsNotifications?.permissionCreated?.sent) sent++;
        if (perm.smsNotifications?.permissionCreated?.error) failed++;
        if (perm.smsProvider === 'demo') demoMode = true;
      });

      setSmsStats({
        total: permissions.length,
        sent,
        failed,
        demoMode
      });
    }
  }, [permissions]);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-purple-500/20 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          <i className="pi pi-send mr-2"></i>
          SMS Notifications
        </h2>
        {smsStats.demoMode && (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
            <i className="pi pi-info-circle mr-1"></i>
            DEMO MODE
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{smsStats.total}</div>
          <div className="text-gray-400 text-sm">Total Permissions</div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{smsStats.sent}</div>
          <div className="text-gray-400 text-sm">SMS Sent</div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{smsStats.failed}</div>
          <div className="text-gray-400 text-sm">SMS Failed</div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {smsStats.total > 0 ? Math.round((smsStats.sent / smsStats.total) * 100) : 0}%
          </div>
          <div className="text-gray-400 text-sm">Success Rate</div>
        </div>
      </div>

      {smsStats.demoMode && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <i className="pi pi-info-circle text-yellow-400 mt-0.5"></i>
            <div>
              <p className="text-yellow-300 text-sm font-medium">SMS is in DEMO Mode</p>
              <p className="text-yellow-400/80 text-xs mt-1">
                SMS messages are logged to console instead of being sent.
                To send real SMS, add your TextBee API key to .env file.
              </p>
              <a
                href="https://textbee.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors"
              >
                <i className="pi pi-external-link mr-1"></i>
                Get TextBee API Key
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Student Statistics Component
const StudentStats = () => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await studentAPI.getStudents();
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchStudentStats = async (studentId) => {
    if (!studentId) return;

    setLoading(true);
    try {
      const response = await analyticsAPI.getStudentPermissionStats(studentId);
      setStudentStats(response);
    } catch (error) {
      console.error('Error fetching student stats:', error);
      alert('Failed to load student statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setShowSelector(false);
    setSearchTerm('');
    fetchStudentStats(student._id);
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      (student.name?.toLowerCase() || '').includes(searchLower) ||
      (student.student_id?.toLowerCase() || '').includes(searchLower) ||
      (student.class?.toLowerCase() || '').includes(searchLower)
    );
  });

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-purple-500/20 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          <i className="pi pi-user mr-2"></i>
          Student Permission Statistics
        </h2>

        {/* Student Selector */}
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2"
          >
            <i className="pi pi-search"></i>
            <span>
              {selectedStudent ? `Viewing: ${selectedStudent.name}` : 'Select Student'}
            </span>
            <i className={`pi pi-chevron-${showSelector ? 'up' : 'down'}`}></i>
          </button>


          {showSelector && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-gray-800 border border-purple-500/30 rounded-xl shadow-2xl z-50">
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Search students... (type to filter)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                    autoFocus
                  />
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {!searchTerm.trim() ? 'Showing recent students' : `Searching for: "${searchTerm}"`}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  <>
                    {/* Show limited results when no search */}
                    {!searchTerm.trim() && filteredStudents.length > 8 && (
                      <div className="px-4 py-2 bg-purple-900/20 border-b border-purple-500/20">
                        <div className="text-xs text-purple-300 flex items-center">
                          <i className="pi pi-info-circle mr-1"></i>
                          Showing 8 of {filteredStudents.length} students. Type to search...
                        </div>
                      </div>
                    )}

                    {/* Display students (limited if no search) */}
                    {(searchTerm.trim() ? filteredStudents : filteredStudents.slice(0, 8)).map(student => (
                      <button
                        key={student._id}
                        onClick={() => handleStudentSelect(student)}
                        className="w-full text-left p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="text-white font-medium">{student.name}</div>
                        <div className="text-gray-400 text-sm">
                          {student.student_id} • {student.class}
                        </div>
                      </button>
                    ))}

                    {/* Show "view all" option when no search */}
                    {!searchTerm.trim() && filteredStudents.length > 8 && (
                      <button
                        onClick={() => setSearchTerm(' ')} // Set space to show all
                        className="w-full text-center p-3 text-purple-400 hover:text-purple-300 hover:bg-gray-700/50 transition-colors border-t border-gray-700"
                      >
                        <div className="flex items-center justify-center">
                          <i className="pi pi-list mr-2"></i>
                          View All Students ({filteredStudents.length})
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <i className="pi pi-user-slash text-3xl text-gray-600 mb-3"></i>
                    <p className="text-gray-400 font-medium">No matching students</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {searchTerm.trim() ? `No results for "${searchTerm}"` : 'No students in database'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Display */}
      {loading ? (
        <div className="text-center py-12">
          <i className="pi pi-spin pi-spinner text-4xl text-purple-400 mb-4"></i>
          <p className="text-gray-400">Loading student statistics...</p>
        </div>
      ) : studentStats ? (
        <div className="space-y-6">
          {/* Student Info Card */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{studentStats.student.name}</h3>
                <div className="text-gray-400">
                  ID: {studentStats.student.student_id} • Class: {studentStats.student.class}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentStats(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>

            {studentStats.student.guardian?.name && (
              <div className="text-gray-300">
                Guardian: {studentStats.student.guardian.name}
                {studentStats.student.guardian.relationship && ` (${studentStats.student.guardian.relationship})`}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-white">{studentStats.stats.total}</div>
              <div className="text-blue-200 text-sm mt-1">Total Permissions</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-white">{studentStats.stats.approved}</div>
              <div className="text-yellow-200 text-sm mt-1">Active</div>
            </div>
            <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-white">{studentStats.stats.returned}</div>
              <div className="text-green-200 text-sm mt-1">Returned</div>
            </div>
            <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-white">{studentStats.stats.overdue}</div>
              <div className="text-red-200 text-sm mt-1">Overdue</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-white">{studentStats.avgDuration}</div>
              <div className="text-purple-200 text-sm mt-1">Avg Days (Returned)</div>
            </div>
          </div>

          {/* Recent Permissions */}
          <div className="bg-gray-800/30 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center">
              <i className="pi pi-history mr-2 text-cyan-400"></i>
              Recent Permissions (with Guardian)
            </h4>
            <div className="space-y-3">
              {studentStats.recentPermissions?.length > 0 ? (
                studentStats.recentPermissions.map(permission => (
                  <div key={permission._id} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-emerald-400 font-mono text-sm">
                          #{permission.permissionNumber}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(permission.createdAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${permission.status === 'returned' ? 'bg-green-900/50 text-green-300' :
                        permission.status === 'approved' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                        {permission.status}
                      </span>
                    </div>

                    {/* Reason and Destination */}
                    <div className="mb-2">
                      <div className="text-gray-300 text-sm mb-1">
                        <i className="pi pi-info-circle text-cyan-400 mr-1"></i>
                        {permission.reason}
                      </div>
                      <div className="text-gray-400 text-xs">
                        <i className="pi pi-map-marker text-emerald-400 mr-1"></i>
                        {permission.destination}
                      </div>
                    </div>

                    {/* Guardian Information */}
                    {permission.guardian && (
                      <div className="bg-gray-900/50 rounded p-2 mb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-300 text-xs font-medium flex items-center">
                              <i className="pi pi-user text-purple-400 mr-1"></i>
                              Guardian
                            </div>
                            <div className="text-white text-sm">
                              {permission.guardian.name}
                              {permission.guardian.relationship && (
                                <span className="text-gray-400 text-xs ml-2">
                                  ({permission.guardian.relationship})
                                </span>
                              )}
                            </div>
                          </div>
                          {permission.guardian.phone && (
                            <div className="text-right">
                              <div className="text-gray-300 text-xs font-medium flex items-center justify-end">
                                <i className="pi pi-phone text-green-400 mr-1"></i>
                                Phone
                              </div>
                              <div className="text-cyan-300 text-sm">
                                {permission.guardian.phone}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-500">
                        <i className="pi pi-calendar-minus mr-1"></i>
                        Departure: {new Date(permission.departure).toLocaleDateString()}
                      </div>
                      <div className={`text-right ${new Date(permission.returnDate) < new Date() && permission.status !== 'returned'
                        ? 'text-red-400'
                        : 'text-gray-500'
                        }`}>
                        <i className="pi pi-calendar-plus mr-1"></i>
                        Return: {new Date(permission.returnDate).toLocaleDateString()}
                        {new Date(permission.returnDate) < new Date() && permission.status !== 'returned' && (
                          <span className="ml-1 text-red-300">(Overdue)</span>
                        )}
                      </div>
                    </div>

                    {/* Return Info if Returned */}
                    {permission.status === 'returned' && permission.returnedAt && (
                      <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
                        <div className="text-green-400 flex items-center">
                          <i className="pi pi-check-circle mr-1"></i>
                          Returned: {new Date(permission.returnedAt).toLocaleDateString()}
                          {permission.returnedAt && permission.returnDate && (
                            <span className="text-gray-500 ml-2">
                              ({Math.floor((new Date(permission.returnedAt) - new Date(permission.returnDate)) / (1000 * 60 * 60 * 24))} days
                              {new Date(permission.returnedAt) > new Date(permission.returnDate) ? ' late' : ' early'})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <i className="pi pi-inbox text-2xl mb-2"></i>
                  <p>No recent permissions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <i className="pi pi-user text-4xl text-gray-600 mb-4"></i>
          <p className="text-gray-400 mb-2">Select a student to view permission statistics</p>
          <p className="text-gray-500 text-sm">Click the "Select Student" button above</p>
        </div>
      )}
    </div>
  );
};

export default PermissionStudio;