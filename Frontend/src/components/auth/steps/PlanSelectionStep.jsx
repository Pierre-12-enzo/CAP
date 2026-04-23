// components/auth/steps/PlanSelectionStep.jsx - FUTURISTIC REDESIGN
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const PlanSelectionStep = ({ onSubmit, initialData, loading }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(initialData?.planId || null);
  const [billingCycle, setBillingCycle] = useState(initialData?.billingCycle || 'monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [hoveredPlan, setHoveredPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await authAPI.getPlans();
      setPlans(response.plans || []);

      if (!selectedPlan) {
        const trialPlan = response.plans?.find(p => p.type === 'trial');
        if (trialPlan) setSelectedPlan(trialPlan._id);
      }
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    const selectedPlanData = plans.find(p => p._id === selectedPlan);
    onSubmit({
      planId: selectedPlan,
      billingCycle,
      planType: selectedPlanData?.type,
      isTrial: selectedPlanData?.type === 'trial'
    });
  };

  const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const calculateSavings = (monthly, yearly) => {
    const monthlyTotal = monthly * 12;
    const savings = monthlyTotal - yearly;
    return Math.round((savings / monthlyTotal) * 100);
  };

  if (loadingPlans) {
    return (
      <div className="space-y-6">
        <div className="relative mb-6">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full"></div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Choose Your Plan
          </h2>
          <p className="text-sm text-gray-500 mt-1">Select the perfect plan for your school</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative mb-6">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full"></div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Choose Your Plan
        </h2>
        <p className="text-sm text-gray-500 mt-1">Select the perfect plan for your school's needs</p>
      </div>

      {/* Billing Toggle - Glass Morphism */}
      {plans.some(p => p.type === 'paid') && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200">
            {/* Animated Background Indicator */}
            <motion.div
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl shadow-lg"
              animate={{ x: billingCycle === 'monthly' ? 0 : '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            <div className="relative flex">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-8 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`relative z-10 px-8 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Yearly
                <motion.span
                  className="ml-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Save 20%
                </motion.span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plans Grid - 3D Card Effect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, index) => {
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const monthlyPrice = plan.price.monthly;
          const isSelected = selectedPlan === plan._id;
          const isTrial = plan.type === 'trial';
          const savings = !isTrial && billingCycle === 'yearly'
            ? calculateSavings(monthlyPrice, price)
            : 0;

          return (
            <motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onHoverStart={() => setHoveredPlan(plan._id)}
              onHoverEnd={() => setHoveredPlan(null)}
              onClick={() => setSelectedPlan(plan._id)}
              className={`relative cursor-pointer rounded-3xl p-6 transition-all duration-500 ${isSelected
                  ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-400 shadow-2xl'
                  : 'bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-emerald-200 shadow-lg hover:shadow-2xl'
                }`}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <div className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                      ⭐ MOST POPULAR
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Trial Badge */}
              {isTrial && (
                <div className="absolute -top-3 right-4 z-20">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg"
                  >
                    🎁 FREE TRIAL
                  </motion.div>
                </div>
              )}

              {/* Plan Icon */}
              <motion.div
                className="mb-4"
                animate={hoveredPlan === plan._id ? { rotate: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isTrial
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                    : plan.code === 'BASIC'
                      ? 'bg-gradient-to-br from-blue-400 to-cyan-500'
                      : 'bg-gradient-to-br from-purple-400 to-pink-500'
                  } shadow-lg`}>
                  <span className="text-2xl">
                    {isTrial ? '🎓' : plan.code === 'BASIC' ? '🚀' : '👑'}
                  </span>
                </div>
              </motion.div>

              {/* Plan Name */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>

              {/* Price */}
              <div className="mb-4">
                {price === 0 ? (
                  <div>
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                    <p className="text-xs text-emerald-600 mt-1">{plan.trialDays}-day trial</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">{formatPrice(price)}</span>
                      <span className="text-gray-500 text-sm ml-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-green-600 mt-1 flex items-center"
                      >
                        <span className="mr-1">💰</span> Save {savings}% with yearly billing
                      </motion.p>
                    )}
                    {billingCycle === 'monthly' && monthlyPrice > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        or {formatPrice(plan.price.yearly / 12)}/mo billed yearly
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-2 mb-6">
                {plan.features?.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    className="flex items-start text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5 ${feature.included
                        ? 'bg-green-400'
                        : 'bg-gray-300'
                      }`}>
                      {feature.included ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <span className={feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}>
                      {feature.name}
                    </span>
                  </motion.li>
                ))}
              </ul>

              {/* Selected Indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hover Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                animate={hoveredPlan === plan._id ? {
                  boxShadow: "0 0 30px rgba(16, 185, 129, 0.3)"
                } : {
                  boxShadow: "0 0 0px rgba(16, 185, 129, 0)"
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl text-red-700 text-sm flex items-center"
          >
            <span className="mr-2">⚠️</span>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <motion.button
          whileHover={{ scale: 1.02, x: -2 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-all flex items-center group"
        >
          <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !selectedPlan}
          className="relative px-8 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center">
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </motion.button>
      </div>
    </form>
  );
};

export default PlanSelectionStep;