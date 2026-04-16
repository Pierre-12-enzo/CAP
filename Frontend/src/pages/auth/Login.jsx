// components/auth/Login.js - Cinematic 2-Part Layout with Enhanced Validation
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: ''
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Validation rules
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        } else if (value.length > 100) {
          error = 'Email must be less than 100 characters';
        }
        break;
        
      case 'password':
        if (!value.trim()) {
          error = 'Password is required';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        } else if (value.length > 50) {
          error = 'Password must be less than 50 characters';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear global error when user starts typing
    if (error) setError('');
    
    // Real-time validation if field has been touched
    if (touched[name]) {
      const fieldError = validateField(name, value);
      setFormErrors(prev => ({
        ...prev,
        [name]: fieldError
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    const fieldError = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });
    
    setFormErrors(errors);
    
    // Mark all fields as touched to show errors
    if (!isValid) {
      setTouched({
        email: true,
        password: true
      });
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear previous errors
    setError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if form is valid for submit button
  const isFormValid = () => {
    return formData.email && formData.password && 
           !formErrors.email && !formErrors.password;
  };

  // Auto-remove error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Form Section */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-3 shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">CAP_mis</h1>
                <p className="text-sm text-emerald-600 font-medium">Card Attendance & Permission MIS</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <form 
            className="space-y-6" 
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Global Error */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
                {formErrors.email && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 pr-10 ${
                    formErrors.email && touched.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {formErrors.email && touched.email ? (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  )}
                </div>
              </div>
              {formErrors.email && touched.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
                {formErrors.password && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 pr-10 ${
                    formErrors.password && touched.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {formErrors.password && touched.password ? (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              {formErrors.password && touched.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transform transition-all duration-300 relative overflow-hidden group ${
                loading || !isFormValid() 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105'
              }`}
            >
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  New to CAP_mis?
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Link
                to="/register"
                className="w-full flex justify-center py-3 px-4 border border-emerald-500 rounded-xl text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105"
              >
                Create your account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Cinematic Visual Section (YOUR ORIGINAL CODE - NO CHANGES) */}
      <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-emerald-50 to-green-100 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Floating Green Dots */}
          <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-emerald-400 rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-green-500 rounded-full opacity-40 animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-emerald-300 rounded-full opacity-50 animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-green-400 rounded-full opacity-60 animate-float" style={{animationDelay: '3s'}}></div>
          
          {/* Smoke/Light Effect */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-emerald-200 to-transparent rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-green-200 to-transparent rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 gap-4 h-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border-r border-b border-emerald-300"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="mb-8">
              {/* Animated Card Stack */}
              <div className="relative mx-auto mb-6 w-32 h-40">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-2xl transform rotate-3 animate-float"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl shadow-xl transform -rotate-2 translate-y-1 animate-float" style={{animationDelay: '1s'}}></div>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl shadow-lg transform rotate-6 translate-y-2 animate-float" style={{animationDelay: '2s'}}></div>
                <div className="w-32 h-32 mx-auto mb-6 mt-6  bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6">
                <span className="text-white text-4xl font-bold">ID</span>
              </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Smart Card Management
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Generate, track, and manage student ID cards with our futuristic automation system. 
                Perfect for educational institutions of all sizes.
              </p>
            </div>
            
            {/* Feature List */}
            <div className="space-y-4 text-left bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center text-gray-700 group">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Batch Processing</div>
                  <div className="text-sm text-gray-600">Generate 500+ cards in minutes</div>
                </div>
              </div>
              
              <div className="flex items-center text-gray-700 group">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Smart Templates</div>
                  <div className="text-sm text-gray-600">Drag & drop visual designer</div>
                </div>
              </div>
              
              <div className="flex items-center text-gray-700 group">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Real-time Analytics</div>
                  <div className="text-sm text-gray-600">Track usage and performance</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;