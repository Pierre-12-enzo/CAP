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
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
        className="w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center"
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

      {/* Success message */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Registration Complete! 🎉
        </h2>
        <p className="text-xl text-gray-300 mb-2">
          Welcome to CAP_mis
        </p>
        <p className="text-gray-400">
          Your account has been successfully created. We've sent a verification email to your inbox.
        </p>
      </div>

      {/* Next steps */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Next Steps:</h3>
        <ul className="space-y-3 text-left">
          <li className="flex items-center text-gray-300">
            <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 mr-3">1</span>
            Verify your email address
          </li>
          <li className="flex items-center text-gray-300">
            <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 mr-3">2</span>
            Complete your school profile
          </li>
          <li className="flex items-center text-gray-300">
            <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 mr-3">3</span>
            Add students and staff
          </li>
          <li className="flex items-center text-gray-300">
            <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 mr-3">4</span>
            Generate ID cards
          </li>
        </ul>
      </div>

      {/* Redirect countdown */}
      <p className="text-gray-400">
        Redirecting to dashboard in {countdown} seconds...
      </p>

      {/* Manual redirect button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/dashboard')}
        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
      >
        Go to Dashboard Now
      </motion.button>

      {/* Confetti animation (optional) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 1,
              x: Math.random() * window.innerWidth,
              y: -20,
              rotate: 0
            }}
            animate={{
              y: window.innerHeight + 100,
              rotate: 360,
              opacity: 0
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-sm"
            style={{
              left: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default CompletionStep;
