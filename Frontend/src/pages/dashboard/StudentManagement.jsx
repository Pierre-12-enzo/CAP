// components/dashboard/StudentManagement.jsx - COMPLETE VERSION WITH ALL FIXES
import React, { useState, useEffect, useRef } from 'react';
import { studentAPI } from '../../services/api';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    class: '',
    gender: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [bulkImportMode, setBulkImportMode] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [photoZipFile, setPhotoZipFile] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedStudentPhoto, setSelectedStudentPhoto] = useState(null);

  //Progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    class: '',
    level: '',
    residence: '',
    gender: '',
    parent_phone: '',
    photo: null
  });

  const modalRef = useRef(null);

  useEffect(() => {
    fetchStudents();
    // Click outside modal handler
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        resetForm();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, filters, students]);

  useEffect(() => {
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    setTotalPages(totalPages || 1);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredStudents, itemsPerPage]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await studentAPI.getStudents();

      // Handle different response formats
      if (Array.isArray(data)) {
        setStudents(data);
      } else if (data && data.data) {
        setStudents(data.data); // If backend returns {data: [...]}
      } else {
        setStudents([]);
      }

    } catch (error) {
      console.error('Error fetching students:', error);

      // Check what error we're getting
      if (error.message && error.message.includes('Network Error')) {
        alert('Cannot connect to server. Make sure backend is running');
      } else if (error.response?.status === 500) {
        alert('Server error. Check backend console for details.');
      } else {
        alert('Failed to load students. Please try again.');
      }

      // Set empty array to prevent UI crash
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.residence?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.class) {
      filtered = filtered.filter(student =>
        student.class?.toLowerCase() === filters.class.toLowerCase()
      );
    }

    if (filters.gender) {
      filtered = filtered.filter(student =>
        student.gender?.toLowerCase() === filters.gender.toLowerCase()
      );
    }

    setFilteredStudents(filtered);
  };

  const getCurrentPageStudents = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'photo') {
      if (files && files[0]) {
        const file = files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (file.size > maxSize) {
          alert('Photo is too large! Maximum size is 5MB.');
          return;
        }

        if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
          alert('Only JPG and PNG images are allowed!');
          return;
        }

        setFormData(prev => ({ ...prev, photo: file }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        console.log(`📝 Form field ${key}:`, value);

        if (value !== null && value !== undefined && value !== '') {
          if (key === 'photo' && value instanceof File) {
            console.log(`📁 Adding photo file:`, {
              name: value.name,
              size: value.size,
              type: value.type,
              lastModified: value.lastModified
            });
          }
          submitData.append(key, value);
        }
      });

      // Log FormData contents BEFORE sending
      console.log('📤 FormData entries:');
      for (let [key, value] of submitData.entries()) {
        console.log(`${key}:`, value instanceof File ?
          `${value.name} (${value.size} bytes, ${value.type})` :
          value);
      }

      console.log('🚀 Making API call...');

      if (editingStudent) {
        console.log(`🔄 Updating student ID: ${editingStudent._id}`);
        console.log(`📷 Has photo in formData: ${!!formData.photo}`);
        console.log(`📷 Is it a File?: ${formData.photo instanceof File}`);

        // Test the API call with fetch first
        const testFormData = new FormData();
        testFormData.append('name', 'Test Name');
        testFormData.append('photo', formData.photo);

        console.log('🧪 Testing with fetch...');
        const testResponse = await fetch(`http://localhost:5000/api/students/${editingStudent._id}`, {
          method: 'PUT',
          body: testFormData
        });

        const testResult = await testResponse.json();
        console.log('🧪 Test response:', testResult);

        // Now try with your API service
        const response = await studentAPI.updateStudent(editingStudent._id, submitData);
        console.log('✅ Update response:', response);

        alert('Student updated successfully!');

      } else {
        console.log('➕ Creating new student');
        const response = await studentAPI.addStudent(submitData);
        console.log('✅ Create response:', response);
        alert('Student added successfully!');
      }

      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('❌ Error saving student:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to save student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    console.log('✏️ Editing student:', student.name, student._id);

    setEditingStudent(student);
    setFormData({
      student_id: student.student_id || '',
      name: student.name || '',
      class: student.class || '',
      level: student.level || '',
      residence: student.residence || '',
      gender: student.gender || '',
      parent_phone: student.parent_phone || '',
      photo: null  // Reset photo file input for new upload
    });

    // Show current photo URL for reference
    if (student.photo_url) {
      console.log('📷 Current photo URL:', student.photo_url);
    }

    setShowAddModal(true);
  };

  const handleDelete = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      await studentAPI.deleteStudent(studentId);
      alert('Student deleted successfully!');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      name: '',
      class: '',
      level: '',
      residence: '',
      gender: '',
      parent_phone: '',
      photo: null
    });
    setEditingStudent(null);
    setShowAddModal(false);
    setBulkImportMode(false);
    setCsvFile(null);
    setPhotoZipFile(null);
    setImportProgress(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ class: '', gender: '' });
    setCurrentPage(1);
    setShowFilters(false);
  };

  // CSV Import Functions
  const handleCSVImport = async () => {
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    setLoading(true);
    setUploadPhase('uploading');
    setUploadProgress(0);

    // Initialize progress state
    setImportProgress({
      status: 'uploading',
      message: 'Uploading CSV file... (0%)'
    });

    try {
      const result = await studentAPI.bulkImportCSV(csvFile, (progress) => {
        // This callback runs as the file uploads
        console.log(`📊 Upload progress: ${progress}%`);
        setUploadProgress(progress);
        setImportProgress({
          status: 'uploading',
          message: `Uploading CSV file... (${progress}%)`
        });

        // Force state update
        return progress;
      });

      // Upload complete, now processing
      setUploadPhase('processing');
      setImportProgress({
        status: 'processing',
        message: 'Processing CSV data...'
      });

      // Handle both response formats
      const created = result.results?.created || result.created || 0;
      const updated = result.results?.updated || result.updated || 0;

      // Show completion
      setUploadPhase('complete');
      setUploadProgress(100);

      setImportProgress({
        status: 'success',
        message: `Import completed! ${created} created, ${updated} updated`
      });

      alert('CSV import successful!');
      fetchStudents();

      // Clear progress after delay
      setTimeout(() => {
        setImportProgress(null);
        setUploadProgress(0);
        setUploadPhase('');
      }, 5000);

    } catch (error) {
      console.error('Import error:', error);
      setUploadPhase('error');
      setUploadProgress(0);

      setImportProgress({
        status: 'error',
        message: `Import failed: ${error.message}`
      });
      alert('CSV import failed: ' + error.message);

      setTimeout(() => {
        setImportProgress(null);
        setUploadProgress(0);
        setUploadPhase('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVWithPhotosImport = async () => {
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    setLoading(true);
    setUploadPhase('uploading');
    setUploadProgress(0);

    setImportProgress({
      status: 'uploading',
      message: 'Uploading files... (0%)'
    });

    try {
      const result = await studentAPI.bulkImportWithPhotos(csvFile, photoZipFile, (progress) => {
        // This callback runs as files upload
        setUploadProgress(progress);
        setImportProgress({
          status: 'uploading',
          message: `Uploading files... (${progress}%)`
        });
        // In the progress callback
        console.log(`📊 Upload progress: ${progress}%`);
      });

      // Upload complete, now processing
      setUploadPhase('processing');
      setImportProgress({
        status: 'uploading',
        message: 'Processing files and uploading photos to Cloudinary...'
      });

      // Handle both response formats
      const created = result.results?.created || result.created || 0;
      const updated = result.results?.updated || result.updated || 0;
      const withPhotos = result.results?.withPhotos || result.withPhotos || 0;

      setUploadPhase('complete');
      setUploadProgress(100);

      setImportProgress({
        status: 'success',
        message: `Import completed! ${created} created, ${updated} updated, ${withPhotos} with photos`
      });

      alert('CSV + Photos import successful!');
      fetchStudents();

      setTimeout(() => {
        setImportProgress(null);
        setUploadProgress(0);
        setUploadPhase('');
      }, 5000);

    } catch (error) {
      setImportProgress({
        status: 'error',
        message: `Import failed: ${error.message}`
      });
      alert('Import failed: ' + error.message);

      setTimeout(() => {
        setImportProgress(null);
        setUploadProgress(0);
        setUploadPhase('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };







  // View Photo Function
  const viewStudentPhoto = (student) => {
    if (student.photo_url) {
      setSelectedStudentPhoto({
        url: student.photo_url,
        name: student.name,
        id: student.student_id
      });
      setShowPhotoModal(true);
    } else {
      alert('This student has no photo');
    }
  };

  // Predefined classes
  const classOptions = [
    'S1A', 'S1B', 'S1C', 'S1D', 'S1E',
    'S2A', 'S2B', 'S2C', 'S2D',
    'S3A', 'S3B', 'S3C'
  ];

  const genderOptions = ['Male', 'Female'];

  // Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Format phone number
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{3})(\d{3})(\d{3})/, '+250 $1 $2 $3');
  };

  // Sample CSV template download
  const downloadCSVTemplate = () => {
    const csvContent = "student_id,name,class,level,residence,gender,parent_phone\nSTU001,John Doe,S1A,Secondary 1,Kigali,Male,0781234567\nSTU002,Jane Smith,S2B,Secondary 2,Musanze,Female,0799876543";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Bulk Import Button */}
      <div className="flex p-4 flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="animate-slide-down">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Student Management
          </h2>
          <p className="text-gray-400 mt-2">
            {students.length} students in database • Search or filter to view records
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setBulkImportMode(true)}
            className="group relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-purple-500/25 hover:scale-105"
          >
            <i className="pi pi-upload text-lg"></i>
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="group relative bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-cyan-500/25 hover:scale-105"
          >
            <i className="pi pi-user-plus text-lg"></i>
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6 animate-slide-up">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <i className="pi pi-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search students by name, ID, class, or residence..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400 transition-all duration-300"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 rounded-xl text-white transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <i className="pi pi-filter"></i>
                <span>Filters {showFilters ? '(Hide)' : '(Show)'}</span>
              </button>
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded-xl text-gray-300 transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <i className="pi pi-refresh"></i>
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-600 animate-slide-down">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-cyan-300">
                  Class
                </label>
                <select
                  name="class"
                  value={filters.class}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                >
                  <option value="">All Classes</option>
                  {classOptions.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-cyan-300">
                  Gender
                </label>
                <select
                  name="gender"
                  value={filters.gender}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                >
                  <option value="">All Genders</option>
                  {genderOptions.map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-cyan-300">
                  Items Per Page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-cyan-300">
                  Quick Actions
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilters({ class: 'S1A', gender: '' })}
                    className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded-lg border border-blue-500/30 transition-colors"
                  >
                    S1A
                  </button>
                  <button
                    onClick={() => setFilters({ class: 'S2A', gender: '' })}
                    className="flex-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded-lg border border-emerald-500/30 transition-colors"
                  >
                    S2A
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Indicator */}
          {(searchTerm || Object.values(filters).some(filter => filter)) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-cyan-300">
              <i className="pi pi-info-circle"></i>
              <span>
                Found {filteredStudents.length} students •
                {searchTerm && ` Search: "${searchTerm}"`}
                {filters.class && ` • Class: ${filters.class}`}
                {filters.gender && ` • Gender: ${filters.gender}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Import Progress Indicator */}
      {importProgress && (
        <div className={`p-4 rounded-xl border ${importProgress.status === 'success' ? 'bg-emerald-900/30 border-emerald-500' : importProgress.status === 'error' ? 'bg-red-900/30 border-red-500' : 'bg-cyan-900/30 border-cyan-500'}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {importProgress.status === 'uploading' && (
                  <i className="pi pi-spin pi-spinner text-cyan-400"></i>
                )}
                {importProgress.status === 'success' && (
                  <i className="pi pi-check-circle text-emerald-400"></i>
                )}
                {importProgress.status === 'error' && (
                  <i className="pi pi-times-circle text-red-400"></i>
                )}
                <span className="text-white">{importProgress.message}</span>
              </div>
              <button
                onClick={() => {
                  setImportProgress(null);
                  setUploadProgress(0);
                  setUploadPhase('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <i className="pi pi-times"></i>
              </button>
            </div>

            {/* Progress Bar - Show only during uploading phase */}
            {uploadPhase === 'uploading' && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {uploadPhase === 'processing' && (
              <div className="flex items-center space-x-3 text-cyan-300">
                <i className="pi pi-spin pi-spinner"></i>
                <span>Processing files, please wait...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {searchTerm || Object.values(filters).some(filter => filter) ? (
        <>
          {/* Students Table */}
          {filteredStudents.length > 0 ? (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-scale-in">
              {loading ? (
                <div className="flex justify-center items-center p-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-full">
                      <thead className="bg-gray-800/50 backdrop-blur-sm">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-id-card mr-2"></i>
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-user mr-2"></i>
                            Name
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-building mr-2"></i>
                            Class
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-map-marker mr-2"></i>
                            Residence
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-users mr-2"></i>
                            Gender
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-phone mr-2"></i>
                            Parent Phone
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-image mr-2"></i>
                            Photo
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                            <i className="pi pi-cog mr-2"></i>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {getCurrentPageStudents().map((student, index) => (
                          <tr
                            key={student._id}
                            className="hover:bg-gray-700/30 transition-all duration-300 animate-fade-in"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white bg-gray-700 px-3 py-1 rounded-lg inline-block">
                                {student.student_id}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-lg font-semibold text-white">{student.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium px-3 py-1 rounded-lg inline-block ${student.class?.startsWith('S1') ? 'bg-blue-500/20 text-blue-300 border border-blue-400' :
                                student.class?.startsWith('S2') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400' :
                                  'bg-purple-500/20 text-purple-300 border border-purple-400'
                                }`}>
                                {student.class}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-300">{student.residence || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${student.gender === 'Male'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-400'
                                : 'bg-pink-500/20 text-pink-300 border border-pink-400'
                                }`}>
                                <i className={`pi ${student.gender === 'Male' ? 'pi-mars' : 'pi-venus'} mr-1`}></i>
                                {student.gender}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-cyan-300">
                                {formatPhone(student.parent_phone)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.photo_url ? (
                                <button
                                  onClick={() => viewStudentPhoto(student)}
                                  className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1 rounded-lg border border-cyan-500/30"
                                >
                                  <i className="pi pi-eye"></i>
                                  <span className="text-sm">View</span>
                                </button>
                              ) : (
                                <span className="text-gray-500 text-sm">No photo</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(student)}
                                  className="text-cyan-400 hover:text-cyan-300 transition-all duration-300 hover:scale-110 flex items-center space-x-1 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-2 rounded-lg border border-cyan-500/30"
                                >
                                  <i className="pi pi-pencil text-sm"></i>
                                  <span className="text-sm">Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(student._id)}
                                  className="text-red-400 hover:text-red-300 transition-all duration-300 hover:scale-110 flex items-center space-x-1 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/30"
                                >
                                  <i className="pi pi-trash text-sm"></i>
                                  <span className="text-sm">Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Showing {Math.min(itemsPerPage, filteredStudents.length)} of {filteredStudents.length} results
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                          >
                            <i className="pi pi-chevron-left"></i>
                          </button>

                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`w-10 h-10 rounded-lg transition-all ${currentPage === pageNum
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                          >
                            <i className="pi pi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* No Results State */
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-16 text-center animate-pulse">
              <div className="text-cyan-400 text-8xl mb-6">
                <i className="pi pi-search"></i>
              </div>
              <p className="text-gray-300 text-xl mb-2">
                No students match your search criteria
              </p>
              <p className="text-gray-400 mb-6">
                Try adjusting your search terms or filters
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white transition-all duration-300 hover:scale-105 flex items-center space-x-2 mx-auto"
              >
                <i className="pi pi-refresh"></i>
                <span>Clear Search & Filters</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Initial State - No search/filter */
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-16 text-center animate-pulse">
          <div className="text-cyan-400 text-8xl mb-6">
            <i className="pi pi-search"></i>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Start Exploring Students</h3>
          <p className="text-gray-300 text-lg mb-6">
            Use the search bar or filters above to find student records
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-600">
              <i className="pi pi-search text-3xl text-cyan-400 mb-3"></i>
              <h4 className="text-white font-semibold mb-2">Search</h4>
              <p className="text-gray-400 text-sm">Search by name, ID, class, or residence</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-600">
              <i className="pi pi-filter text-3xl text-emerald-400 mb-3"></i>
              <h4 className="text-white font-semibold mb-2">Filter</h4>
              <p className="text-gray-400 text-sm">Filter by class, gender, or other criteria</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-600">
              <i className="pi pi-plus text-3xl text-purple-400 mb-3"></i>
              <h4 className="text-white font-semibold mb-2">Add New</h4>
              <p className="text-gray-400 text-sm">Click "Add Student" to create new records</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal - FIXED DESIGN */}
      {(showAddModal && !bulkImportMode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div ref={modalRef} className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-cyan-500/20 w-full max-w-2xl max-h-[90vh] my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  {editingStudent ? 'Edit Student' : 'Create New Student'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white transition-colors duration-200 hover:bg-gray-700/50 p-2 rounded-lg"
                >
                  <i className="pi pi-times text-xl"></i>
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {editingStudent ? 'Update student information' : 'Fill in the details to add a new student'}
              </p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Student ID *
                    </label>
                    <input
                      type="text"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400"
                      placeholder="STU001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Class *
                    </label>
                    <select
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="">Select Class</option>
                      {classOptions.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Residence
                    </label>
                    <input
                      type="text"
                      name="residence"
                      value={formData.residence}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400"
                      placeholder="Kigali"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Parent Phone
                    </label>
                    <input
                      type="text"
                      name="parent_phone"
                      value={formData.parent_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400"
                      placeholder="+250 78 123 4567"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-cyan-300">
                      Student Photo (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        name="photo"
                        onChange={handleInputChange}
                        accept="image/*"
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                      />
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      Max 5MB. Accepted: JPG, JPEG, PNG
                    </p>

                    {/* Show current photo if editing */}
                    {editingStudent && editingStudent.photo_url && (
                      <div className="mt-4">
                        <p className="text-sm text-cyan-300 mb-2">Current Photo:</p>
                        <div className="flex items-center space-x-4">
                          <img
                            src={editingStudent.photo_url}
                            alt="Current student photo"
                            className="w-24 h-24 rounded-lg object-cover border border-gray-600"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/100x100?text=No+Photo';
                            }}
                          />
                          <span className="text-gray-400 text-sm">
                            Upload a new photo to replace this one
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="sticky bottom-0 border-t border-gray-700 bg-gray-900/95 backdrop-blur-sm p-6">
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
                >
                  <i className="pi pi-times"></i>
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <i className="pi pi-spin pi-spinner"></i>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className={`pi ${editingStudent ? 'pi-sync' : 'pi-check'}`}></i>
                      <span>{editingStudent ? 'Update Student' : 'Create Student'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkImportMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div ref={modalRef} className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-purple-500/20 w-full max-w-2xl max-h-[90vh] my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Bulk Import Students
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white transition-colors duration-200 hover:bg-gray-700/50 p-2 rounded-lg"
                >
                  <i className="pi pi-times text-xl"></i>
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Import multiple students via CSV file (with optional photos)
              </p>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* CSV Template Info */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600">
                <div className="flex items-start space-x-3">
                  <i className="pi pi-info-circle text-cyan-400 text-xl mt-1"></i>
                  <div>
                    <h4 className="text-white font-semibold mb-2">CSV Format Required</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Your CSV file must include these columns in order:
                    </p>
                    <div className="bg-gray-900 rounded-lg p-3 mb-3">
                      <code className="text-cyan-300 text-sm">
                        student_id,name,class,level,residence,gender,parent_phone
                      </code>
                    </div>
                    <button
                      onClick={downloadCSVTemplate}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-2"
                    >
                      <i className="pi pi-download"></i>
                      <span>Download Template CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CSV File Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-cyan-300">
                  CSV File *
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-cyan-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <i className="pi pi-file text-5xl text-gray-400 mb-3"></i>
                    <p className="text-gray-300 mb-2">
                      {csvFile ? csvFile.name : 'Click to upload CSV file'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Supports .csv files with student data
                    </p>
                  </label>
                </div>
              </div>

              {/* Photo ZIP Upload (Optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-cyan-300">
                  Student Photos ZIP (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-cyan-500 transition-colors">
                  <input
                    type="file"
                    accept=".zip,.rar"
                    onChange={(e) => setPhotoZipFile(e.target.files[0])}
                    className="hidden"
                    id="zip-upload"
                  />
                  <label htmlFor="zip-upload" className="cursor-pointer">
                    <i className="pi pi-images text-5xl text-gray-400 mb-3"></i>
                    <p className="text-gray-300 mb-2">
                      {photoZipFile ? photoZipFile.name : 'Click to upload ZIP with photos'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      ZIP containing photos named as student_id.jpg (e.g., STU001.jpg)
                    </p>
                  </label>
                </div>
              </div>

              {/* Import Options */}
              <div className="bg-gray-800/30 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-3">Import Options</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <i className="pi pi-sync text-cyan-400"></i>
                    <span className="text-gray-300">Update existing students if student_id matches</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <i className="pi pi-plus text-emerald-400"></i>
                    <span className="text-gray-300">Create new students for unmatched IDs</span>
                  </div>
                  {photoZipFile && (
                    <div className="flex items-center space-x-3">
                      <i className="pi pi-image text-purple-400"></i>
                      <span className="text-gray-300">Upload photos to Cloudinary and link to students</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-gray-700 bg-gray-900/95 backdrop-blur-sm p-6">
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
                >
                  <i className="pi pi-times"></i>
                  <span>Cancel</span>
                </button>
                <div className="flex space-x-4">
                  <button
                    onClick={handleCSVImport}
                    disabled={!csvFile || loading}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <i className="pi pi-spin pi-spinner"></i>
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <i className="pi pi-upload"></i>
                        <span>Import CSV Only</span>
                      </>
                    )}
                  </button>
                  {photoZipFile && (
                    <button
                      onClick={handleCSVWithPhotosImport}
                      disabled={!csvFile || loading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <i className="pi pi-images"></i>
                      <span>Import CSV + Photos</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Photo View Modal */}
      {showPhotoModal && selectedStudentPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-cyan-500/20 w-full max-w-2xl max-h-[90vh] animate-scale-in">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Student Photo
                  </h3>
                  <p className="text-gray-400">
                    {selectedStudentPhoto.name} ({selectedStudentPhoto.id})
                  </p>
                </div>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200 hover:bg-gray-700/50 p-2 rounded-lg"
                >
                  <i className="pi pi-times text-xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-center">
                <img
                  src={selectedStudentPhoto.url}
                  alt={`${selectedStudentPhoto.name}'s photo`}
                  className="max-w-full max-h-[60vh] rounded-xl shadow-2xl"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x400?text=Photo+Not+Available';
                  }}
                />
              </div>

              <div className="mt-6 flex justify-center space-x-4">
                <a
                  href={selectedStudentPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <i className="pi pi-external-link"></i>
                  <span>Open in New Tab</span>
                </a>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = selectedStudentPhoto.url;
                    a.download = `${selectedStudentPhoto.id}_photo.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <i className="pi pi-download"></i>
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;