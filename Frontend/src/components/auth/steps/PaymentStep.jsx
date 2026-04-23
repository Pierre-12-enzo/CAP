// components/auth/steps/PaymentStep.jsx - FUTURISTIC REDESIGN
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PaymentStep = ({ onSubmit, plan, loading }) => {
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [paymentDetails, setPaymentDetails] = useState({
    momoNumber: '',
    momoProvider: 'mtn',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: '',
    bankReference: ''
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);

  const paymentMethods = [
    {
      id: 'momo',
      name: 'Mobile Money',
      icon: '📱',
      color: 'from-yellow-400 to-orange-500',
      providers: ['MTN', 'Orange', 'Moov']
    },
    {
      id: 'card',
      name: 'Credit Card',
      icon: '💳',
      color: 'from-blue-400 to-cyan-500',
      providers: ['Visa', 'Mastercard']
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: '🏦',
      color: 'from-purple-400 to-pink-500',
      providers: ['Ecobank', 'Société Générale', 'BICEC']
    }
  ];

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (paymentMethod === 'momo') {
      if (!paymentDetails.momoNumber) {
        newErrors.momoNumber = 'Mobile money number is required';
      } else if (!/^[0-9]{9,12}$/.test(paymentDetails.momoNumber)) {
        newErrors.momoNumber = 'Invalid phone number';
      }
    }

    if (paymentMethod === 'card') {
      if (!paymentDetails.cardNumber) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^[0-9]{16}$/.test(paymentDetails.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Invalid card number';
      }
      if (!paymentDetails.cardExpiry) {
        newErrors.cardExpiry = 'Expiry date is required';
      } else if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(paymentDetails.cardExpiry)) {
        newErrors.cardExpiry = 'Invalid format (MM/YY)';
      }
      if (!paymentDetails.cardCvv) {
        newErrors.cardCvv = 'CVV is required';
      } else if (!/^[0-9]{3,4}$/.test(paymentDetails.cardCvv)) {
        newErrors.cardCvv = 'Invalid CVV';
      }
      if (!paymentDetails.cardName) {
        newErrors.cardName = 'Name on card is required';
      }
    }

    if (paymentMethod === 'bank') {
      if (!paymentDetails.bankReference) {
        newErrors.bankReference = 'Bank reference is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setProcessing(true);

    setTimeout(() => {
      onSubmit({
        method: paymentMethod,
        ...paymentDetails,
        transactionId: `TXN-${Date.now()}`
      });
      setProcessing(false);
    }, 2000);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const getCardType = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5')) return 'mastercard';
    return 'generic';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="relative mb-6">
        <div className="absolute -left-4 top-0 w-1 h-12 bg-gradient-to-b from-emerald-400 to-green-500 rounded-full"></div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Payment Details
        </h2>
        <p className="text-sm text-gray-500 mt-1">Complete your registration securely</p>
      </div>

      {/* Order Summary - Glass Card */}
      <motion.div
        className="relative p-6 rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 animate-gradient-x"></div>

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm">🛒</span>
            </span>
            Order Summary
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Plan</span>
              <span className="font-semibold text-gray-900">{plan?.planName || 'Selected Plan'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Billing Cycle</span>
              <span className="font-semibold text-gray-900 capitalize">{plan?.billingCycle || 'Monthly'}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <motion.span
                className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {plan?.price ? `${plan.price.toLocaleString()} XAF` : ''}
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Methods - Animated Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Payment Method
        </label>
        <div className="grid grid-cols-3 gap-3">
          {paymentMethods.map((method, index) => (
            <motion.button
              key={method.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMethodChange(method.id)}
              className={`relative p-4 rounded-xl transition-all duration-300 overflow-hidden ${paymentMethod === method.id
                  ? `bg-gradient-to-br ${method.color} text-white shadow-xl`
                  : 'bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-emerald-200'
                }`}
            >
              {/* Animated Background for Selected */}
              {paymentMethod === method.id && (
                <motion.div
                  layoutId="selectedPayment"
                  className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className="relative z-10">
                <span className="text-2xl mb-2 block">{method.icon}</span>
                <div className={`text-sm font-semibold ${paymentMethod === method.id ? 'text-white' : 'text-gray-700'
                  }`}>
                  {method.name}
                </div>
              </div>

              {paymentMethod === method.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 z-10"
                >
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Payment Forms */}
      <AnimatePresence mode="wait">
        {paymentMethod === 'momo' && (
          <motion.div
            key="momo"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {['MTN', 'Orange', 'Moov'].map((provider) => (
                  <motion.button
                    key={provider}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPaymentDetails({ ...paymentDetails, momoProvider: provider.toLowerCase() })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${paymentDetails.momoProvider === provider.toLowerCase()
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
                      }`}
                  >
                    {provider}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  value={paymentDetails.momoNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, momoNumber: e.target.value })}
                  className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.momoNumber ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                    }`}
                  placeholder="6XXXXXXXX"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📱</div>
              </div>
              {errors.momoNumber && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-xs text-red-500 flex items-center"
                >
                  <span className="mr-1">⚠️</span> {errors.momoNumber}
                </motion.p>
              )}
            </div>

            <motion.div
              className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-emerald-700 flex items-center">
                <span className="mr-2">💡</span>
                You'll receive a payment prompt on your phone. Enter your PIN to complete the transaction.
              </p>
            </motion.div>
          </motion.div>
        )}

        {paymentMethod === 'card' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Virtual Card Preview */}
            <motion.div
              className="relative h-52 rounded-2xl overflow-hidden"
              animate={cardFocused ? { scale: 1.02 } : { scale: 1 }}
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
              }}
            >
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-white/80 text-sm font-medium">Credit Card</span>
                  <span className="text-2xl">
                    {getCardType(paymentDetails.cardNumber) === 'visa' && '💳'}
                    {getCardType(paymentDetails.cardNumber) === 'mastercard' && '💳'}
                  </span>
                </div>

                <div>
                  <div className="text-2xl text-white font-mono tracking-wider mb-4">
                    {paymentDetails.cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-white/60 text-xs mb-1">Card Holder</div>
                      <div className="text-white font-medium">
                        {paymentDetails.cardName || 'YOUR NAME'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs mb-1">Expires</div>
                      <div className="text-white font-medium">
                        {paymentDetails.cardExpiry || 'MM/YY'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={paymentDetails.cardNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: formatCardNumber(e.target.value) })}
                  onFocus={() => setCardFocused(true)}
                  onBlur={() => setCardFocused(false)}
                  maxLength="19"
                  className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.cardNumber ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                    }`}
                  placeholder="1234 5678 9012 3456"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">💳</div>
              </div>
              {errors.cardNumber && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-xs text-red-500"
                >
                  {errors.cardNumber}
                </motion.p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="text"
                  value={paymentDetails.cardExpiry}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardExpiry: formatExpiry(e.target.value) })}
                  placeholder="MM/YY"
                  maxLength="5"
                  className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.cardExpiry ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                    }`}
                />
                {errors.cardExpiry && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-xs text-red-500"
                  >
                    {errors.cardExpiry}
                  </motion.p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                <input
                  type="password"
                  value={paymentDetails.cardCvv}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardCvv: e.target.value })}
                  maxLength="4"
                  className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.cardCvv ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                    }`}
                  placeholder="123"
                />
                {errors.cardCvv && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-xs text-red-500"
                  >
                    {errors.cardCvv}
                  </motion.p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
              <input
                type="text"
                value={paymentDetails.cardName}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value.toUpperCase() })}
                className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.cardName ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                  }`}
                placeholder="JOHN DOE"
              />
              {errors.cardName && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-xs text-red-500"
                >
                  {errors.cardName}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}

        {paymentMethod === 'bank' && (
          <motion.div
            key="bank"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <motion.div
              className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🏦</span>
                </span>
                Bank Transfer Details
              </h4>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Bank</span>
                  <span className="font-semibold text-gray-900">Ecobank Cameroon</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Account Name</span>
                  <span className="font-semibold text-gray-900">CAP MIS</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Account Number</span>
                  <span className="font-semibold text-gray-900 font-mono">12345678901</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-bold text-emerald-600">{plan?.price?.toLocaleString()} XAF</span>
                </div>
              </div>
            </motion.div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
              <input
                type="text"
                value={paymentDetails.bankReference}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, bankReference: e.target.value })}
                className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:outline-none transition-all duration-300 ${errors.bankReference ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-400'
                  }`}
                placeholder="Enter bank reference number"
              />
              {errors.bankReference && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-xs text-red-500"
                >
                  {errors.bankReference}
                </motion.p>
              )}
            </div>

            <motion.div
              className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-amber-700 flex items-center">
                <span className="mr-2">⏰</span>
                Bank transfers may take 1-3 business days to process. Your account will be activated once payment is confirmed.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Payment Badge */}
      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
        <span>🔒</span>
        <span>Secured by 256-bit SSL Encryption</span>
      </div>

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
          disabled={loading || processing}
          className="relative px-8 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10 flex items-center">
            {processing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Processing Payment...
              </>
            ) : (
              <>
                <span className="mr-2">🔒</span>
                Complete Payment
              </>
            )}
          </span>
        </motion.button>
      </div>
    </form>
  );
};

export default PaymentStep;