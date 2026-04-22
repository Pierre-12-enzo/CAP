// components/auth/steps/PersonalInfoStep.jsx - EMERALD THEME
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { authAPI } from '../../../services/api';

const PersonalInfoStep = ({ onSubmit, initialData, loading }) => {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phoneNumber: initialData?.phoneNumber || '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, strength: '' });
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    const strength =
      score >= 90 ? 'Very Strong' :
        score >= 70 ? 'Strong' :
          score >= 50 ? 'Good' :
            score >= 25 ? 'Weak' : 'Very Weak';

    return { score, strength };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const checkEmailAvailability = async (email) => {
    if (!email) return;
    setCheckingEmail(true);
    try {
      const response = await authAPI.checkEmail(email);
      setEmailAvailable(response.available);
    } catch (error) {
      console.error('Email check failed:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({ ...formData, email });

    if (email.includes('@') && email.includes('.')) {
      const timeoutId = setTimeout(() => checkEmailAvailability(email), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    } else if (!emailAvailable) {
      newErrors.email = 'Email already registered';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('📤 Sending data to backend:', formData);
      onSubmit(formData);
    }
  };

  const getStrengthColor = () => {
    const colors = {
      'Very Weak': 'bg-red-500',
      'Weak': 'bg-orange-500',
      'Good': 'bg-yellow-500',
      'Strong': 'bg-green-500',
      'Very Strong': 'bg-emerald-500'
    };
    return colors[passwordStrength.strength] || 'bg-gray-500';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className={`w-full px-4 py-3 bg-white border ${errors.firstName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
              } rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`}
            placeholder="John"
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className={`w-full px-4 py-3 bg-white border ${errors.lastName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
              } rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`}
            placeholder="Doe"
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={() => formData.email && checkEmailAvailability(formData.email)}
            className={`w-full px-4 py-3 pr-10 bg-white border ${errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' :
                emailAvailable ? 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500' : 'border-red-300'
              } rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`}
            placeholder="john@school.com"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {checkingEmail && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent"></div>
            )}
            {!checkingEmail && formData.email && emailAvailable && (
              <span className="text-green-500">✓</span>
            )}
          </div>
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          className={`w-full px-4 py-3 bg-white border ${errors.phoneNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
            } rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`}
          placeholder="+250 788 123 456"
        />
        {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={handlePasswordChange}
          className={`w-full px-4 py-3 bg-white border ${errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
            } rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`}
          placeholder="••••••••"
        />

        {formData.password && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Password Strength:</span>
              <span className={`text-xs font-semibold ${passwordStrength.strength === 'Very Strong' ? 'text-emerald-600' :
                  passwordStrength.strength === 'Strong' ? 'text-green-600' :
                    passwordStrength.strength === 'Good' ? 'text-yellow-600' :
                      'text-red-600'
                }`}>
                {passwordStrength.strength}
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${passwordStrength.score}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full ${getStrengthColor()}`}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use 8+ characters with mix of letters, numbers & symbols
            </p>
          </div>
        )}
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className={`w-full px-4 py-3 bg-white border ${errors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
            } rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`}
          placeholder="••••••••"
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : 'Continue'}
      </motion.button>
    </form>
  );
};

export default PersonalInfoStep;