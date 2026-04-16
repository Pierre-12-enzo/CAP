// components/auth/StepIndicator.jsx
import React from 'react';
import { motion } from 'framer-motion';

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute top-5 left-0 w-full h-1 bg-white/10 rounded-full">
        {/* Animated progress */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
        />
      </div>

      {/* Step circles */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={step.number} className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isCompleted ? '#22d3ee' : isActive ? '#fff' : 'rgba(255,255,255,0.1)',
                  borderColor: isActive ? '#22d3ee' : 'rgba(255,255,255,0.2)'
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all ${
                  isActive ? 'text-gray-900' : 'text-white'
                }`}
                style={{
                  backgroundColor: isCompleted ? '#22d3ee' : isActive ? '#fff' : 'transparent'
                }}
              >
                {isCompleted ? (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  step.icon
                )}
              </motion.div>
              
              {/* Step title - visible on larger screens */}
              <motion.span
                animate={{ opacity: isActive ? 1 : 0.5 }}
                className="mt-2 text-xs font-medium text-white hidden sm:block"
              >
                {step.title}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;