import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Add useSearchParams
import { authAPI } from '../../services/api';
import StepIndicator from '../../components/auth/StepIndicator';
import PersonalInfoStep from '../../components/auth/steps/PersonalInfoStep';
import SchoolInfoStep from '../../components/auth/steps/SchoolInfoStep';
import PlanSelectionStep from '../../components/auth/steps/PlanSelectionStep';
import PaymentStep from '../../components/auth/steps/PaymentStep';
import CompletionStep from '../../components/auth/steps/CompletionStep';

const MultiStepRegistration = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); // For email in URL
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(true); // New loading state
    const [error, setError] = useState('');
    const [registrationData, setRegistrationData] = useState({
        email: '',
        progressId: null,
        personal: null,
        school: null,
        plan: null
    });

    // Check for saved progress on mount
    useEffect(() => {
        checkForSavedProgress();
    }, []);

    const checkForSavedProgress = async () => {
        setLoadingProgress(true);

        try {
            // Check multiple sources for email:
            // 1. URL parameter (if coming from email link)
            // 2. localStorage (if previously saved)
            // 3. Nothing (new registration)

            const urlEmail = searchParams.get('email');
            const savedEmail = localStorage.getItem('registration_email');
            const savedStep = localStorage.getItem('registration_step');

            let emailToCheck = urlEmail || savedEmail;

            if (!emailToCheck) {
                console.log('🆕 No saved progress found - starting fresh');
                setLoadingProgress(false);
                return;
            }

            console.log('🔍 Checking saved progress for:', emailToCheck);

            // Try to get progress from backend
            const response = await authAPI.getRegistrationProgress(emailToCheck);

            if (response.success && response.progress) {
                console.log('📦 Found saved progress:', response.progress);

                const progress = response.progress;

                // Restore data
                setRegistrationData({
                    email: progress.email,
                    progressId: progress._id,
                    personal: progress.data?.personal || null,
                    school: progress.data?.school || null,
                    plan: progress.data?.plan || null
                });

                // Restore step
                setCurrentStep(progress.step || 1);

                // Show resume message
                setError({
                    type: 'info',
                    message: `Welcome back! Continuing from step ${progress.step || 1}...`
                });

                // Clear after 5 seconds
                setTimeout(() => setError(''), 5000);
            } else {
                // No progress in backend, clear localStorage
                localStorage.removeItem('registration_email');
                localStorage.removeItem('registration_step');
            }

        } catch (error) {
            console.log('No saved progress found or error loading:', error);
            // Clear invalid localStorage
            localStorage.removeItem('registration_email');
            localStorage.removeItem('registration_step');
        } finally {
            setLoadingProgress(false);
        }
    };

    // Save progress after each step
    const saveProgress = async (step, data) => {
        if (!registrationData.email) return;

        try {
            await authAPI.saveRegistrationProgress(
                registrationData.email,
                step,
                data
            );

            // Also save to localStorage for quick access
            localStorage.setItem('registration_step', step.toString());

            console.log(`💾 Progress saved for step ${step}`);
        } catch (error) {
            console.error('Failed to save progress:', error);
            // Don't block the user, just log error
        }
    };

    const handleStepComplete = async (stepData) => {
        setLoading(true);
        setError('');

        try {
            let response;

            switch (currentStep) {
                case 1:
                    console.log('📤 Step 1 data:', stepData);

                    response = await authAPI.savePersonalInfo({
                        email: stepData.email,
                        firstName: stepData.firstName,
                        lastName: stepData.lastName,
                        phoneNumber: stepData.phoneNumber,
                        password: stepData.password
                    });

                    if (response.success) {
                        // Save to state
                        setRegistrationData(prev => ({
                            ...prev,
                            email: stepData.email,
                            progressId: response.progressId,
                            personal: {
                                firstName: stepData.firstName,
                                lastName: stepData.lastName,
                                phoneNumber: stepData.phoneNumber
                                // Don't store password in state!
                            }
                        }));

                        // Save to localStorage
                        localStorage.setItem('registration_email', stepData.email);
                        localStorage.setItem('registration_step', '2');

                        // Auto-save progress
                        await saveProgress(2, {
                            personal: {
                                firstName: stepData.firstName,
                                lastName: stepData.lastName,
                                phoneNumber: stepData.phoneNumber
                            }
                        });

                        setCurrentStep(2);
                    }
                    break;

                case 2:
                    // School info - FormData
                    const formData = new FormData();
                    formData.append('email', registrationData.email);

                    // Append all school data
                    for (let [key, value] of stepData.entries()) {
                        formData.append(key, value);
                    }

                    response = await authAPI.saveSchoolInfo(formData);

                    if (response.success) {
                        // Extract school data from FormData for state
                        const schoolData = {
                            name: stepData.get('schoolName'),
                            type: stepData.get('schoolType'),
                            email: stepData.get('schoolEmail'),
                            phone: stepData.get('schoolPhone'),
                            address: {
                                street: stepData.get('address[street]'),
                                city: stepData.get('address[city]'),
                                state: stepData.get('address[state]'),
                                country: stepData.get('address[country]'),
                                postalCode: stepData.get('address[postalCode]')
                            }
                        };

                        setRegistrationData(prev => ({
                            ...prev,
                            school: schoolData
                        }));

                        localStorage.setItem('registration_step', '3');
                        await saveProgress(3, { school: schoolData });
                        setCurrentStep(3);
                    }
                    break;

                case 3:
                    console.log('📤 Step 3 - Plan data:', stepData);

                    response = await authAPI.selectPlan({
                        email: registrationData.email,
                        planId: stepData.planId,
                        billingCycle: stepData.billingCycle
                    });

                    console.log('📥 Step 3 response:', response);

                    if (response.success) {
                        // Save plan to state
                        setRegistrationData(prev => ({
                            ...prev,
                            plan: {
                                planId: stepData.planId,
                                billingCycle: stepData.billingCycle,
                                planType: stepData.planType
                            }
                        }));

                        // Check if it's a trial plan
                        if (stepData.planType === 'trial' || response.requiresPayment === false) {
                            console.log('🎯 Trial plan selected - completing registration...');

                            // For trial, directly complete registration
                            try {
                                const completeResponse = await authAPI.completeRegistration({
                                    email: registrationData.email
                                });

                                console.log('📥 Complete registration response:', completeResponse);

                                if (completeResponse.success) {
                                    // Save token and redirect
                                    localStorage.setItem('capmis_token', completeResponse.token);
                                    localStorage.removeItem('registration_email');
                                    localStorage.removeItem('registration_step');

                                    // Redirect to dashboard
                                    navigate(completeResponse.redirectTo || '/dashboard');
                                    return;
                                }
                            } catch (err) {
                                console.error('Trial completion error:', err);
                                setError(err.error || 'Failed to complete trial registration');
                                setLoading(false);
                                return;
                            }
                        } else {
                            // Paid plan - go to payment step
                            console.log('💰 Paid plan selected - going to payment step');
                            localStorage.setItem('registration_step', '4');
                            await saveProgress(4, { plan: stepData });
                            setCurrentStep(4);
                        }
                    }
                    break;

                case 4:
                    response = await authAPI.processPayment({
                        email: registrationData.email,
                        ...stepData
                    });

                    if (response.success) {
                        localStorage.setItem('registration_step', '5');
                        await saveProgress(5, { payment: stepData });
                        setCurrentStep(5);
                    }
                    break;

                default:
                    break;
            }

        } catch (err) {
            console.error('Step error:', err);
            setError(err.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Function to manually resume registration (for "Resume" button)
    const handleManualResume = () => {
        const email = localStorage.getItem('registration_email');
        if (email) {
            checkForSavedProgress();
        } else {
            setError('No saved registration found');
        }
    };

    // Function to clear saved progress (start fresh)
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
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white">Checking for saved progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            {/* Floating orbs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

            {/* Main card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-6xl bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
            >
                <div className="flex flex-col lg:flex-row">
                    {/* Left side - Form */}
                    <div className="w-full lg:w-3/5 p-8 lg:p-12">
                        {/* Logo and Resume Controls */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    CAP<span className="text-cyan-400">_mis</span>
                                </h1>
                                <p className="text-gray-300">Card Attendance & Permission MIS</p>
                            </div>

                            {/* Resume Controls */}
                            {localStorage.getItem('registration_email') && currentStep === 1 && (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleManualResume}
                                        className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 text-sm font-medium transition-colors"
                                    >
                                        ↻ Resume Registration
                                    </button>
                                    <button
                                        onClick={handleStartFresh}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 text-sm font-medium transition-colors"
                                    >
                                        ✕ Start Fresh
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Resume Banner */}
                        {registrationData.email && currentStep > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 bg-cyan-500/20 border border-cyan-500/50 rounded-lg"
                            >
                                <p className="text-cyan-400 text-sm">
                                    🔄 Resuming registration for <strong>{registrationData.email}</strong>
                                </p>
                            </motion.div>
                        )}

                        {/* Step indicator */}
                        <StepIndicator
                            steps={[
                                { number: 1, title: 'Personal Info', icon: '👤' },
                                { number: 2, title: 'School Details', icon: '🏫' },
                                { number: 3, title: 'Choose Plan', icon: '💎' },
                                { number: 4, title: 'Payment', icon: '💰' },
                                { number: 5, title: 'Complete', icon: '🎉' }
                            ]}
                            currentStep={currentStep}
                            className="mb-8"
                        />

                        {/* Error/Info message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`mb-6 p-4 rounded-lg ${error.type === 'info'
                                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                                        : 'bg-red-500/20 border border-red-500/50 text-red-200'
                                        }`}
                                >
                                    {typeof error === 'string' ? error : error.message}
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
                                transition={{ duration: 0.3 }}
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
                            transition={{ delay: 0.4 }}
                            className="mt-8 text-center"
                        >
                            <p className="text-gray-400">
                                Already have an account?{' '}
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                                >
                                    Sign in
                                </button>
                            </p>
                        </motion.div>
                    </div>

                    {/* Right side - Features */}
                    <div className="hidden lg:block w-2/5 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-12 border-l border-white/20">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="sticky top-12"
                        >
                            <h2 className="text-2xl font-bold text-white mb-6">
                                Smart Card Management
                            </h2>

                            <div className="space-y-6">
                                <FeatureCard
                                    icon="⚡"
                                    title="Batch Processing"
                                    description="Generate 500+ cards in minutes"
                                />
                                <FeatureCard
                                    icon="🎨"
                                    title="Smart Templates"
                                    description="Drag & drop visual designer"
                                />
                                <FeatureCard
                                    icon="📊"
                                    title="Real-time Analytics"
                                    description="Track usage and performance"
                                />
                            </div>

                            {/* Testimonial */}
                            <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-gray-300 italic">
                                    "CAP_mis transformed how we manage our school. The automation is incredible!"
                                </p>
                                <div className="mt-4 flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                                        JD
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-white font-semibold">John Doe</p>
                                        <p className="text-gray-400 text-sm">Principal, International School</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-start space-x-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 transition-all"
    >
        <div className="text-3xl">{icon}</div>
        <div>
            <h3 className="text-white font-semibold mb-1">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
        </div>
    </motion.div>
);

export default MultiStepRegistration;