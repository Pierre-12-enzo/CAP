// components/auth/steps/PlanSelectionStep.jsx - EMERALD THEME WITH PRIMEICONS
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../../services/api';

const PlanSelectionStep = ({ onSubmit, initialData, loading }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(initialData?.planId || null);
  const [billingCycle, setBillingCycle] = useState(initialData?.billingCycle || 'monthly');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');

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

  if (loadingPlans) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Choose Your Plan</h2>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-56 bg-gray-100 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Choose Your Plan</h2>
        <p className="text-sm text-gray-600">Select the plan that best fits your school's needs</p>
      </div>

      {/* Billing toggle */}
      {plans.some(p => p.type === 'paid') && (
        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white text-emerald-700 shadow' : 'text-gray-600'
                }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center ${billingCycle === 'yearly' ? 'bg-white text-emerald-700 shadow' : 'text-gray-600'
                }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const isSelected = selectedPlan === plan._id;
          const isTrial = plan.type === 'trial';

          return (
            <motion.div
              key={plan._id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(plan._id)}
              className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all ${isSelected
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-emerald-200'
                }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}

              {isTrial && (
                <div className="absolute -top-2 right-2">
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    FREE TRIAL
                  </span>
                </div>
              )}

              <div className="mb-3">
                <i className={`text-2xl ${isTrial ? 'pi pi-gift text-green-600' : plan.code === 'BASIC' ? 'pi pi-rocket text-blue-600' : 'pi pi-crown text-amber-600'}`}></i>
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-1">{plan.name}</h3>

              <div className="mb-3">
                {price === 0 ? (
                  <span className="text-xl font-bold text-gray-900">Free</span>
                ) : (
                  <>
                    <span className="text-xl font-bold text-gray-900">{formatPrice(price)}</span>
                    <span className="text-gray-500 text-xs ml-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </>
                )}
                {isTrial && <p className="text-xs text-emerald-600 mt-0.5">{plan.trialDays}-day trial</p>}
              </div>

              <ul className="space-y-1.5 mb-4">
                {plan.features?.slice(0, 4).map((feature, index) => (
                  <li key={index} className="flex items-start text-xs">
                    <i className={`pi ${feature.included ? 'pi-check-circle text-green-500' : 'pi-circle text-gray-300'} mr-1.5 text-xs mt-0.5`}></i>
                    <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>{feature.name}</span>
                  </li>
                ))}
              </ul>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <i className="pi pi-check text-white text-xs"></i>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center"
          >
            <i className="pi pi-exclamation-circle mr-2"></i>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

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
          disabled={loading || !selectedPlan}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <i className="pi pi-spinner pi-spin mr-2"></i>
              Processing...
            </>
          ) : (
            <>
              Continue
              <i className="pi pi-arrow-right ml-2"></i>
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

export default PlanSelectionStep;