import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentAPI, cardAPI, staffAPI, subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Overview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime] = useState(new Date());
  const [stats, setStats] = useState({
    students: { total: 0, newThisMonth: 0, active: 0 },
    cards: { generated: 0, pending: 0, printed: 0 },
    staff: { total: 0, active: 0, pending: 0 },
    subscription: {
      status: 'loading',
      plan: null,
      daysRemaining: 0,
      usage: {
        students: { used: 0, limit: 0 },
        staff: { used: 0, limit: 0 },
        cards: { used: 0, limit: 0 },
        storage: { used: '0MB', limit: '0MB' }
      }
    },
    recentActivity: []
  });

  useEffect(() => {
    console.log('📊 Overview mounted for school:', user?.schoolId);
    fetchDashboardData();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      console.log('📊 Fetching dashboard data for school:', user);

      // Fetch all data in parallel
      const [
        studentsRes,
        cardsRes,
        staffRes,
        subscriptionRes,
        usageRes
      ] = await Promise.allSettled([
        studentAPI.getStudents({ schoolId: user?.schoolId, limit: 1000 }),
        cardAPI.getCardHistory({ schoolId: user?.schoolId }),
        staffAPI.getStaff({ schoolId: user?.schoolId, limit: 1000 }),
        subscriptionAPI.getCurrentSubscription(),
        subscriptionAPI.getUsageStats()
      ]);

      // ===== DEBUG: Log raw responses =====
      console.log('📥 RAW API Responses:');
      console.log('Students response:', studentsRes);
      console.log('Cards response:', cardsRes);
      console.log('Staff response:', staffRes);
      console.log('Subscription response:', subscriptionRes);
      console.log('Usage response:', usageRes);

      // ===== STUDENTS DATA EXTRACTION =====
      let studentList = [];
      let totalStudents = 0;
      let newThisMonth = 0;

      if (studentsRes.status === 'fulfilled' && studentsRes.value) {
        const response = studentsRes.value;

        // Try different response structures
        if (response.data?.students) {
          studentList = response.data.students;
        } else if (response.students) {
          studentList = response.students;
        } else if (Array.isArray(response)) {
          studentList = response;
        } else if (response.data && Array.isArray(response.data)) {
          studentList = response.data;
        }

        totalStudents = studentList.length;
        console.log(`✅ Found ${totalStudents} students`);

        // Calculate new students this month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        newThisMonth = studentList.filter(s => {
          const createdAt = s.createdAt || s.created_at || s.addedAt;
          return createdAt && new Date(createdAt) >= firstDayOfMonth;
        }).length;
      }

      // ===== CARDS DATA EXTRACTION - FIXED =====
      let cardList = [];
      let totalCards = 0;
      let pendingCards = 0;
      let printedCards = 0;

      if (cardsRes.status === 'fulfilled' && cardsRes.value) {
        const response = cardsRes.value;

        console.log('🔍 CARDS API FULL RESPONSE:', JSON.stringify(response, null, 2));
        console.log('🔍 CARDS API STATUS:', cardsRes.value);

        // ✅ Your API returns statistics.totalCards
        if (response.statistics?.totalCards) {
          totalCards = response.statistics.totalCards;
          console.log('✅ Found totalCards in statistics:', totalCards);
        }
        // Fallback for other structures
        else if (response.totalCards) {
          totalCards = response.totalCards;
        } else if (response.data?.totalCards) {
          totalCards = response.data.totalCards;
        }

        // If there's a cards array (unlikely in your API)
        if (response.cards) {
          cardList = response.cards;
        } else if (response.data?.cards) {
          cardList = response.data.cards;
        }

        // Calculate pending/printed from cardList if available
        pendingCards = cardList.filter(c =>
          (c.status || '').toLowerCase() === 'pending'
        ).length;

        printedCards = cardList.filter(c =>
          (c.status || '').toLowerCase() === 'printed' ||
          (c.status || '').toLowerCase() === 'generated'
        ).length;



        // Add this right after the API call
        if (cardsRes.status === 'fulfilled') {
          console.log('🔍 CARDS API RAW VALUE:', cardsRes.value);
          console.log('🔍 CARDS API KEYS:', Object.keys(cardsRes.value));
          console.log('🔍 CARDS API statistics:', cardsRes.value.statistics);
          console.log('🔍 CARDS API totalCards:', cardsRes.value.statistics?.totalCards);
        }
        console.log(`📊 Cards stats: total=${totalCards}, pending=${pendingCards}, printed=${printedCards}`);
      }

      // ===== STAFF DATA EXTRACTION =====
      let staffList = [];
      let totalStaff = 0;
      let activeStaff = 0;
      let pendingStaff = 0;

      if (staffRes.status === 'fulfilled' && staffRes.value) {
        const response = staffRes.value;

        if (response.data?.staff) {
          staffList = response.data.staff;
        } else if (response.staff) {
          staffList = response.staff;
        } else if (Array.isArray(response)) {
          staffList = response;
        }

        totalStaff = staffList.length;
        activeStaff = staffList.filter(s => s.isActive === true).length;
        pendingStaff = staffList.filter(s => !s.isEmailVerified).length;

        console.log(`✅ Found ${totalStaff} staff members`);
      }

      // ===== SUBSCRIPTION DATA EXTRACTION =====
      let subscriptionData = null;
      let daysRemaining = 0;

      if (subscriptionRes.status === 'fulfilled' && subscriptionRes.value) {
        const response = subscriptionRes.value;

        if (response.data?.subscription) {
          subscriptionData = response.data.subscription;
        } else if (response.subscription) {
          subscriptionData = response.subscription;
        }

        if (subscriptionData?.currentPeriodEnd) {
          const end = new Date(subscriptionData.currentPeriodEnd);
          const now = new Date();
          const diff = end - now;
          daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }
      }

      // ===== USAGE DATA EXTRACTION =====
      let usageData = {};

      if (usageRes.status === 'fulfilled' && usageRes.value) {
        const response = usageRes.value;

        if (response.data?.usage) {
          usageData = response.data.usage;
        } else if (response.usage) {
          usageData = response.usage;
        }
      }

      // Generate recent activity
      const recentActivity = generateRecentActivity(
        studentList.slice(0, 3),
        cardList, // ✅ Now cardList is defined
        staffList.slice(0, 3)
      );

      // Update stats
      const newStats = {
        students: {
          total: totalStudents,
          newThisMonth,
          active: totalStudents
        },
        cards: {
          generated: totalCards,
          pending: pendingCards,
          printed: printedCards
        },
        staff: {
          total: totalStaff,
          active: activeStaff,
          pending: pendingStaff
        },
        subscription: {
          status: subscriptionData?.status || 'inactive',
          plan: subscriptionData?.plan || null,
          daysRemaining,
          usage: {
            students: {
              used: usageData.students?.used || totalStudents,
              limit: usageData.students?.limit || 'Unlimited'
            },
            staff: {
              used: usageData.staff?.used || totalStaff,
              limit: usageData.staff?.limit || 'Unlimited'
            },
            cards: {
              used: usageData.cards?.used || totalCards,
              limit: usageData.cards?.limit || 'Unlimited'
            },
            storage: {
              used: usageData.storage?.used || '0MB',
              limit: usageData.storage?.limit || '500MB'
            }
          }
        },
        recentActivity
      };

      console.log('📊 FINAL STATS:', newStats);
      setStats(newStats);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateRecentActivity = (recentStudents, recentCards, recentStaff) => {
    const activities = [];

    recentStudents.forEach(student => {
      if (student.name || student.firstName) {
        activities.push({
          type: 'student',
          action: 'New Student Added',
          description: `${student.firstName || student.name || ''} ${student.lastName || ''}`.trim(),
          time: formatTimeAgo(student.createdAt || student.created_at),
          icon: 'pi-user-plus',
          color: 'blue'
        });
      }
    });

    if (recentCards && recentCards.length > 0) {
      recentCards.slice(0, 2).forEach(card => {
        activities.push({
          type: 'card',
          action: 'Card Generated',
          description: card.studentName || 'ID Card',
          time: formatTimeAgo(card.createdAt || card.generatedAt),
          icon: 'pi-id-card',
          color: 'emerald'
        });
      });
    }

    recentStaff.forEach(member => {
      if (member.firstName || member.lastName) {
        activities.push({
          type: 'staff',
          action: 'Staff Added',
          description: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          time: formatTimeAgo(member.createdAt),
          icon: 'pi-user-plus',
          color: 'purple'
        });
      }
    });

    // Always add a system activity if we have no others
    if (activities.length === 0) {
      activities.push({
        type: 'system',
        action: 'System Ready',
        description: 'Dashboard initialized',
        time: 'Just now',
        icon: 'pi-check-circle',
        color: 'emerald'
      });
    }

    return activities.slice(0, 5);
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return 'Recently';
    }
  };

  const refreshData = () => {
    fetchDashboardData(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-emerald-600 bg-emerald-100';
      case 'trial': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-amber-600 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === 'Unlimited' || limit === 0) return 0;
    const usedNum = typeof used === 'string' ? parseInt(used) || 0 : used;
    const limitNum = typeof limit === 'string' ? parseInt(limit) || 100 : limit;
    return Math.min((usedNum / limitNum) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-semibold text-lg">Loading School Data...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching real-time analytics for your school</p>
        </div>
      </div>
    );
  }

  const subscription = stats.subscription;
  const isTrial = subscription.status === 'trial';
  const isExpiring = subscription.daysRemaining <= 7 && subscription.daysRemaining > 0;

  return (
    <div className="p-8 space-y-8">
      {/* Refresh indicator */}
      {refreshing && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-slide-down">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Refreshing...</span>
        </div>
      )}

      {/* Hero Welcome Section - School Specific */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-4xl font-bold">
                  {user?.schoolId?.name || 'Your School'}
                </h1>
                {subscription.plan && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                    {subscription.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-emerald-200 text-lg mb-6">
                ID Card Management System - Live School Dashboard
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span>Live Data Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="pi pi-clock text-emerald-300"></i>
                  <span>{time.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="pi pi-calendar text-emerald-300"></i>
                  <span>{time.toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => refreshData()}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition-colors"
                >
                  <i className="pi pi-refresh text-sm"></i>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 transform rotate-6">
                <i className="pi pi-building text-white text-4xl"></i>
              </div>
            </div>
          </div>

          {/* Subscription Alert */}
          {isTrial && (
            <div className="mt-6 bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <i className="pi pi-info-circle text-blue-300 text-xl"></i>
                <div>
                  <p className="font-semibold">Trial Period Active</p>
                  <p className="text-sm text-blue-200">
                    {subscription.daysRemaining} days remaining. Upgrade to keep all features.
                  </p>
                </div>
              </div>
              <Link
                to="/dashboard/subscription"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          )}

          {isExpiring && !isTrial && (
            <div className="mt-6 bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <i className="pi pi-exclamation-triangle text-amber-300 text-xl"></i>
                <div>
                  <p className="font-semibold">Subscription Expiring Soon</p>
                  <p className="text-sm text-amber-200">
                    {subscription.daysRemaining} days remaining. Renew to avoid interruption.
                  </p>
                </div>
              </div>
              <Link
                to="/dashboard/subscription"
                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Renew Now
              </Link>
            </div>
          )}
        </div>

        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* Key Metrics Grid - School Specific */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Students"
          value={stats.students.total}
          subtitle={`${stats.students.newThisMonth} new this month`}
          icon="pi-users"
          color="blue"
          trend={stats.students.newThisMonth > 0 ? 'up' : 'neutral'}
          usage={stats.subscription.usage.students}
        />
        <MetricCard
          title="ID Cards"
          value={stats.cards.generated}
          subtitle={`${stats.cards.pending} pending, ${stats.cards.printed} printed`}
          icon="pi-id-card"
          color="emerald"
          trend={stats.cards.generated > 0 ? 'up' : 'neutral'}
          usage={stats.subscription.usage.cards}
        />
        <MetricCard
          title="Staff Members"
          value={stats.staff.total}
          subtitle={`${stats.staff.active} active, ${stats.staff.pending} pending`}
          icon="pi-users"
          color="purple"
          trend={stats.staff.total > 0 ? 'up' : 'neutral'}
          usage={stats.subscription.usage.staff}
        />
        <MetricCard
          title="Storage Used"
          value={stats.subscription.usage.storage.used}
          subtitle={`Limit: ${stats.subscription.usage.storage.limit}`}
          icon="pi-database"
          color="amber"
          trend="neutral"
          usage={stats.subscription.usage.storage}
          isStorage
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Quick Actions & Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
              <i className="pi pi-bolt text-emerald-600 text-xl"></i>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard
                title="Generate ID Cards"
                description="Batch process student ID cards"
                icon="pi-qrcode"
                color="emerald"
                to="/dashboard/card-studio"
              />
              <ActionCard
                title="Manage Students"
                description="Add or edit student records"
                icon="pi-user-plus"
                color="blue"
                to="/dashboard/students"
              />
              <ActionCard
                title="Manage Staff"
                description="Add or manage staff members"
                icon="pi-users"
                color="purple"
                to="/dashboard/staff"
              />
              <ActionCard
                title="Subscription"
                description="View plan and billing"
                icon="pi-credit-card"
                color="amber"
                to="/dashboard/subscription"
              />
            </div>
          </div>

          {/* Usage Analytics */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Resource Usage</h3>
              <Link
                to="/dashboard/subscription"
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center space-x-1"
              >
                <span>View Details</span>
                <i className="pi pi-arrow-right text-xs"></i>
              </Link>
            </div>
            <div className="space-y-4">
              <UsageBar
                label="Students"
                used={stats.subscription.usage.students.used}
                limit={stats.subscription.usage.students.limit}
                color="blue"
              />
              <UsageBar
                label="Staff"
                used={stats.subscription.usage.staff.used}
                limit={stats.subscription.usage.staff.limit}
                color="purple"
              />
              <UsageBar
                label="ID Cards"
                used={stats.subscription.usage.cards.used}
                limit={stats.subscription.usage.cards.limit}
                color="emerald"
              />
              <UsageBar
                label="Storage"
                used={stats.subscription.usage.storage.used}
                limit={stats.subscription.usage.storage.limit}
                color="amber"
                isStorage
              />
            </div>
          </div>

          {/* Recent Students */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Students</h3>
              <Link
                to="/dashboard/students"
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center space-x-1"
              >
                <span>View All</span>
                <i className="pi pi-arrow-right text-xs"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recentActivity
                .filter(a => a.type === 'student')
                .map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="pi pi-user text-blue-600"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">Added {activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column - Activity & Status */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Live Activity</h3>
              <i className="pi pi-history text-emerald-600 text-xl"></i>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {stats.recentActivity.map((activity, index) => (
                <ActivityItem
                  key={index}
                  action={activity.action}
                  description={activity.description}
                  time={activity.time}
                  icon={activity.icon}
                  color={activity.color}
                />
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">System Status</h3>
            <div className="space-y-3">
              <StatusItem
                label="School Database"
                status={stats.students.total > 0 ? 'connected' : 'active'}
              />
              <StatusItem
                label="Card Service"
                status={stats.cards.generated > 0 ? 'operational' : 'ready'}
              />
              <StatusItem
                label="Authentication"
                status="authenticated"
              />
              <StatusItem
                label="Subscription"
                status={subscription.status}
              />
              <StatusItem
                label="Data Sync"
                status={stats.students.total > 0 ? 'synchronized' : 'pending'}
              />
            </div>
          </div>

          {/* Current Plan Info */}
          {subscription.plan && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl border border-emerald-200/50 p-6">
              <h3 className="text-lg font-bold text-emerald-900 mb-4">Current Plan</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">{subscription.plan.name}</span>
                  <span className="text-emerald-900 font-bold">
                    ${subscription.plan.price?.monthly || 0}/mo
                  </span>
                </div>
                <div className="border-t border-emerald-200/50 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-600">Renewal Date</span>
                    <span className="text-emerald-900 font-medium">
                      {new Date(subscription.plan.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  {subscription.daysRemaining > 0 && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-emerald-600">
                        {subscription.daysRemaining} days remaining
                      </span>
                    </div>
                  )}
                </div>
                <Link
                  to="/dashboard/subscription"
                  className="block text-center mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Subscription
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== Enhanced Sub-Components =====

const MetricCard = ({ title, value, subtitle, icon, color, trend, usage, isStorage }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600'
  };

  const trendIcons = {
    up: 'pi-arrow-up',
    down: 'pi-arrow-down',
    neutral: 'pi-minus'
  };

  const usagePercentage = usage ? getUsagePercentage(usage.used, usage.limit) : 0;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-emerald-200/30 p-6 group hover:shadow-2xl transition-all duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center shadow-lg`}>
          <i className={`pi ${icon} text-white text-lg`}></i>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
            <i className={`pi ${trendIcons[trend]} text-xs`}></i>
            <span>{subtitle}</span>
          </div>
        )}
      </div>
      <h4 className="text-gray-600 text-sm font-medium mb-2">{title}</h4>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {usage && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Usage</span>
            <span>{isStorage ? usage.used : `${usage.used} / ${usage.limit}`}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`bg-${color}-500 h-1.5 rounded-full transition-all duration-1000`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionCard = ({ title, description, icon, color, to }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500'
  };

  return (
    <Link
      to={to}
      className="w-full text-left p-4 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <i className={`pi ${icon} text-white text-lg`}></i>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
            {title}
          </h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
};

const UsageBar = ({ label, used, limit, color, isStorage }) => {
  const getPercentage = () => {
    if (limit === 'Unlimited' || limit === 0) return 0;
    const usedNum = typeof used === 'string' ? parseInt(used) || 0 : used;
    const limitNum = typeof limit === 'string' ? parseInt(limit) || 100 : limit;
    return Math.min((usedNum / limitNum) * 100, 100);
  };

  const percentage = getPercentage();

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">
          {isStorage ? used : `${used} / ${limit}`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${color}-500 h-2 rounded-full transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const ActivityItem = ({ action, description, time, icon, color }) => {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    amber: 'text-amber-600 bg-amber-100'
  };

  return (
    <div className="flex items-center space-x-4 p-3 rounded-xl bg-gray-50 hover:bg-white transition-colors duration-300">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
        <i className={`pi ${icon}`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{action}</p>
        <p className="text-xs text-gray-500">{description} • {time}</p>
      </div>
    </div>
  );
};

const StatusItem = ({ label, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
      case 'connected':
      case 'authenticated':
      case 'synchronized':
      case 'active':
        return 'text-emerald-600 bg-emerald-100';
      case 'ready':
      case 'pending':
        return 'text-amber-600 bg-amber-100';
      case 'error':
      case 'degraded':
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-800">{label}</span>
      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
        {status}
      </span>
    </div>
  );
};

// Helper function
const getUsagePercentage = (used, limit) => {
  if (limit === 'Unlimited' || limit === 0) return 0;
  const usedNum = typeof used === 'string' ? parseInt(used) || 0 : used;
  const limitNum = typeof limit === 'string' ? parseInt(limit) || 100 : limit;
  return Math.min((usedNum / limitNum) * 100, 100);
};

export default Overview;