// components/auth/steps/CompletionStep.jsx - EMERALD THEME
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CompletionStep = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-8 py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
        className="w-24 h-24 mx-auto bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center"
      >
        <motion.svg
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-12 h-12 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </motion.svg>
      </motion.div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Registration Complete! 🎉
        </h2>
        <p className="text-xl text-gray-600 mb-2">
          Welcome to CAP_mis
        </p>
        <p className="text-gray-500">
          Your account has been successfully created. We've sent a verification email to your inbox.
        </p>
      </div>

      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps:</h3>
        <ul className="space-y-3 text-left">
          <li className="flex items-center text-gray-700">
            <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mr-3 text-sm font-semibold">1</span>
            Verify your email address
          </li>
          <li className="flex items-center text-gray-700">
            <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mr-3 text-sm font-semibold">2</span>
            Complete your school profile
          </li>
          <li className="flex items-center text-gray-700">
            <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mr-3 text-sm font-semibold">3</span>
            Add students and staff
          </li>
          <li className="flex items-center text-gray-700">
            <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mr-3 text-sm font-semibold">4</span>
            Generate ID cards
          </li>
        </ul>
      </div>

      <p className="text-gray-500">
        Redirecting to dashboard in {countdown} seconds...
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/dashboard')}
        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
      >
        Go to Dashboard Now
      </motion.button>
    </motion.div>
  );
};

export default CompletionStep;