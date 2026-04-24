import axios from 'axios';

// ============================================
// SIMPLIFIED ENVIRONMENT DETECTION FOR CPANEL
// ============================================

// For cPanel deployment, use relative paths
const getApiBaseUrl = () => {
  // Development (localhost)
  if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  // Production on cPanel (cap-mis.ilelio.rw)
  // Use RELATIVE path - .htaccess will proxy to localhost:5000
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🚀 Vite API Configuration:');
console.log('Hostname:', window.location.hostname);
console.log('Full URL:', window.location.href);
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);

//console.log(`🚀 API Configuration: Environment = ${currentEnv}, API Base URL = ${API_BASE_URL}`);

// ============================================
// AXIOS CONFIGURATION
// ============================================

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: import.meta.env.MODE === 'production' ? 15000 : 30000, // Longer timeout for production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('capmis_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('capmis_token');

      // Check if this is a login request
      const isLoginRequest = error.config?.url?.includes('/login');

      // Only redirect if it's NOT a login request
      if (!isLoginRequest) {
        console.log('401 error - Redirecting to login (non-login request)');
        window.location.href = '/login';
      } else {
        console.log('401 error on login - NOT redirecting (let login handle it)');
      }
    }
    return Promise.reject(error);
  }
);





// Auth API calls
export const authAPI = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      // Return the error response from backend
      if (error.response && error.response.data) {
        console.log('Backend error response:', error.response.data);
        return error.response.data; // This will be {success: false, error: 'Invalid credentials'}
      }

      // For network errors
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  },

  //registering User
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },


  // ===== NEW MULTI-STEP REGISTRATION (ADD THESE) =====

  // === Resume Registration ===
  getRegistrationProgress: async (email) => {
    try {
      const response = await api.get(`/auth/register/resume/${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      console.error('Get progress error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to get registration progress' };
    }
  },

  saveRegistrationProgress: async (email, step, data) => {
    try {
      const response = await api.post('/auth/register/save-progress', { email, step, data });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to save progress' };
    }
  },

  // Step 1: Personal Info

  savePersonalInfo: async (data) => {
    try {
      const response = await api.post('/auth/register/step1/personal', data);
      console.log(data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to save personal info' };
    }
  },

  // Step 2: School Info
  saveSchoolInfo: async (formData) => {
    try {
      const response = await api.post('/auth/register/step2/school', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to save school info' };
    }
  },

  // Step 3: Plan Selection
  selectPlan: async (data) => {
    try {
      const response = await api.post('/auth/register/step3/plan', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to select plan' };
    }
  },

  // Step 4: Payment
  processPayment: async (data) => {
    try {
      const response = await api.post('/auth/register/step4/payment', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Payment failed' };
    }
  },

  // Step 5: Complete Registration
  completeRegistration: async (data) => {
    try {
      const response = await api.post('/auth/register/complete', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to complete registration' };
    }
  },


  // ===== HELPER FUNCTIONS =====
  checkEmail: async (email) => {
    try {
      const response = await api.get(`/auth/check-email/${email}`);
      return response.data;
    } catch (error) {
      return { available: false };
    }
  },

  checkSchoolName: async (name) => {
    try {
      const response = await api.get(`/auth/check-school/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      return { available: false, suggestions: [] };
    }
  },

  getPlans: async () => {
    try {
      const response = await api.get('/auth/plans');
      return response.data;
    } catch (error) {
      return { plans: [] };
    }
  },


  // Get current user profile
  getProfile: async () => {
    const token = localStorage.getItem('capmis_token');
    if (!token) {
      throw new Error('No token found');
    }
    try {
      const response = await api.get('/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get profile' };
    }
  },

  // Logout user
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      localStorage.removeItem('capmis_token');
      return response.data;
    } catch (error) {
      localStorage.removeItem('capmis_token');
      throw error.response?.data || { message: 'Logout failed' };
    }
  },
  // Update profile (name, email)
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to change password' };
    }
  },

  // Update profile image
  updateProfileImage: async (imagePath) => {
    try {
      const response = await api.put('/auth/profile-image', { profileImage: imagePath });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile image' };
    }
  },

  // Get all users (admin only)
  getUsers: async () => {
    try {
      const response = await api.get('/auth');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get users' };
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password reset failed' };
    }
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password reset failed' };
    }
  }
};


//===========================ADMNIN API CALLS===========================

// Card Generation API calls
export const cardAPI = {
  //upload single student photo
  uploadStudentPhoto: async (formData) => {
    try {
      const response = await api.post('/card/upload-student-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Photo upload failed' };
    }
  },
  //Get student photo for preview
  getStudentPhoto: async (studentId) => {
    try {
      const response = await api.get(`/card/student-photo/${studentId}`, {
        responseType: 'blob'
      });
      return URL.createObjectURL(response.data);
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get student photo' };
    }
  },
  //Getting template Dimension
  getTemplateDimensions: async (templateId) => {
    try {
      const response = await api.get(`/card/template-dimensions/${templateId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get template dimensions' };
    }
  },
  //Getting card History
  getCardHistory: async (params = {}) => {
    try {
      // params can include: schoolId, limit, page, status, etc.
      const response = await api.get('/card/history', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get card history' };
    }
  },
  // Getting student card history
  getStudentCardHistory: async (studentId, params = {}) => {
    try {
      const response = await api.get(`/card/history/student/${studentId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get student history' };
    }
  },
  //getting students with most generated cards
  getTopGenerators: async (params = {}) => {
    try {
      // params: limit, schoolId, timeRange
      const response = await api.get('/card/history/top-generators', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get top generators' };
    }
  },
  //Get Recent Generations
  getRecentGenerations: async (params = {}) => {
    try {
      // params: limit, schoolId
      const response = await api.get('/card/history/recent', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get recent generations' };
    }
  },

  // Download generated cards
  downloadCards: async (batchId) => {
    try {
      const response = await api.get(`/card/download/${batchId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Download failed' };
    }
  },
  // Get batch progress
  getBatchProgress: async (batchId) => {
    const response = await api.get(`/card/batch-progress/${batchId}`);
    return response.data;
  },
  // Single-click CSV processing
  processCSVAndGenerate: async (formData) => {
    const response = await api.post('/card/process-csv-generate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      responseType: 'blob',
      timeout: 600000, // 10 minutes timeout
    });

    // Try to get batch ID from headers
    const batchId = response.headers['x-batch-id'];
    if (batchId) {
      // You might want to store this somewhere accessible
      console.log('Batch ID received:', batchId);
    }
    return response.data;
  },

  // Single student card generation
  generateSingleCardSimple: async (data) => {
    try {
      console.log('📡 Sending to /card/generate-single-card-simple', data);

      const response = await api.post('/card/generate-single-card', data, {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'blob'
      });

      console.log('✅ Simple card API Response received');
      return response.data;
    } catch (error) {
      console.error('❌ Simple card generation API Error:', error);

      // Try to read error from blob
      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Card generation failed');
        } catch {
          throw error;
        }
      }

      throw error;
    }
  },

  // Get all students for dropdown
  getStudents: async (params = {}) => {
    try {
      // params: schoolId, class, active, etc.
      const response = await api.get('/card/students', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch students' };
    }
  }
};

// Student Management API calls
export const studentAPI = {
  // Get all students
  getStudents: async (params = {}) => {
    try {
      // params can include: page, limit, schoolId, class, search, etc.
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/students?${queryString}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch students' };
    }
  },


  // Add single student
  addStudent: async (studentData) => {
    try {
      const response = await api.post('/students', studentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add student' };
    }
  },
  // Update student
  updateStudent: async (studentId, studentData) => {
    try {
      console.log('📤 API: Updating student', studentId);

      // If it's FormData, don't set Content-Type header
      const isFormData = studentData instanceof FormData;

      const config = {
        headers: isFormData ? {} : { 'Content-Type': 'application/json' }
      };

      const response = await api.put(`/students/${studentId}`, studentData, config);

      console.log('✅ API: Update response:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ API: Error updating student:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      throw error.response?.data || { message: 'Failed to update student' };
    }
  },

  // Delete student
  deleteStudent: async (studentId) => {
    try {
      const response = await api.delete(`/students/${studentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete student' };
    }
  },

  // Bulk import from CSV (USE EXISTING ENDPOINT)
  bulkImportCSV: async (csvFile, params = {}, onProgress = null) => {
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);

      // Add any additional params (like class, section) to FormData
      Object.keys(params).forEach(key => {
        if (key !== 'schoolId') { // schoolId comes from auth
          formData.append(key, params[key]);
        }
      });

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        };
      }

      const response = await api.post('/students/bulk-import', formData, config);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to import CSV' };
    }
  },

  // Bulk import with photos - schoolId from auth
  bulkImportWithPhotos: async (csvFile, photoZipFile, params = {}, onProgress = null) => {
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      if (photoZipFile) {
        formData.append('photoZip', photoZipFile);
      }

      // Add any additional params
      Object.keys(params).forEach(key => {
        if (key !== 'schoolId') {
          formData.append(key, params[key]);
        }
      });

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        };
      }

      const response = await api.post('/students/bulk-import-with-photos', formData, config);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to import with photos' };
    }
  },

  // Get student photo URL
  getStudentPhotoUrl: (studentId, size = 'medium') => {
    return `${API_BASE_URL}/students/photo/${studentId}?size=${size}`;
  },
  // Delete all students - WARNING: This should check schoolId!
  deleteAllStudents: async (params = {}) => {
    try {
      // params should include schoolId to prevent accidental deletion
      const response = await api.delete('/students/delete-all', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete all students' };
    }
  },

  // Get student statistics - ADD schoolId support
  getStudentStats: async (params = {}) => {
    try {
      // params: schoolId, class, year, etc.
      const response = await api.get('/students/stats', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get student stats' };
    }
  },
};

// Template Management API calls
export const templateAPI = {
  // Get templates - ADD schoolId support
  getTemplates: async (params = {}) => {
    try {
      // params: schoolId, isDefault, etc.
      const response = await api.get('/templates', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get templates' };
    }
  },

  // Upload template - schoolId from auth
  uploadTemplate: async (formData) => {
    try {
      const response = await api.post('/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upload template' };
    }
  },

  // Set default template - schoolId from auth
  setDefaultTemplate: async (templateId) => {
    try {
      const response = await api.patch(`/templates/${templateId}/set-default`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to set default template' };
    }
  },

  // Delete template - schoolId from auth
  deleteTemplate: async (templateId) => {
    try {
      const response = await api.delete(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete template' };
    }
  },

  // FIXED: previewTemplate function
  previewTemplate: async (publicId) => {
    try {
      // Generate the preview URL (no actual API call needed)
      // The backend preview route redirects to Cloudinary URL
      const previewUrl = `${API_BASE_URL}/templates/preview/${encodeURIComponent(publicId)}`;
      console.log('🖼️ Generated preview URL:', previewUrl);
      return previewUrl;
    } catch (error) {
      console.error('❌ Error generating preview URL:', error);
      throw error;
    }
  },

  // Alternative method: Direct Cloudinary URL generation
  getDirectTemplateUrl: async (templateId, side = 'front') => {
    try {
      const response = await api.get(`/templates/url/${templateId}/${side}`);
      return response.data.url;
    } catch (error) {
      console.error('❌ Error getting direct template URL:', error);
      throw error;
    }
  },

  cleanupOrphanedFiles: async () => {
    try {
      const response = await api.post('/templates/cleanup-orphaned-files');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Cleanup failed' };
    }
  }
};

//Staff Management API calls
export const staffAPI = {
  // Get all staff (with optional filters)
  getStaff: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/staff${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get staff error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch staff' };
    }
  },

  // Get single staff member by ID
  getStaffById: async (id) => {
    try {
      const response = await api.get(`/staff/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get staff by ID error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch staff member' };
    }
  },

  // Create new staff member
  createStaff: async (staffData) => {
    try {
      const response = await api.post('/staff', staffData);
      return response.data;
    } catch (error) {
      console.error('Create staff error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create staff member',
        details: error.response?.data
      };
    }
  },

  // Update staff member
  updateStaff: async (id, staffData) => {
    try {
      const response = await api.put(`/staff/${id}`, staffData);
      return response.data;
    } catch (error) {
      console.error('Update staff error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update staff member'
      };
    }
  },

  // Update staff permissions only
  updatePermissions: async (id, permissions) => {
    try {
      const response = await api.patch(`/staff/${id}/permissions`, { permissions });
      return response.data;
    } catch (error) {
      console.error('Update permissions error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to update permissions' };
    }
  },

  // Delete/deactivate staff member
  deleteStaff: async (id, permanent = false) => {
    try {
      const response = await api.delete(`/staff/${id}${permanent ? '?permanent=true' : ''}`);
      return response.data;
    } catch (error) {
      console.error('Delete staff error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete staff member'
      };
    }
  },

  // Resend invitation email
  resendInvite: async (id) => {
    try {
      const response = await api.post(`/staff/${id}/resend-invite`);
      return response.data;
    } catch (error) {
      console.error('Resend invite error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to resend invitation'
      };
    }
  },


  // Bulk create staff from CSV/array
  bulkCreateStaff: async (staffList) => {
    try {
      const response = await api.post('/staff/bulk', { staffList });
      return response.data;
    } catch (error) {
      console.error('Bulk create staff error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create staff members'
      };
    }
  },

  // Get staff activity logs
  getStaffActivity: async (id, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/staff/${id}/activity${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get staff activity error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch staff activity' };
    }
  }
};

//Subscription API calls
export const subscriptionAPI = {
  // Get current user's subscription
  getCurrentSubscription: async () => {
    try {
      const response = await api.get('/subscriptions/current');
      return response.data;
    } catch (error) {
      console.error('Get current subscription error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch subscription' };
    }
  },

  // Get subscription by ID
  getSubscriptionById: async (id) => {
    try {
      const response = await api.get(`/subscriptions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get subscription error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch subscription' };
    }
  },

  // Get all subscriptions (super admin only)
  getAllSubscriptions: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/subscriptions${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get all subscriptions error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch subscriptions' };
    }
  },

  // Get billing history
  getBillingHistory: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/subscriptions/billing/history${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get billing history error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch billing history' };
    }
  },

  // Get upcoming invoice
  getUpcomingInvoice: async () => {
    try {
      const response = await api.get('/subscriptions/billing/upcoming');
      return response.data;
    } catch (error) {
      console.error('Get upcoming invoice error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch upcoming invoice' };
    }
  },

  // Get invoice by ID
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/subscriptions/billing/invoice/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Get invoice error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch invoice' };
    }
  },

  // Download invoice PDF
  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/subscriptions/billing/invoice/${invoiceId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Download invoice error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to download invoice' };
    }
  },

  // Update payment method
  updatePaymentMethod: async (paymentData) => {
    try {
      const response = await api.post('/subscriptions/payment-method', paymentData);
      return response.data;
    } catch (error) {
      console.error('Update payment method error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to update payment method' };
    }
  },

  // Get payment methods
  getPaymentMethods: async () => {
    try {
      const response = await api.get('/subscriptions/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Get payment methods error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch payment methods' };
    }
  },

  // Remove payment method
  removePaymentMethod: async (methodId) => {
    try {
      const response = await api.delete(`/subscriptions/payment-methods/${methodId}`);
      return response.data;
    } catch (error) {
      console.error('Remove payment method error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to remove payment method' };
    }
  },

  // Set default payment method
  setDefaultPaymentMethod: async (methodId) => {
    try {
      const response = await api.put(`/subscriptions/payment-methods/${methodId}/default`);
      return response.data;
    } catch (error) {
      console.error('Set default payment method error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to set default payment method' };
    }
  },

  // Change plan
  changePlan: async (planData) => {
    try {
      const response = await api.post('/subscriptions/change-plan', planData);
      return response.data;
    } catch (error) {
      console.error('Change plan error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to change plan' };
    }
  },

  // Cancel subscription
  cancelSubscription: async (reason) => {
    try {
      const response = await api.post('/subscriptions/cancel', { reason });
      return response.data;
    } catch (error) {
      console.error('Cancel subscription error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to cancel subscription' };
    }
  },

  // Reactivate cancelled subscription
  reactivateSubscription: async () => {
    try {
      const response = await api.post('/subscriptions/reactivate');
      return response.data;
    } catch (error) {
      console.error('Reactivate subscription error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to reactivate subscription' };
    }
  },

  // Get available plans
  getPlans: async () => {
    try {
      const response = await api.get('/subscriptions/plans');
      return response.data;
    } catch (error) {
      console.error('Get plans error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch plans' };
    }
  },

  // Get subscription usage statistics
  getUsageStats: async () => {
    try {
      const response = await api.get('/subscriptions/usage');
      return response.data;
    } catch (error) {
      console.error('Get usage stats error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch usage statistics' };
    }
  },

  // Admin: Update any subscription (super admin only)
  adminUpdateSubscription: async (subscriptionId, updateData) => {
    try {
      const response = await api.put(`/subscriptions/admin/${subscriptionId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Admin update subscription error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to update subscription' };
    }
  },

  // Admin: Create manual invoice (super admin only)
  createManualInvoice: async (invoiceData) => {
    try {
      const response = await api.post('/subscriptions/admin/invoice', invoiceData);
      return response.data;
    } catch (error) {
      console.error('Create manual invoice error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to create invoice' };
    }
  }
};

// Utility function to check server status
export const checkServerStatus = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Server is not responding');
  }
};

// PermissionAPI
export const permissionAPI = {
  // Get all permissions - ADD schoolId support
  getAll: async (params = {}) => {
    try {
      // params: schoolId, status, studentId, date range
      const response = await api.get('/permissions', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get permissions' };
    }
  },

  // Create permission (bulk) or one - schoolId from auth
  create: async (permissionData) => {
    try {
      const response = await api.post('/permissions/create', permissionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create permission' };
    }
  },

  // Get permissions by student ID - schoolId optional (studentId already scopes it)
  getByStudent: async (studentId, params = {}) => {
    try {
      const response = await api.get(`/permissions/student/${studentId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get student permissions' };
    }
  },

  // Get single permission by ID
  getById: (permissionId) => api.get(`/permissions/${permissionId}`),

  // Update a permission status
  updateStatus: async (id, data = {}) => {
    const response = await api.patch(`/permissions/${id}/status`, {
      status: 'returned',
      ...data
    });
    return response.data;
  },

  // Delete a permission
  delete: (permissionId) => api.delete(`/permissions/${permissionId}`),

  // Generate PDF for permission (if you add this route later)
  generatePDF: (permissionId) => api.post(`/permissions/${permissionId}/print`, {}, {
    responseType: 'blob' // Important for file downloads
  }),

  // Get permission statistics - ADD schoolId support
  getStats: async (params = {}) => {
    try {
      // params: schoolId, startDate, endDate, class, etc.
      const response = await api.get('/permissions/stats', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get permission stats' };
    }
  },

  // Delete all permissions - WARNING: Should include schoolId!
  deleteAllPermissions: async (params = {}) => {
    try {
      // params should include schoolId
      const response = await api.delete('/permissions/delete-all', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete all permissions' };
    }
  },

  // Get permission statistics (alias) - ADD schoolId support
  getPermissionStats: async (params = {}) => {
    try {
      const response = await api.get('/permissions/stats', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get permission stats' };
    }
  },

};

//Analytics Api
export const analyticsAPI = {
  // Get dashboard summary - ADD schoolId support
  getDashboardSummary: async (params = {}) => {
    try {
      // params: schoolId, timeRange
      const response = await api.get('/analytics/dashboard-summary', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get dashboard summary' };
    }
  },

  // Get monthly report - ADD schoolId support
  getMonthlyReport: async (year, month, params = {}) => {
    try {
      // params: schoolId
      const response = await api.get(`/analytics/monthly-report/${year}/${month}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get monthly report' };
    }
  },

  // Get trends - ADD schoolId support
  getTrends: async (timeRange = 'monthly', params = {}) => {
    try {
      // params: schoolId
      const response = await api.get(`/analytics/trends/${timeRange}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trends' };
    }
  },

  // Get return punctuality - ADD schoolId support
  getReturnPunctuality: async (params = {}) => {
    try {
      // params: schoolId, startDate, endDate
      const response = await api.get('/analytics/return-punctuality', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get return punctuality' };
    }
  },

  // Get class analytics - ADD schoolId support
  getClassAnalytics: async (params = {}) => {
    try {
      // params: schoolId, class
      const response = await api.get('/analytics/class', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get class analytics' };
    }
  },

  // Get reason analytics - ADD schoolId support
  getReasonAnalytics: async (params = {}) => {
    try {
      // params: schoolId
      const response = await api.get('/analytics/reasons', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get reason analytics' };
    }
  },

  // Get weekly active - ADD schoolId support
  getWeeklyActive: async (params = {}) => {
    try {
      // params: schoolId, week
      const response = await api.get('/analytics/weekly-active', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get weekly active' };
    }
  },

  // Get weekly returned - ADD schoolId support
  getWeeklyReturned: async (params = {}) => {
    try {
      // params: schoolId, week
      const response = await api.get('/analytics/weekly-returned', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get weekly returned' };
    }
  },

  // Get student permission stats - schoolId optional (studentId scopes it)
  getStudentPermissionStats: async (studentId, params = {}) => {
    try {
      const response = await api.get(`/analytics/student/${studentId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get student permission stats' };
    }
  }
};

// SMS API (for checking SMS status)
export const smsAPI = {
  getSMSStats: async () => {
    const response = await api.get('/analytics/sms-stats');
    return response.data;
  },

  sendTestSMS: async (phoneNumber, message) => {
    const response = await api.post('/analytics/test-sms', {
      phone: phoneNumber,
      message
    });
    return response.data;
  },

  getSMSLogs: async (limit = 50) => {
    const response = await api.get(`/analytics/sms-logs?limit=${limit}`);
    return response.data;
  }
};


// Export API for data export
export const exportAPI = {
  exportPermissions: async (format = 'excel', filters = {}) => {
    const response = await api.post('/export/permissions', {
      format,
      filters
    }, {
      responseType: format === 'excel' ? 'blob' : 'json'
    });
    return response.data;
  },

  exportStudents: async (format = 'excel') => {
    const response = await api.post('/export/students', {
      format
    }, {
      responseType: format === 'excel' ? 'blob' : 'json'
    });
    return response.data;
  },

  exportAnalytics: async (format = 'excel', type = 'summary') => {
    const response = await api.post('/export/analytics', {
      format,
      type
    }, {
      responseType: format === 'excel' ? 'blob' : 'json'
    });
    return response.data;
  }
};

// Audit API for Both Users
export const auditAPI = {
  // Get audit logs with filters
  getAuditLogs: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/audit/logs${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get audit logs error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch audit logs' };
    }
  },

  // Get audit trail for specific entity
  getAuditTrail: async (model, id, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/audit/trail/${model}/${id}${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get audit trail error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch audit trail' };
    }
  },

  // Get user activity
  getUserActivity: async (userId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/audit/user/${userId}${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get user activity error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch user activity' };
    }
  },

  // Get school activity summary
  getSchoolActivity: async (schoolId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/audit/school/${schoolId}/summary${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get school activity error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch school activity' };
    }
  },

  // Export audit logs (Excel/CSV)
  exportAuditLogs: async (format = 'excel', params = {}) => {
    try {
      const response = await api.post('/audit/export', { format, ...params }, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Export audit logs error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to export audit logs' };
    }
  }
};


//===========================ADMNIN API CALLS===========================
//===========================SUPER ADMIN API CALLS===========================

export const plansAPI = {
  // Get all active plans (public)
  getPlans: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/plans${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get plans error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch plans' };
    }
  },

  // Get plan by ID
  getPlanById: async (id) => {
    try {
      const response = await api.get(`/plans/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get plan error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch plan' };
    }
  },

  // Get plan by code (TRIAL, BASIC, PRO, ENTERPRISE)
  getPlanByCode: async (code) => {
    try {
      const response = await api.get(`/plans/code/${code}`);
      return response.data;
    } catch (error) {
      console.error('Get plan by code error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch plan' };
    }
  },

  // Compare all plans
  comparePlans: async () => {
    try {
      const response = await api.get('/plans/compare/all');
      return response.data;
    } catch (error) {
      console.error('Compare plans error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to compare plans' };
    }
  },

  // ===== SUPER ADMIN ONLY =====

  // Create new plan
  createPlan: async (planData) => {
    try {
      const response = await api.post('/plans', planData);
      return response.data;
    } catch (error) {
      console.error('Create plan error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create plan',
        details: error.response?.data
      };
    }
  },

  // Update plan
  updatePlan: async (id, planData) => {
    try {
      const response = await api.put(`/plans/${id}`, planData);
      return response.data;
    } catch (error) {
      console.error('Update plan error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to update plan' };
    }
  },

  // Delete/deactivate plan
  deletePlan: async (id, permanent = false) => {
    try {
      const response = await api.delete(`/plans/${id}${permanent ? '?permanent=true' : ''}`);
      return response.data;
    } catch (error) {
      console.error('Delete plan error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to delete plan' };
    }
  },

  // Toggle plan popularity
  togglePopular: async (id) => {
    try {
      const response = await api.patch(`/plans/${id}/toggle-popular`);
      return response.data;
    } catch (error) {
      console.error('Toggle popular error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to toggle popularity' };
    }
  },

  // Reorder plans
  reorderPlans: async (order) => {
    try {
      const response = await api.post('/plans/reorder', { order });
      return response.data;
    } catch (error) {
      console.error('Reorder plans error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to reorder plans' };
    }
  },

  // Duplicate plan
  duplicatePlan: async (id) => {
    try {
      const response = await api.post(`/plans/${id}/duplicate`);
      return response.data;
    } catch (error) {
      console.error('Duplicate plan error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to duplicate plan' };
    }
  },

  // Get plan statistics
  getPlanStats: async () => {
    try {
      const response = await api.get('/plans/stats/overview');
      return response.data;
    } catch (error) {
      console.error('Get plan stats error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || 'Failed to fetch plan statistics' };
    }
  }
};

//===========================SUPER ADMIN API CALLS===========================
//===========================STAFF API CALLS===========================




//===========================STAFF API CALLS===========================

export default api;