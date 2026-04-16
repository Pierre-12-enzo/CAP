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

  // Payment methods
  const paymentMethods = [
    { id: 'momo', name: 'Mobile Money', icon: '📱', providers: ['MTN', 'Orange', 'Moov'] },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', providers: ['Visa', 'Mastercard'] },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', providers: ['Ecobank', 'Société Générale', 'BICEC'] }
  ];

  // Handle payment method change
  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    setErrors({});
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (paymentMethod === 'momo') {
      if (!paymentDetails.momoNumber) {
        newErrors.momoNumber = 'Mobile money number is required';
      } else if (!/^[0-9]{9,12}$/.test(paymentDetails.momoNumber)) {
        newErrors.momoNumber = 'Invalid phone number';
      }
      if (!paymentDetails.momoProvider) {
        newErrors.momoProvider = 'Select provider';
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

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      onSubmit({
        method: paymentMethod,
        ...paymentDetails,
        transactionId: `TXN-${Date.now()}`
      });
      setProcessing(false);
    }, 2000);
  };

  // Format card number
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Details</h2>
        <p className="text-gray-400">Choose your payment method to complete registration</p>
      </div>

      {/* Order summary */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>Plan: {plan?.planName || 'Selected Plan'}</span>
            <span>{plan?.price ? `${plan.price.toLocaleString()} XAF` : ''}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Billing cycle</span>
            <span className="capitalize">{plan?.billingCycle || 'Monthly'}</span>
          </div>
          <div className="border-t border-white/10 my-2 pt-2">
            <div className="flex justify-between text-white font-bold">
              <span>Total</span>
              <span className="text-cyan-400">{plan?.price ? `${plan.price.toLocaleString()} XAF` : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Select Payment Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {paymentMethods.map((method) => (
            <motion.button
              key={method.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleMethodChange(method.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === method.id
                  ? 'border-cyan-400 bg-cyan-400/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <div className="text-2xl mb-2">{method.icon}</div>
              <div className={`text-sm font-medium ${
                paymentMethod === method.id ? 'text-cyan-400' : 'text-gray-300'
              }`}>
                {method.name}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Payment form based on method */}
      <AnimatePresence mode="wait">
        {paymentMethod === 'momo' && (
          <motion.div
            key="momo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mobile Money Provider
              </label>
              <select
                value={paymentDetails.momoProvider}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, momoProvider: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
              >
                <option value="mtn" className="bg-gray-800">MTN Mobile Money</option>
                <option value="orange" className="bg-gray-800">Orange Money</option>
                <option value="moov" className="bg-gray-800">Moov Money</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={paymentDetails.momoNumber}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, momoNumber: e.target.value })}
                className={`w-full px-4 py-3 bg-white/5 border ${
                  errors.momoNumber ? 'border-red-500' : 'border-white/20'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                placeholder="6XXXXXXXX"
              />
              {errors.momoNumber && (
                <p className="mt-1 text-sm text-red-400">{errors.momoNumber}</p>
              )}
            </div>

            <p className="text-sm text-gray-400">
              You'll receive a payment request on your phone. Confirm to complete.
            </p>
          </motion.div>
        )}

        {paymentMethod === 'card' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Card Number
              </label>
              <input
                type="text"
                value={paymentDetails.cardNumber}
                onChange={(e) => setPaymentDetails({ 
                  ...paymentDetails, 
                  cardNumber: formatCardNumber(e.target.value)
                })}
                maxLength="19"
                className={`w-full px-4 py-3 bg-white/5 border ${
                  errors.cardNumber ? 'border-red-500' : 'border-white/20'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                placeholder="1234 5678 9012 3456"
              />
              {errors.cardNumber && (
                <p className="mt-1 text-sm text-red-400">{errors.cardNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={paymentDetails.cardExpiry}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardExpiry: e.target.value })}
                  placeholder="MM/YY"
                  maxLength="5"
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.cardExpiry ? 'border-red-500' : 'border-white/20'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                />
                {errors.cardExpiry && (
                  <p className="mt-1 text-sm text-red-400">{errors.cardExpiry}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CVV
                </label>
                <input
                  type="password"
                  value={paymentDetails.cardCvv}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardCvv: e.target.value })}
                  maxLength="4"
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.cardCvv ? 'border-red-500' : 'border-white/20'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                  placeholder="123"
                />
                {errors.cardCvv && (
                  <p className="mt-1 text-sm text-red-400">{errors.cardCvv}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name on Card
              </label>
              <input
                type="text"
                value={paymentDetails.cardName}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}
                className={`w-full px-4 py-3 bg-white/5 border ${
                  errors.cardName ? 'border-red-500' : 'border-white/20'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                placeholder="JOHN DOE"
              />
              {errors.cardName && (
                <p className="mt-1 text-sm text-red-400">{errors.cardName}</p>
              )}
            </div>
          </motion.div>
        )}

        {paymentMethod === 'bank' && (
          <motion.div
            key="bank"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-white font-semibold mb-2">Bank Transfer Details</h4>
              <p className="text-sm text-gray-400 mb-1">Bank: Ecobank Cameroon</p>
              <p className="text-sm text-gray-400 mb-1">Account Name: CAP MIS</p>
              <p className="text-sm text-gray-400 mb-1">Account Number: 12345678901</p>
              <p className="text-sm text-gray-400">Amount: {plan?.price?.toLocaleString()} XAF</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction Reference
              </label>
              <input
                type="text"
                value={paymentDetails.bankReference}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, bankReference: e.target.value })}
                className={`w-full px-4 py-3 bg-white/5 border ${
                  errors.bankReference ? 'border-red-500' : 'border-white/20'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors`}
                placeholder="Enter bank reference number"
              />
              {errors.bankReference && (
                <p className="mt-1 text-sm text-red-400">{errors.bankReference}</p>
              )}
            </div>

            <p className="text-sm text-gray-400">
              After making the transfer, enter the reference number above. We'll verify and activate your account within 24 hours.
            </p>
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
          disabled={loading || processing}
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
        >
          {processing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Complete Payment'
          )}
        </motion.button>
      </div>
    </form>
  );
};

export default PaymentStep;
