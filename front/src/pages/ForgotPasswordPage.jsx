import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineMail,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineArrowLeft,
    HiOutlineKey,
    HiOutlineCheckCircle,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

/* ------------------------------------------------------------------ */
/*  Floating Orbs — decorative background                             */
/* ------------------------------------------------------------------ */
function FloatingOrbs() {
    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-brand-600/20 blur-[120px] animate-float" />
            <div
                className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-accent-500/15 blur-[140px] animate-float"
                style={{ animationDelay: '2s' }}
            />
            <div
                className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] animate-float"
                style={{ animationDelay: '4s' }}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Input component with icon                                          */
/* ------------------------------------------------------------------ */
function InputField({ icon: Icon, label, type = 'text', value, onChange, id, autoFocus, maxLength }) {
    const [focused, setFocused] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const isPassword = type === 'password';
    const active = focused || (value && value.length > 0);

    return (
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200/40 group-focus-within:text-brand-400 transition-colors">
                <Icon size={18} />
            </div>

            <input
                id={id}
                type={isPassword && showPw ? 'text' : type}
                value={value}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus={autoFocus}
                maxLength={maxLength}
                className="peer w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-12 text-sm text-surface-50 placeholder-transparent outline-none transition-all duration-300 focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20"
                placeholder={label}
                autoComplete={isPassword ? 'new-password' : 'off'}
            />

            {/* Floating label */}
            <label
                htmlFor={id}
                className={`pointer-events-none absolute left-11 transition-all duration-300 ${active
                    ? '-top-2.5 text-xs font-medium text-brand-400 bg-surface-950 px-1'
                    : 'top-1/2 -translate-y-1/2 text-sm text-surface-200/50'
                    }`}
            >
                {label}
            </label>

            {/* Password toggle */}
            {isPassword && (
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-200/40 hover:text-brand-400 transition-colors"
                >
                    {showPw ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Code Input — styled digit boxes                                    */
/* ------------------------------------------------------------------ */
function CodeInput({ value, onChange }) {
    const handleChange = (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(v);
    };

    const digits = value.padEnd(6, ' ').split('');

    return (
        <div className="space-y-4">
            {/* Hidden actual input */}
            <input
                id="code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={value}
                onChange={handleChange}
                autoFocus
                className="sr-only"
            />

            {/* Visual boxes */}
            <label htmlFor="code-input" className="flex justify-center gap-2 cursor-text">
                {digits.map((d, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex h-14 w-11 items-center justify-center rounded-xl border text-xl font-bold transition-all duration-200 ${d.trim()
                            ? 'border-brand-500 bg-brand-500/10 text-brand-300 shadow-lg shadow-brand-500/10'
                            : i === value.length
                                ? 'border-brand-400/50 bg-white/5 text-surface-200/30 animate-pulse'
                                : 'border-white/10 bg-white/5 text-surface-200/30'
                            }`}
                    >
                        {d.trim() || '·'}
                    </motion.div>
                ))}
            </label>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Forgot Password Page — 3 steps                                     */
/* ------------------------------------------------------------------ */
export default function ForgotPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Step 1: Email  |  Step 2: Code  |  Step 3: New password
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form data
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    /* ---------- Step 1: Send code ---------- */
    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        if (!email) { setError(t('forgotPassword.err_no_email')); return; }

        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSuccess(t('forgotPassword.success_sent'));
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao enviar código.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ---------- Step 2: Verify code ---------- */
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        if (code.length !== 6) { setError(t('forgotPassword.err_invalid_code')); return; }

        setIsLoading(true);
        try {
            const res = await api.post('/auth/verify-code', { email, code });
            setResetToken(res.data.reset_token);
            setSuccess(t('forgotPassword.success_verified'));
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || 'Código inválido ou expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ---------- Step 3: Reset password ---------- */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) { setError(t('forgotPassword.err_pass_length')); return; }
        if (newPassword !== confirmPassword) { setError(t('forgotPassword.err_pass_mismatch')); return; }

        setIsLoading(true);
        try {
            await api.post('/auth/reset-password', {
                reset_token: resetToken,
                new_password: newPassword,
            });
            setSuccess(t('forgotPassword.success_reset'));
            setTimeout(() => navigate('/login', { replace: true }), 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao redefinir senha.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ---------- Stepper ---------- */
    const steps = [
        { num: 1, label: t('forgotPassword.step1') },
        { num: 2, label: t('forgotPassword.step2') },
        { num: 3, label: t('forgotPassword.step3') },
    ];

    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.96 },
        visible: {
            opacity: 1, y: 0, scale: 1,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
    };

    const formVariants = {
        enter: { opacity: 0, x: 40 },
        center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
        exit: { opacity: 0, x: -40, transition: { duration: 0.25 } },
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center px-4 py-10 gradient-bg">
            <FloatingOrbs />

            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-brand-950/40 sm:p-10"
            >
                {/* Header */}
                <div className="mb-6 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-brand-600/30"
                    >
                        <HiSparkles className="text-white" size={28} />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gradient">{t('forgotPassword.title')}</h1>
                    <p className="mt-1 text-sm text-surface-200/60">
                        {step === 1 && t('forgotPassword.subtitle_step1')}
                        {step === 2 && t('forgotPassword.subtitle_step2')}
                        {step === 3 && t('forgotPassword.subtitle_step3')}
                    </p>
                </div>

                {/* Stepper */}
                <div className="mb-6 flex items-center justify-center gap-2">
                    {steps.map((s, i) => (
                        <div key={s.num} className="flex items-center gap-2">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${step > s.num
                                    ? 'gradient-brand text-white shadow-lg shadow-brand-600/20'
                                    : step === s.num
                                        ? 'border-2 border-brand-400 text-brand-300 bg-brand-500/10'
                                        : 'border border-white/10 text-surface-200/30 bg-white/5'
                                    }`}
                            >
                                {step > s.num ? '✓' : s.num}
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={`h-0.5 w-8 rounded transition-all duration-300 ${step > s.num ? 'gradient-brand' : 'bg-white/10'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Error / Success messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                        >
                            {error}
                        </motion.div>
                    )}
                    {success && !error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2"
                        >
                            <HiOutlineCheckCircle size={16} />
                            {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Forms */}
                <AnimatePresence mode="wait">
                    {/* Step 1 — Email */}
                    {step === 1 && (
                        <motion.form
                            key="step-email"
                            variants={formVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            onSubmit={handleSendCode}
                            className="space-y-4"
                        >
                            <InputField
                                id="forgot-email"
                                icon={HiOutlineMail}
                                label={t('forgotPassword.email_label')}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <>
                                        <HiOutlineMail size={16} />
                                        {t('forgotPassword.btn_send_code')}
                                    </>
                                )}
                            </motion.button>
                        </motion.form>
                    )}

                    {/* Step 2 — Code */}
                    {step === 2 && (
                        <motion.form
                            key="step-code"
                            variants={formVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            onSubmit={handleVerifyCode}
                            className="space-y-4"
                        >
                            <CodeInput value={code} onChange={setCode} />

                            <p className="text-center text-xs text-surface-200/40">
                                {t('forgotPassword.notice_sent_to')} <span className="text-brand-300 font-medium">{email}</span>
                            </p>

                            <motion.button
                                type="submit"
                                disabled={isLoading || code.length !== 6}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <>
                                        <HiOutlineKey size={16} />
                                        {t('forgotPassword.btn_verify_code')}
                                    </>
                                )}
                            </motion.button>

                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(''); setSuccess(''); setCode(''); }}
                                className="w-full text-sm text-surface-200/50 hover:text-brand-300 transition-colors"
                            >
                                {t('forgotPassword.btn_resend')}
                            </button>
                        </motion.form>
                    )}

                    {/* Step 3 — New password */}
                    {step === 3 && (
                        <motion.form
                            key="step-password"
                            variants={formVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            onSubmit={handleResetPassword}
                            className="space-y-4"
                        >
                            <InputField
                                id="new-password"
                                icon={HiOutlineLockClosed}
                                label={t('forgotPassword.new_password_label')}
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                            />

                            <InputField
                                id="confirm-new-password"
                                icon={HiOutlineLockClosed}
                                label={t('forgotPassword.confirm_new_password_label')}
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            <motion.button
                                type="submit"
                                disabled={isLoading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <>
                                        <HiOutlineCheckCircle size={16} />
                                        {t('forgotPassword.btn_reset')}
                                    </>
                                )}
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Back to login */}
                <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-surface-200/50 hover:text-brand-300 transition-colors"
                >
                    <HiOutlineArrowLeft size={14} />
                    {t('forgotPassword.back_to_login')}
                </button>
            </motion.div>
        </div>
    );
}
