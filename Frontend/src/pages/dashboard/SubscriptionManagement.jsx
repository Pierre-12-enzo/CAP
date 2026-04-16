// pages/dashboard/SubscriptionManagement.jsx
import React, { useState, useEffect } from 'react';
import { subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingHistory, setBillingHistory] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getCurrentSubscription();
      if (response.success) {
        setSubscription(response.subscription);
        setBillingHistory(response.billingHistory || []);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'trial': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-amber-600 bg-amber-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-semibold">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600 mt-2">Manage your plan and billing information</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Current Plan</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(subscription?.status)}`}>
              {subscription?.status?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-2">Plan</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{subscription?.plan?.name || 'Free Trial'}</p>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Price</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${subscription?.plan?.price?.monthly || 0}/mo
                    {subscription?.plan?.price?.yearly > 0 && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        or ${subscription?.plan?.price?.yearly}/year
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Billing Cycle</p>
                  <p className="font-semibold text-gray-900 capitalize">{subscription?.billingCycle || 'Monthly'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6">
              {subscription?.status === 'trial' && (
                <div>
                  <p className="text-sm text-emerald-700 mb-2">Trial Period</p>
                  <p className="text-4xl font-bold text-emerald-700 mb-2">
                    {getDaysRemaining(subscription?.trialEnd)} days
                  </p>
                  <p className="text-sm text-emerald-600">
                    Ends on {new Date(subscription?.trialEnd).toLocaleDateString()}
                  </p>
                  <button className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all">
                    Upgrade Now
                  </button>
                </div>
              )}

              {subscription?.status === 'active' && (
                <div>
                  <p className="text-sm text-emerald-700 mb-2">Next Billing</p>
                  <p className="text-4xl font-bold text-emerald-700 mb-2">
                    {new Date(subscription?.currentPeriodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-emerald-600">
                    Auto-renews on this date
                  </p>
                  <button className="mt-4 w-full bg-white text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-all">
                    Manage Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="border-t border-gray-200 p-8 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 mb-4">Plan Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <i className="pi pi-check-circle text-emerald-600"></i>
              <span className="text-gray-700">Up to {subscription?.plan?.limits?.maxStudents || 700} Students</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="pi pi-check-circle text-emerald-600"></i>
              <span className="text-gray-700">{subscription?.plan?.limits?.maxStaff || 20} Staff Members</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="pi pi-check-circle text-emerald-600"></i>
              <span className="text-gray-700">{subscription?.plan?.limits?.maxTemplates || 1} Templates</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="pi pi-check-circle text-emerald-600"></i>
              <span className="text-gray-700">{subscription?.plan?.limits?.storageMB || 1000}MB Storage</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="pi pi-check-circle text-emerald-600"></i>
              <span className="text-gray-700">Email Support</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="pi pi-check-circle text-emerald-600"></i>
              <span className="text-gray-700">ID Card Generation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Billing History</h2>
        
        {billingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billingHistory.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">${item.amount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="pi pi-receipt text-gray-400 text-2xl"></i>
            </div>
            <p className="text-gray-600">No billing history yet</p>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
            + Add New
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <i className="pi pi-credit-card text-white"></i>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Visa ending in 4242</p>
                <p className="text-sm text-gray-500">Expires 12/25</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              Default
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;