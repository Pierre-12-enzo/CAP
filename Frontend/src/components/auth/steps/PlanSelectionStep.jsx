// components/auth/steps/PlanSelectionStep.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const PlanSelectionStep = ({ onSubmit, initialData, loading }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(initialData?.planId || null);
  const [billingCycle, setBillingCycle] = useState(initialData?.billingCycle || 'monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');

  // Fetch plans on mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await authAPI.getPlans();
      console.log('📥 Plans received:', response.plans);
      setPlans(response.plans || []);
      
      // Auto-select trial if available and no plan selected
      if (!selectedPlan) {
        const trialPlan = response.plans?.find(p => p.type === 'trial');
        if (trialPlan) {
          console.log('🎯 Auto-selecting trial plan:', trialPlan.name);
          setSelectedPlan(trialPlan._id);
        }
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      setError('Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  // Handle plan selection
  const handlePlanSelect = (planId) => {
    console.log('🎯 Plan selected:', planId);
    setSelectedPlan(planId);
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    const selectedPlanData = plans.find(p => p._id === selectedPlan);
    console.log('📤 Submitting plan:', selectedPlanData);
    
    onSubmit({
      planId: selectedPlan,
      billingCycle,
      planType: selectedPlanData?.type,
      isTrial: selectedPlanData?.type === 'trial'
    });
  };

  // Format price
  const formatPrice = (price, cycle) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Loading skeleton
  if (loadingPlans) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-64 bg-white/5 rounded-2xl border border-white/10"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-gray-400">Select the plan that best fits your school's needs</p>
      </div>

      {/* Billing cycle toggle - hide for trial */}
      {plans.some(p => p.type === 'paid') && (
        <div className="flex justify-center">
          <div className="bg-white/5 p-1 rounded-xl inline-flex">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const isSelected = selectedPlan === plan._id;
          const isTrial = plan.type === 'trial';

          return (
            <motion.div
              key={plan._id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlanSelect(plan._id)}
              className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              {/* Popular badge */}
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Trial badge */}
              {isTrial && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    FREE TRIAL
                  </span>
                </div>
              )}

              {/* Plan icon */}
              <div className="text-4xl mb-4">
                {isTrial ? '🎁' : plan.code === 'BASIC' ? '🚀' : '💎'}
              </div>

              {/* Plan name */}
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              
              {/* Price */}
              <div className="mb-4">
                {price === 0 ? (
                  <span className="text-3xl font-bold text-white">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-white">
                      {formatPrice(price, billingCycle)}
                    </span>
                    <span className="text-gray-400 ml-1">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </>
                )}
                {isTrial && (
                  <p className="text-sm text-cyan-400 mt-1">
                    {plan.trialDays}-day free trial
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features?.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className={`mr-2 ${feature.included ? 'text-green-400' : 'text-gray-500'}`}>
                      {feature.included ? '✓' : '○'}
                    </span>
                    <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex justify-between pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !selectedPlan}
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Continue'}
        </motion.button>
      </div>
    </form>
  );
};

export default PlanSelectionStep;
