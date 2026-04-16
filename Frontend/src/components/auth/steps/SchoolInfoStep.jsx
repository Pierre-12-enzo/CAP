// components/auth/steps/SchoolInfoStep.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const SchoolInfoStep = ({ onSubmit, initialData, loading }) => {
  // Use 'schoolData' for state, not 'formData' to avoid confusion
  const [schoolData, setSchoolData] = useState({
    schoolName: initialData?.name || '',
    schoolType: initialData?.type || 'secondary',
    schoolEmail: initialData?.email || '',
    schoolPhone: initialData?.phone || '',
    address: {
      province: initialData?.address?.province || '',
      district: initialData?.address?.district || '',
      sector: initialData?.address?.sector || '',
      country: initialData?.address?.country || 'Rwanda'
    },
    logo: null,
    logoPreview: initialData?.logo?.url || ''
  });

  const [errors, setErrors] = useState({});
  const [schoolNameAvailable, setSchoolNameAvailable] = useState(true);
  const [checkingName, setCheckingName] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // School types
  const schoolTypes = [
    { value: 'secondary', label: 'Secondary School' },
    { value: 'primary', label: 'Primary School' },
    { value: 'both', label: 'Both (Nursery to Secondary)' }
  ];

  // Check school name availability
  const checkSchoolName = async (name) => {
    if (!name || name.length < 3) return;
    setCheckingName(true);
    try {
      const response = await authAPI.checkSchoolName(name);
      setSchoolNameAvailable(response.available);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('School name check failed:', error);
    } finally {
      setCheckingName(false);
    }
  };

  // Debounced school name check
  const handleSchoolNameChange = (e) => {
    const name = e.target.value;
    setSchoolData({ ...schoolData, schoolName: name });
    
    if (name.length >= 3) {
      const timeoutId = setTimeout(() => checkSchoolName(name), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle logo selection
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, logo: 'Please upload an image file' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: 'Logo must be less than 2MB' });
      return;
    }

    setErrors({ ...errors, logo: '' });

    const reader = new FileReader();
    reader.onloadend = () => {
      setSchoolData({
        ...schoolData,
        logo: file,
        logoPreview: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove logo
  const removeLogo = () => {
    setSchoolData({
      ...schoolData,
      logo: null,
      logoPreview: ''
    });
  };

  // Handle address changes
  const handleAddressChange = (field, value) => {
    setSchoolData({
      ...schoolData,
      address: {
        ...schoolData.address,
        [field]: value
      }
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!schoolData.schoolName?.trim()) {
      newErrors.schoolName = 'School name is required';
    } else if (!schoolNameAvailable) {
      newErrors.schoolName = 'School name already registered';
    }

    if (!schoolData.schoolType) {
      newErrors.schoolType = 'School type is required';
    }

    if (!schoolData.schoolEmail?.trim()) {
      newErrors.schoolEmail = 'School email is required';
    } else if (!/\S+@\S+\.\S+/.test(schoolData.schoolEmail)) {
      newErrors.schoolEmail = 'Invalid email format';
    }

    if (!schoolData.schoolPhone?.trim()) {
      newErrors.schoolPhone = 'School phone is required';
    }

    if (!schoolData.address.province?.trim()) {
      newErrors.province = 'Province is required';
    }

    if (!schoolData.address.district?.trim()) {
      newErrors.district = 'District is required';
    }

    if (!schoolData.address.sector?.trim()) {
      newErrors.sector = 'Sector is required';
    }

    if (!schoolData.address.country?.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Create FormData for submission (different from state variable)
    const submitFormData = new FormData();
    
    // Append text fields
    submitFormData.append('schoolName', schoolData.schoolName);
    submitFormData.append('schoolType', schoolData.schoolType);
    submitFormData.append('schoolEmail', schoolData.schoolEmail);
    submitFormData.append('schoolPhone', schoolData.schoolPhone);
    
    // Append address fields individually (easier for backend)
    submitFormData.append('province', schoolData.address.province);
    submitFormData.append('district', schoolData.address.district);
    submitFormData.append('sector', schoolData.address.sector);
    submitFormData.append('country', schoolData.address.country);
    
    // Append logo if exists
    if (schoolData.logo) {
      submitFormData.append('logo', schoolData.logo);
    }

    // Send to parent
    onSubmit(submitFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">School Information</h2>
      <p className="text-gray-400 mb-6">Tell us about your institution</p>

      {/* School Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          School Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={schoolData.schoolName}
            onChange={handleSchoolNameChange}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.schoolName ? 'border-red-500' : 
              !schoolNameAvailable && schoolData.schoolName ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="e.g., Lycée de Kigali"
          />
          {checkingName && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
            </div>
          )}
        </div>
        
        {/* Suggestions */}
        <AnimatePresence>
          {!schoolNameAvailable && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg"
            >
              <p className="text-sm text-purple-300 mb-2">Try these alternatives:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSchoolData({ ...schoolData, schoolName: suggestion });
                      checkSchoolName(suggestion);
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {errors.schoolName && (
          <p className="mt-1 text-sm text-red-400">{errors.schoolName}</p>
        )}
      </div>

      {/* School Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          School Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {schoolTypes.map((type) => (
            <motion.button
              key={type.value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSchoolData({ ...schoolData, schoolType: type.value })}
              className={`p-4 rounded-xl border-2 transition-all ${
                schoolData.schoolType === type.value
                  ? 'border-cyan-400 bg-cyan-400/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <span className={`text-sm font-medium ${
                schoolData.schoolType === type.value ? 'text-cyan-400' : 'text-gray-300'
              }`}>
                {type.label}
              </span>
            </motion.button>
          ))}
        </div>
        {errors.schoolType && (
          <p className="mt-1 text-sm text-red-400">{errors.schoolType}</p>
        )}
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            School Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={schoolData.schoolEmail}
            onChange={(e) => setSchoolData({ ...schoolData, schoolEmail: e.target.value })}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.schoolEmail ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="info@yourschool.com"
          />
          {errors.schoolEmail && (
            <p className="mt-1 text-sm text-red-400">{errors.schoolEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            School Phone <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            value={schoolData.schoolPhone}
            onChange={(e) => setSchoolData({ ...schoolData, schoolPhone: e.target.value })}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.schoolPhone ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="+250 788 123 456"
          />
          {errors.schoolPhone && (
            <p className="mt-1 text-sm text-red-400">{errors.schoolPhone}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Address</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Province <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={schoolData.address.province}
            onChange={(e) => handleAddressChange('province', e.target.value)}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.province ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="Southern Province"
          />
          {errors.province && (
            <p className="mt-1 text-sm text-red-400">{errors.province}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              District <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={schoolData.address.district}
              onChange={(e) => handleAddressChange('district', e.target.value)}
              className={`w-full px-4 py-3 bg-white/5 border ${
                errors.district ? 'border-red-500' : 'border-white/20'
              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
              placeholder="Huye"
            />
            {errors.district && (
              <p className="mt-1 text-sm text-red-400">{errors.district}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sector <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={schoolData.address.sector}
              onChange={(e) => handleAddressChange('sector', e.target.value)}
              className={`w-full px-4 py-3 bg-white/5 border ${
                errors.sector ? 'border-red-500' : 'border-white/20'
              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
              placeholder="Ngoma"
            />
            {errors.sector && (
              <p className="mt-1 text-sm text-red-400">{errors.sector}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Country <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={schoolData.address.country}
            onChange={(e) => handleAddressChange('country', e.target.value)}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.country ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="Rwanda"
          />
          {errors.country && (
            <p className="mt-1 text-sm text-red-400">{errors.country}</p>
          )}
        </div>
      </div>

      {/* School Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          School Logo
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative w-24 h-24 rounded-xl bg-white/10 border-2 border-dashed border-white/20 overflow-hidden">
            {schoolData.logoPreview ? (
              <>
                <img
                  src={schoolData.logoPreview}
                  alt="School logo"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-3xl">🏫</span>
              </div>
            )}
          </div>

          <div>
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white cursor-pointer transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose Logo
            </label>
            <p className="mt-2 text-xs text-gray-400">
              Recommended: Square image, max 2MB
            </p>
          </div>
        </div>
        {errors.logo && (
          <p className="mt-1 text-sm text-red-400">{errors.logo}</p>
        )}
      </div>

      {/* Submit button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Continue to Plans'}
      </motion.button>
    </form>
  );
};

export default SchoolInfoStep;