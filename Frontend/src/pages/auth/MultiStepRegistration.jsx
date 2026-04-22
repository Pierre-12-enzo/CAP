// pages/auth/MultiStepRegistration.jsx - EMERALD THEME WITH PRIMEICONS
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import StepIndicator from '../../components/auth/StepIndicator';
import PersonalInfoStep from '../../components/auth/steps/PersonalInfoStep';
import SchoolInfoStep from '../../components/auth/steps/SchoolInfoStep';
import PlanSelectionStep from '../../components/auth/steps/PlanSelectionStep';
import PaymentStep from '../../components/auth/steps/PaymentStep';
import CompletionStep from '../../components/auth/steps/CompletionStep';

const MultiStepRegistration = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(true);
    const [error, setError] = useState('');
    const [registrationData, setRegistrationData] = useState({
        email: '',
        progressId: null,
        personal: null,
        school: null,
        plan: null
    });

    useEffect(() => {
        checkForSavedProgress();
    }, []);

    const checkForSavedProgress = async () => {
        setLoadingProgress(true);

        try {
            const urlEmail = searchParams.get('email');
            const savedEmail = localStorage.getItem('registration_email');

            const emailToCheck = urlEmail || savedEmail;

            if (!emailToCheck) {
                setLoadingProgress(false);
                return;
            }

            const response = await authAPI.getRegistrationProgress(emailToCheck);

            if (response.success && response.progress) {
                const progress = response.progress;

                setRegistrationData({
                    email: progress.email,
                    progressId: progress._id,
                    personal: progress.data?.personal || null,
                    school: progress.data?.school || null,
                    plan: progress.data?.plan || null
                });

                setCurrentStep(progress.step || 1);

                setError({
                    type: 'info',
                    message: `Welcome back! Continuing from step ${progress.step || 1}...`
                });

                setTimeout(() => setError(''), 5000);
            } else {
                localStorage.removeItem('registration_email');
                localStorage.removeItem('registration_step');
            }
        } catch (err) {
            console.log('No saved progress found');
            localStorage.removeItem('registration_email');
            localStorage.removeItem('registration_step');
        } finally {
            setLoadingProgress(false);
        }
    };

    const saveProgress = async (step, data) => {
        if (!registrationData.email) return;

        try {
            await authAPI.saveRegistrationProgress(registrationData.email, step, data);
            localStorage.setItem('registration_step', step.toString());
        } catch (err) {
            console.error('Failed to save progress:', err);
        }
    };

    const handleStepComplete = async (stepData) => {
        setLoading(true);
        setError('');

        try {
            let response;

            // Using block scoping to fix ESLint error
            if (currentStep === 1) {
                response = await authAPI.savePersonalInfo({
                    email: stepData.email,
                    firstName: stepData.firstName,
                    lastName: stepData.lastName,
                    phoneNumber: stepData.phoneNumber,
                    password: stepData.password
                });

                if (response.success) {
                    setRegistrationData(prev => ({
                        ...prev,
                        email: stepData.email,
                        progressId: response.progressId,
                        personal: {
                            firstName: stepData.firstName,
                            lastName: stepData.lastName,
                            phoneNumber: stepData.phoneNumber
                        }
                    }));

                    localStorage.setItem('registration_email', stepData.email);
                    localStorage.setItem('registration_step', '2');
                    await saveProgress(2, { personal: stepData });
                    setCurrentStep(2);
                }
            } else if (currentStep === 2) {
                const formData = new FormData();
                formData.append('email', registrationData.email);

                for (const [key, value] of stepData.entries()) {
                    formData.append(key, value);
                }

                response = await authAPI.saveSchoolInfo(formData);

                if (response.success) {
                    const schoolData = {
                        name: stepData.get('schoolName'),
                        type: stepData.get('schoolType'),
                        email: stepData.get('schoolEmail'),
                        phone: stepData.get('schoolPhone'),
                        province: stepData.get('province'),
                        district: stepData.get('district'),
                        sector: stepData.get('sector'),
                        country: stepData.get('country')
                    };

                    setRegistrationData(prev => ({ ...prev, school: schoolData }));
                    localStorage.setItem('registration_step', '3');
                    await saveProgress(3, { school: schoolData });
                    setCurrentStep(3);
                }
            } else if (currentStep === 3) {
                response = await authAPI.selectPlan({
                    email: registrationData.email,
                    planId: stepData.planId,
                    billingCycle: stepData.billingCycle
                });

                if (response.success) {
                    setRegistrationData(prev => ({
                        ...prev,
                        plan: {
                            planId: stepData.planId,
                            billingCycle: stepData.billingCycle,
                            planType: stepData.planType
                        }
                    }));

                    if (stepData.planType === 'trial' || response.requiresPayment === false) {
                        const completeResponse = await authAPI.completeRegistration({
                            email: registrationData.email
                        });

                        if (completeResponse.success) {
                            localStorage.setItem('capmis_token', completeResponse.token);
                            localStorage.removeItem('registration_email');
                            localStorage.removeItem('registration_step');
                            navigate(completeResponse.redirectTo || '/dashboard');
                            return;
                        }
                    } else {
                        localStorage.setItem('registration_step', '4');
                        await saveProgress(4, { plan: stepData });
                        setCurrentStep(4);
                    }
                }
            } else if (currentStep === 4) {
                response = await authAPI.processPayment({
                    email: registrationData.email,
                    ...stepData
                });

                if (response.success) {
                    localStorage.setItem('registration_step', '5');
                    await saveProgress(5, { payment: stepData });
                    setCurrentStep(5);
                }
            }
        } catch (err) {
            console.error('Step error:', err);
            setError(err.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleManualResume = () => {
        const email = localStorage.getItem('registration_email');
        if (email) {
            checkForSavedProgress();
        } else {
            setError('No saved registration found');
        }
    };

    const handleStartFresh = () => {
        localStorage.removeItem('registration_email');
        localStorage.removeItem('registration_step');
        setRegistrationData({
            email: '',
            progressId: null,
            personal: null,
            school: null,
            plan: null
        });
        setCurrentStep(1);
        setError('');
    };

    if (loadingProgress) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
                    <p className="text-emerald-700 font-semibold">Checking for saved progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Form Section */}
            <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-16 xl:px-20 overflow-y-auto max-h-screen">
                <div className="mx-auto w-full max-w-lg">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-3 shadow-lg transform hover:rotate-12 transition-transform duration-300">
                                <i className="pi pi-id-card text-white text-lg"></i>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-green-800 bg-clip-text text-transparent">
                                    CAP_mis
                                </h1>
                                <p className="text-xs text-emerald-600 font-medium">Card Attendance & Permission MIS</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Create your account</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Join CAP_mis and start managing your school efficiently
                        </p>
                    </div>

                    {/* Resume Controls */}
                    {localStorage.getItem('registration_email') && currentStep === 1 && (
                        <div className="flex space-x-2 mb-4">
                            <button
                                onClick={handleManualResume}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-700 text-xs font-medium transition-colors flex items-center"
                            >
                                <i className="pi pi-refresh mr-1 text-xs"></i>
                                Resume
                            </button>
                            <button
                                onClick={handleStartFresh}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-xs font-medium transition-colors flex items-center"
                            >
                                <i className="pi pi-times mr-1 text-xs"></i>
                                Start Fresh
                            </button>
                        </div>
                    )}

                    {/* Resume Banner */}
                    {registrationData.email && currentStep > 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl"
                        >
                            <p className="text-emerald-700 text-xs flex items-center">
                                <i className="pi pi-sync mr-2 text-xs"></i>
                                Resuming for <strong className="mx-1">{registrationData.email}</strong>
                            </p>
                        </motion.div>
                    )}

                    {/* Step indicator */}
                    <StepIndicator
                        steps={[
                            { number: 1, title: 'Personal', icon: 'pi pi-user' },
                            { number: 2, title: 'School', icon: 'pi pi-building' },
                            { number: 3, title: 'Plan', icon: 'pi pi-star' },
                            { number: 4, title: 'Payment', icon: 'pi pi-credit-card' },
                            { number: 5, title: 'Complete', icon: 'pi pi-check-circle' }
                        ]}
                        currentStep={currentStep}
                        className="mb-6"
                    />

                    {/* Error/Info message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mb-4 p-3 rounded-xl border text-sm ${error.type === 'info'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-red-50 border-red-200 text-red-800'
                                    }`}
                            >
                                <span className="flex items-center">
                                    <i className={`pi ${error.type === 'info' ? 'pi-info-circle' : 'pi-exclamation-circle'} mr-2`}></i>
                                    {typeof error === 'string' ? error : error.message}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentStep === 1 && (
                                <PersonalInfoStep
                                    onSubmit={handleStepComplete}
                                    initialData={registrationData.personal}
                                    loading={loading}
                                />
                            )}
                            {currentStep === 2 && (
                                <SchoolInfoStep
                                    onSubmit={handleStepComplete}
                                    initialData={registrationData.school}
                                    loading={loading}
                                />
                            )}
                            {currentStep === 3 && (
                                <PlanSelectionStep
                                    onSubmit={handleStepComplete}
                                    initialData={registrationData.plan}
                                    loading={loading}
                                />
                            )}
                            {currentStep === 4 && (
                                <PaymentStep
                                    onSubmit={handleStepComplete}
                                    plan={registrationData.plan}
                                    loading={loading}
                                />
                            )}
                            {currentStep === 5 && (
                                <CompletionStep />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Login link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                            >
                                Sign in
                            </button>
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Animated Features Section */}
            <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0">
                    {/* Floating Elements */}
                    <div className="absolute top-20 left-10 w-2 h-2 bg-emerald-400 rounded-full opacity-60 animate-float"></div>
                    <div className="absolute top-40 right-20 w-3 h-3 bg-green-500 rounded-full opacity-40 animate-float-fast"></div>
                    <div className="absolute bottom-32 left-20 w-4 h-4 bg-emerald-300 rounded-full opacity-50 animate-float-slow"></div>
                    <div className="absolute bottom-20 right-10 w-2 h-2 bg-teal-400 rounded-full opacity-60 animate-float"></div>
                    <div className="absolute top-60 left-1/2 w-3 h-3 bg-green-400 rounded-full opacity-40 animate-float-fast"></div>

                    {/* Glowing Orbs */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-green-200/30 rounded-full blur-3xl animate-pulse-gentle"></div>
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-green-200/20 to-emerald-200/20 rounded-full blur-3xl animate-pulse-gentle"></div>

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-5 animated-grid"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex items-center justify-center p-12">
                    <div className="text-center max-w-lg">
                        {/* Animated Card Stack */}
                        <motion.div
                            className="mb-8"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="relative mx-auto w-40 h-48">
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-2xl"
                                    animate={{ rotate: [0, 3, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <div className="w-full h-full flex items-center justify-center">
                                        <i className="pi pi-id-card text-white text-5xl"></i>
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl shadow-xl -z-10"
                                    animate={{ rotate: [-2, -5, -2], y: [0, 5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                />
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl shadow-lg -z-20"
                                    animate={{ rotate: [5, 8, 5], y: [0, 8, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                />
                            </div>
                        </motion.div>

                        <motion.h3
                            className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-green-800 bg-clip-text text-transparent mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            Smart Card Management
                        </motion.h3>

                        <motion.p
                            className="text-gray-600 text-lg leading-relaxed mb-8"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            Generate, track, and manage student ID cards with our automation system.
                        </motion.p>

                        {/* Feature Cards */}
                        <motion.div
                            className="grid grid-cols-1 gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <FeatureCard
                                icon="pi pi-bolt"
                                title="Batch Processing"
                                description="Generate 500+ cards in minutes"
                                color="from-amber-500 to-orange-500"
                            />
                            <FeatureCard
                                icon="pi pi-palette"
                                title="Smart Templates"
                                description="Drag & drop visual designer"
                                color="from-emerald-500 to-green-500"
                            />
                            <FeatureCard
                                icon="pi pi-chart-line"
                                title="Real-time Analytics"
                                description="Track usage and performance"
                                color="from-blue-500 to-cyan-500"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, description, color }) => (
    <motion.div
        whileHover={{ scale: 1.02, x: 5 }}
        className="flex items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-200/50 shadow-lg hover:shadow-xl transition-all"
    >
        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mr-4 shadow-md`}>
            <i className={`${icon} text-white text-lg`}></i>
        </div>
        <div className="text-left">
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    </motion.div>
);

export default MultiStepRegistration;