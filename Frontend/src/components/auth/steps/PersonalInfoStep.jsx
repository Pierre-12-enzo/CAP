// components/auth/steps/PersonalInfoStep.jsx
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

  // Check password strength
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

  // Handle password change
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  // Check email availability
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

  // Debounced email check
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    
    if (email.includes('@') && email.includes('.')) {
      const timeoutId = setTimeout(() => checkEmailAvailability(email), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  // Validate form
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

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
    console.log('📤 Sending data to backend:', formData); // DEBUG LINE
    onSubmit(formData);
  }
  };

  // Get password strength color
  const getStrengthColor = () => {
    const colors = {
      'Very Weak': 'bg-red-500',
      'Weak': 'bg-orange-500',
      'Good': 'bg-yellow-500',
      'Strong': 'bg-green-500',
      'Very Strong': 'bg-cyan-500'
    };
    return colors[passwordStrength.strength] || 'bg-gray-500';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Create your account</h2>
      
      {/* Name fields - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.firstName ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.lastName ? 'border-red-500' : 'border-white/20'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <input
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={() => formData.email && checkEmailAvailability(formData.email)}
            className={`w-full px-4 py-3 bg-white/5 border ${
              errors.email ? 'border-red-500' : 
              emailAvailable ? 'border-white/20' : 'border-red-500'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
            placeholder="john@school.com"
          />
          {checkingEmail && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 border-t-transparent"></div>
            </div>
          )}
          {!checkingEmail && formData.email && emailAvailable && (
            <div className="absolute right-3 top-3 text-green-400">✓</div>
          )}
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          className={`w-full px-4 py-3 bg-white/5 border ${
            errors.phoneNumber ? 'border-red-500' : 'border-white/20'
          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
          placeholder="+250 788 123 456"
        />
        {errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-400">{errors.phoneNumber}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={handlePasswordChange}
          className={`w-full px-4 py-3 bg-white/5 border ${
            errors.password ? 'border-red-500' : 'border-white/20'
          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
          placeholder="••••••••"
        />
        
        {/* Password strength meter */}
        {formData.password && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Password Strength:</span>
              <span className={`text-xs font-semibold ${
                passwordStrength.strength === 'Very Strong' ? 'text-cyan-400' :
                passwordStrength.strength === 'Strong' ? 'text-green-400' :
                passwordStrength.strength === 'Good' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {passwordStrength.strength}
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${passwordStrength.score}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full ${getStrengthColor()}`}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Use 8+ characters with mix of letters, numbers & symbols
            </p>
          </div>
        )}
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Confirm Password
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          className={`w-full px-4 py-3 bg-white/5 border ${
            errors.confirmPassword ? 'border-red-500' : 'border-white/20'
          } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
      >
        <span className="relative z-10">
          {loading ? 'Processing...' : 'Continue'}
        </span>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600"
          initial={{ x: '100%' }}
          whileHover={{ x: 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>
    </form>
  );
};

export default PersonalInfoStep;
