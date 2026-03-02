import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineMail,
    HiOutlineLockClosed,
    HiOutlineUser,
    HiOutlineEye,
    HiOutlineEyeOff,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';

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
/*  Input component with floating label                                */
/* ------------------------------------------------------------------ */
function FloatingInput({ icon: Icon, label, type = 'text', value, onChange, id }) {
    const [focused, setFocused] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const isPassword = type === 'password';
    const active = focused || value.length > 0;

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
                className="peer w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-12 text-sm text-surface-50 placeholder-transparent outline-none transition-all duration-300 focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20"
                placeholder={label}
                autoComplete={isPassword ? 'current-password' : 'off'}
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
/*  Login / Register page                                              */
/* ------------------------------------------------------------------ */
export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, register, verify2fa, isLoading, error, clearError } = useAuthStore();

    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [localError, setLocalError] = useState('');

    // 2FA states
    const [show2FA, setShow2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [code2fa, setCode2fa] = useState('');

    const toggleMode = () => {
        setMode((m) => (m === 'login' ? 'register' : 'login'));
        clearError();
        setLocalError('');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShow2FA(false);
        setTempToken('');
        setCode2fa('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (mode === 'register') {
            if (password !== confirmPassword) {
                setLocalError(t('login.err_pass_mismatch'));
                return;
            }
            if (password.length < 6) {
                setLocalError(t('login.err_pass_length'));
                return;
            }
            const res = await register(name, email, password);
            if (res?.success) navigate('/', { replace: true });
        } else {
            const res = await login(email, password, rememberMe);
            if (res?.requires2fa) {
                setTempToken(res.tempToken);
                setShow2FA(true);
            } else if (res?.success) {
                navigate('/', { replace: true });
            }
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (code2fa.length < 5) {
            setLocalError(t('login.err_invalid_code'));
            return;
        }

        const res = await verify2fa(tempToken, code2fa, rememberMe);
        if (res?.success) {
            navigate('/', { replace: true });
        }
    };

    const displayError = localError || error;

    /* Framer Motion variants */
    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.96 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
    };

    const formVariants = {
        enter: { opacity: 0, x: mode === 'register' ? 40 : -40 },
        center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
        exit: { opacity: 0, x: mode === 'register' ? -40 : 40, transition: { duration: 0.25 } },
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
                {/* Logo / Brand */}
                <div className="mb-8 text-center">
                    <motion.img
                        src="/favicon.png"
                        alt="Velo Icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        className="mx-auto mb-4 h-14 w-14 object-contain drop-shadow-md"
                    />
                    <h1 className="text-2xl font-bold text-gradient">Velo</h1>
                    <p className="mt-1 text-sm text-surface-200/60">
                        {mode === 'login' ? t('login.welcome_back') : t('login.create_account')}
                    </p>
                </div>

                {/* Tab toggle */}
                {!show2FA && (
                    <div className="mb-6 flex rounded-xl bg-white/5 p-1">
                        {['login', 'register'].map((m) => (
                            <button
                                key={m}
                                onClick={() => { if (m !== mode) toggleMode(); }}
                                className={`relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === m ? 'text-white' : 'text-surface-200/50 hover:text-surface-200/80'
                                    }`}
                            >
                                {mode === m && (
                                    <motion.div
                                        layoutId="tab-bg"
                                        className="absolute inset-0 rounded-lg gradient-brand opacity-90"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{m === 'login' ? t('login.tab_login') : t('login.tab_register')}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Error message */}
                <AnimatePresence>
                    {displayError && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                        >
                            {displayError}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                {!show2FA ? (
                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={mode}
                                variants={formVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="space-y-4"
                            >
                                {mode === 'register' && (
                                    <FloatingInput
                                        id="name"
                                        icon={HiOutlineUser}
                                        label={t('login.name_label')}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                )}

                                <FloatingInput
                                    id="email"
                                    icon={HiOutlineMail}
                                    label={t('login.email_label')}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />

                                <FloatingInput
                                    id="password"
                                    icon={HiOutlineLockClosed}
                                    label={t('login.password_label')}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                {mode === 'register' && (
                                    <FloatingInput
                                        id="confirmPassword"
                                        icon={HiOutlineLockClosed}
                                        label={t('login.confirm_password_label')}
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Remember me — only on login mode */}
                        {mode === 'login' && (
                            <div className="mt-4 flex items-center">
                                <label className="flex cursor-pointer items-center gap-3 group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="h-5 w-5 rounded-md border border-white/10 bg-white/5 transition-all duration-300 peer-checked:border-brand-500 peer-checked:bg-brand-500/20 group-hover:border-brand-400" />
                                        <svg
                                            className="absolute h-3.5 w-3.5 scale-0 text-brand-400 transition-transform duration-300 peer-checked:scale-100"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-surface-200/60 group-hover:text-surface-100 transition-colors">
                                        {t('login.remember_me')}
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mt-6 w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-shadow hover:shadow-brand-600/40 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12" cy="12" r="10"
                                        stroke="currentColor" strokeWidth="4" fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                            ) : mode === 'login' ? (
                                t('login.btn_login')
                            ) : (
                                t('login.btn_register')
                            )}
                        </motion.button>
                    </form>
                ) : (
                    <motion.form
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                        onSubmit={handleVerify2FA}
                    >
                        <div className="mb-4 text-center rounded-xl bg-brand-500/10 border border-brand-500/20 p-4">
                            <p className="text-sm text-brand-300">
                                {t('login.2fa_notice')}
                            </p>
                        </div>

                        <FloatingInput
                            id="code2fa"
                            icon={HiOutlineLockClosed}
                            label={t('login.2fa_code_label')}
                            type="text"
                            value={code2fa}
                            onChange={(e) => setCode2fa(e.target.value)}
                        />

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mt-6 w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-shadow hover:shadow-brand-600/40 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : t('login.2fa_verify_btn')}
                        </motion.button>

                        <p className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setShow2FA(false);
                                    setTempToken('');
                                    clearError();
                                    setLocalError('');
                                }}
                                className="text-sm text-surface-200/50 hover:text-brand-300 transition-colors"
                            >
                                {t('login.cancel')}
                            </button>
                        </p>
                    </motion.form>
                )}

                {/* Forgot password link — only on login mode */}
                {!show2FA && mode === 'login' && (
                    <p className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-sm text-surface-200/50 hover:text-brand-300 transition-colors"
                        >
                            {t('login.forgot_password_link')}
                        </button>
                    </p>
                )}

                {/* Footer link */}
                {!show2FA && (
                    <p className="mt-4 text-center text-sm text-surface-200/50">
                        {mode === 'login' ? t('login.no_account') : t('login.has_account')}{' '}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
                        >
                            {mode === 'login' ? t('login.btn_register') : t('login.btn_login')}
                        </button>
                    </p>
                )}
            </motion.div>
        </div>
    );
}
