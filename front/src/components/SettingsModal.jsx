import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMoon, HiSun, HiOutlineGlobeAlt, HiX, HiOutlineClock } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

export default function SettingsModal({ isOpen, onClose }) {
    const { t, i18n } = useTranslation();
    const { user, setUser } = useAuthStore();
    const [theme, setTheme] = useState(() => localStorage.getItem('velo_theme') || 'light');
    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Initialize switch with current user's setting
    const [multipleWorkplaces, setMultipleWorkplaces] = useState(user?.multiple_workplaces || false);
    useEffect(() => {
        if (user) {
            setMultipleWorkplaces(user.multiple_workplaces);
        }
    }, [user]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        document.documentElement.classList.toggle('theme-light', theme === 'light');
        localStorage.setItem('velo_theme', theme);
    }, [theme, mounted]);

    const handleToggleMultipleWorkplaces = async () => {
        const newValue = !multipleWorkplaces;
        setIsSaving(true);
        // Optimistic update
        setMultipleWorkplaces(newValue);
        
        try {
            const { data } = await api.put('/profile/', {
                multiple_workplaces: newValue
            });
            setUser(data);
            toast.success("Configuração salva com sucesso!");
        } catch (error) {
            // Revert on error
            setMultipleWorkplaces(!newValue);
            if (error.response?.status === 409) {
                toast.error(error.response.data.detail || "Erro ao alterar configuração.");
            } else {
                toast.error("Erro ao alterar configuração. Tente novamente.");
            }
        } finally {
            setIsSaving(false);
        }
    };


    if (!isOpen || !mounted) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-surface-950/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-surface-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-surface-200/50 hover:text-white transition-colors"
                    >
                        <HiX size={20} />
                    </button>

                    <h3 className="text-lg font-bold text-white mb-6">{t('settings.title', 'Configurações')}</h3>

                    <div className="space-y-6">
                        {/* Theme Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 border border-brand-500/20">
                                    {theme === 'dark' ? <HiMoon size={18} className="text-brand-400" /> : <HiSun size={18} className="text-brand-400" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-surface-50">{t('settings.theme', 'Tema')}</p>
                                    <p className="text-xs text-surface-200/50">{theme === 'dark' ? t('settings.dark', 'Escuro') : t('settings.light', 'Claro')}</p>
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-300 ${theme === 'light'
                                    ? 'bg-brand-500/30 border-brand-500/40'
                                    : 'bg-white/10 border-white/10'
                                    }`}
                            >
                                <motion.span
                                    layout
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full shadow-sm ${theme === 'light'
                                        ? 'translate-x-6 bg-brand-400'
                                        : 'translate-x-1 bg-surface-200/50'
                                        }`}
                                >
                                    {theme === 'light' ? <HiSun size={12} className="text-white" /> : <HiMoon size={12} className="text-surface-800" />}
                                </motion.span>
                            </motion.button>
                        </div>

                        {/* Language Selector */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 border border-brand-500/20">
                                    <HiOutlineGlobeAlt size={18} className="text-brand-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-surface-50">{t('settings.language', 'Idioma')}</p>
                                    <p className="text-xs text-surface-200/50">
                                        {t('languages.' + i18n.language.split('-')[0])}
                                    </p>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={i18n.language.split('-')[0]}
                                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                                    className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2 pl-4 pr-10 text-sm font-medium text-surface-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 hover:bg-white/10 transition-colors"
                                >
                                    <option value="pt" className="bg-surface-900 text-surface-50">PT-BR</option>
                                    <option value="en" className="bg-surface-900 text-surface-50">English</option>
                                    <option value="es" className="bg-surface-900 text-surface-50">Español</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-surface-200/50">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                        
                        {/* Multiple Workplaces Toggle */}
                        {user && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 border border-brand-500/20">
                                        <HiOutlineGlobeAlt size={18} className="text-brand-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-surface-50">Múltiplos locais</p>
                                        <p className="text-xs text-surface-200/50">Permite gerenciar mais de um local de trabalho</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={multipleWorkplaces}
                                    onClick={handleToggleMultipleWorkplaces}
                                    disabled={isSaving}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 ${multipleWorkplaces ? 'bg-brand-500' : 'bg-surface-200/20'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${multipleWorkplaces ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        )}


                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

