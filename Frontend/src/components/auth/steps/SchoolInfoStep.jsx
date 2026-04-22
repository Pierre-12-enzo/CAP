// components/auth/steps/SchoolInfoStep.jsx - EMERALD THEME WITH PRIMEICONS
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const SchoolInfoStep = ({ onSubmit, initialData, loading }) => {
  const [schoolData, setSchoolData] = useState({
    schoolName: initialData?.name || '',
    schoolType: initialData?.type || 'secondary',
    schoolEmail: initialData?.email || '',
    schoolPhone: initialData?.phone || '',
    province: initialData?.province || '',
    district: initialData?.district || '',
    sector: initialData?.sector || '',
    country: initialData?.country || 'Rwanda',
    logo: null,
    logoPreview: initialData?.logo?.url || ''
  });

  const [errors, setErrors] = useState({});
  const [schoolNameAvailable, setSchoolNameAvailable] = useState(true);
  const [checkingName, setCheckingName] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const schoolTypes = [
    { value: 'secondary', label: 'Secondary School' },
    { value: 'primary', label: 'Primary School' },
    { value: 'both', label: 'Both' }
  ];

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

  const handleSchoolNameChange = (e) => {
    const name = e.target.value;
    setSchoolData({ ...schoolData, schoolName: name });

    if (name.length >= 3) {
      const timeoutId = setTimeout(() => checkSchoolName(name), 500);
      return () => clearTimeout(timeoutId);
    }
  };

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
      setSchoolData({ ...schoolData, logo: file, logoPreview: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSchoolData({ ...schoolData, logo: null, logoPreview: '' });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!schoolData.schoolName?.trim()) newErrors.schoolName = 'School name is required';
    else if (!schoolNameAvailable) newErrors.schoolName = 'School name already registered';
    if (!schoolData.schoolType) newErrors.schoolType = 'School type is required';
    if (!schoolData.schoolEmail?.trim()) newErrors.schoolEmail = 'School email is required';
    else if (!/\S+@\S+\.\S+/.test(schoolData.schoolEmail)) newErrors.schoolEmail = 'Invalid email format';
    if (!schoolData.schoolPhone?.trim()) newErrors.schoolPhone = 'School phone is required';
    if (!schoolData.province?.trim()) newErrors.province = 'Province is required';
    if (!schoolData.district?.trim()) newErrors.district = 'District is required';
    if (!schoolData.sector?.trim()) newErrors.sector = 'Sector is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('schoolName', schoolData.schoolName);
    formData.append('schoolType', schoolData.schoolType);
    formData.append('schoolEmail', schoolData.schoolEmail);
    formData.append('schoolPhone', schoolData.schoolPhone);
    formData.append('province', schoolData.province);
    formData.append('district', schoolData.district);
    formData.append('sector', schoolData.sector);
    formData.append('country', schoolData.country);
    if (schoolData.logo) formData.append('logo', schoolData.logo);

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">School Information</h2>
        <p className="text-sm text-gray-600">Tell us about your institution</p>
      </div>

      {/* School Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          School Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={schoolData.schoolName}
            onChange={handleSchoolNameChange}
            className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.schoolName || (!schoolNameAvailable && schoolData.schoolName)
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-emerald-500'
              }`}
            placeholder="e.g., Lycée de Kigali"
          />
          {checkingName && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <i className="pi pi-spinner pi-spin text-emerald-500"></i>
            </div>
          )}
        </div>

        <AnimatePresence>
          {!schoolNameAvailable && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <p className="text-xs text-emerald-700 mb-2 flex items-center">
                <i className="pi pi-lightbulb mr-1"></i>
                Try these alternatives:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSchoolData({ ...schoolData, schoolName: suggestion });
                      checkSchoolName(suggestion);
                    }}
                    className="px-3 py-1 bg-white hover:bg-emerald-100 rounded-full text-xs text-gray-700 transition-colors border border-emerald-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {errors.schoolName && <p className="mt-1 text-xs text-red-600">{errors.schoolName}</p>}
      </div>

      {/* School Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          School Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {schoolTypes.map((type) => (
            <motion.button
              key={type.value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSchoolData({ ...schoolData, schoolType: type.value })}
              className={`p-2.5 rounded-xl border-2 transition-all text-sm font-medium ${schoolData.schoolType === type.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200'
                }`}
            >
              {type.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            School Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={schoolData.schoolEmail}
            onChange={(e) => setSchoolData({ ...schoolData, schoolEmail: e.target.value })}
            className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 ${errors.schoolEmail ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
              }`}
            placeholder="info@school.com"
          />
          {errors.schoolEmail && <p className="mt-1 text-xs text-red-600">{errors.schoolEmail}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            School Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={schoolData.schoolPhone}
            onChange={(e) => setSchoolData({ ...schoolData, schoolPhone: e.target.value })}
            className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 ${errors.schoolPhone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
              }`}
            placeholder="+250 788 123 456"
          />
          {errors.schoolPhone && <p className="mt-1 text-xs text-red-600">{errors.schoolPhone}</p>}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <i className="pi pi-map-marker mr-1.5 text-emerald-600"></i>
          Address
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Province *</label>
            <input
              type="text"
              value={schoolData.province}
              onChange={(e) => setSchoolData({ ...schoolData, province: e.target.value })}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 ${errors.province ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                }`}
              placeholder="Southern Province"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">District *</label>
            <input
              type="text"
              value={schoolData.district}
              onChange={(e) => setSchoolData({ ...schoolData, district: e.target.value })}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 ${errors.district ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                }`}
              placeholder="Huye"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sector *</label>
            <input
              type="text"
              value={schoolData.sector}
              onChange={(e) => setSchoolData({ ...schoolData, sector: e.target.value })}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 ${errors.sector ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                }`}
              placeholder="Ngoma"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
            <input
              type="text"
              value={schoolData.country}
              onChange={(e) => setSchoolData({ ...schoolData, country: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Rwanda"
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">School Logo</label>
        <div className="flex items-center space-x-4">
          <div className="relative w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 overflow-hidden">
            {schoolData.logoPreview ? (
              <>
                <img src={schoolData.logoPreview} alt="Logo" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                >
                  <i className="pi pi-times text-xs"></i>
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <i className="pi pi-image text-2xl"></i>
              </div>
            )}
          </div>
          <div>
            <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-700 cursor-pointer transition-colors"
            >
              <i className="pi pi-upload mr-2"></i>
              Choose Logo
            </label>
            <p className="mt-1 text-xs text-gray-500">Square image, max 2MB</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => window.history.back()}
          className="px-5 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors flex items-center"
        >
          <i className="pi pi-arrow-left mr-2"></i>
          Back
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <i className="pi pi-spinner pi-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              Continue to Plans
              <i className="pi pi-arrow-right ml-2"></i>
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

export default SchoolInfoStep;