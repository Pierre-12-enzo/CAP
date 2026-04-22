// components/auth/steps/PaymentStep.jsx - EMERALD THEME WITH PRIMEICONS
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

  const paymentMethods = [
    { id: 'momo', name: 'Mobile Money', icon: 'pi pi-mobile', providers: ['MTN', 'Orange', 'Moov'] },
    { id: 'card', name: 'Credit/Debit Card', icon: 'pi pi-credit-card', providers: ['Visa', 'Mastercard'] },
    { id: 'bank', name: 'Bank Transfer', icon: 'pi pi-building', providers: ['Ecobank', 'Société Générale', 'BICEC'] }
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
      }
      if (!paymentDetails.cardCvv) {
        newErrors.cardCvv = 'CVV is required';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Details</h2>
        <p className="text-sm text-gray-600">Choose your payment method to complete registration</p>
      </div>

      {/* Order summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
          <i className="pi pi-shopping-cart mr-2 text-emerald-600"></i>
          Order Summary
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Plan: {plan?.planName || 'Selected Plan'}</span>
            <span className="font-medium">{plan?.price ? `${plan.price.toLocaleString()} XAF` : ''}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Billing cycle</span>
            <span className="capitalize">{plan?.billingCycle || 'Monthly'}</span>
          </div>
          <div className="border-t border-emerald-200 my-2 pt-2">
            <div className="flex justify-between text-gray-900 font-bold">
              <span>Total</span>
              <span className="text-emerald-700">{plan?.price ? `${plan.price.toLocaleString()} XAF` : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Payment Method
        </label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((method) => (
            <motion.button
              key={method.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleMethodChange(method.id)}
              className={`p-3 rounded-xl border-2 transition-all ${paymentMethod === method.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-emerald-200'
                }`}
            >
              <i className={`${method.icon} text-xl mb-1 ${paymentMethod === method.id ? 'text-emerald-600' : 'text-gray-500'}`}></i>
              <div className={`text-xs font-medium ${paymentMethod === method.id ? 'text-emerald-700' : 'text-gray-600'}`}>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <select
                value={paymentDetails.momoProvider}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, momoProvider: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="mtn">MTN Mobile Money</option>
                <option value="orange">Orange Money</option>
                <option value="moov">Moov Money</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={paymentDetails.momoNumber}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, momoNumber: e.target.value })}
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.momoNumber
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                placeholder="6XXXXXXXX"
              />
              {errors.momoNumber && <p className="mt-1 text-xs text-red-600">{errors.momoNumber}</p>}
            </div>

            <p className="text-xs text-gray-500 flex items-center">
              <i className="pi pi-info-circle mr-1 text-emerald-500"></i>
              You'll receive a payment request on your phone
            </p>
          </motion.div>
        )}

        {paymentMethod === 'card' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={paymentDetails.cardNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: formatCardNumber(e.target.value) })}
                  maxLength="19"
                  className={`w-full px-4 py-2.5 pl-10 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.cardNumber
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  placeholder="1234 5678 9012 3456"
                />
                <i className="pi pi-credit-card absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
              {errors.cardNumber && <p className="mt-1 text-xs text-red-600">{errors.cardNumber}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
                <input
                  type="text"
                  value={paymentDetails.cardExpiry}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardExpiry: e.target.value })}
                  placeholder="MM/YY"
                  maxLength="5"
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 ${errors.cardExpiry ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                <input
                  type="password"
                  value={paymentDetails.cardCvv}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cardCvv: e.target.value })}
                  maxLength="4"
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 ${errors.cardCvv ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
              <input
                type="text"
                value={paymentDetails.cardName}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 ${errors.cardName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                  }`}
                placeholder="JOHN DOE"
              />
            </div>
          </motion.div>
        )}

        {paymentMethod === 'bank' && (
          <motion.div
            key="bank"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <i className="pi pi-building mr-2 text-emerald-600"></i>
                Bank Transfer Details
              </h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Bank:</span> Ecobank Cameroon</p>
                <p><span className="font-medium">Account Name:</span> CAP MIS</p>
                <p><span className="font-medium">Account Number:</span> 12345678901</p>
                <p><span className="font-medium">Amount:</span> {plan?.price?.toLocaleString()} XAF</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
              <input
                type="text"
                value={paymentDetails.bankReference}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, bankReference: e.target.value })}
                className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 ${errors.bankReference ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                  }`}
                placeholder="Enter bank reference number"
              />
              {errors.bankReference && <p className="mt-1 text-xs text-red-600">{errors.bankReference}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
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
          disabled={loading || processing}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {processing ? (
            <>
              <i className="pi pi-spinner pi-spin mr-2"></i>
              Processing...
            </>
          ) : (
            <>
              <i className="pi pi-lock mr-2"></i>
              Complete Payment
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

export default PaymentStep;