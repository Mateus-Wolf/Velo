import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineUser,
    HiOutlineClipboardList,
    HiOutlineChartBar,
    HiOutlineLogout,
    HiOutlineChevronDown,
    HiOutlineCog,
} from 'react-icons/hi';
import useAuthStore from '../store/useAuthStore';
import SettingsModal from './SettingsModal';
import { useTranslation } from 'react-i18next';

export default function UserDropdown() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const ref = useRef(null);

    const firstName = user?.name?.split(' ')[0] || t('dropdown.user', 'Usuário');

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-200/70 hover:bg-white/10 hover:text-white transition-all"
            >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
                    <HiOutlineUser size={13} />
                </div>
                <span className="hidden sm:inline font-medium text-surface-50">{firstName}</span>
                <HiOutlineChevronDown
                    size={14}
                    className={`text-surface-200/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-black/40"
                    >
                        <div className="px-3 py-2.5 border-b border-white/5">
                            <p className="text-xs text-surface-200/40 truncate">{user?.email}</p>
                        </div>

                        <div className="py-1">
                            {/* Perfil */}
                            <button
                                onClick={() => { setOpen(false); navigate('/profile'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-200/70 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <HiOutlineUser size={16} />
                                {t('dropdown.profile', 'Perfil')}
                            </button>

                            {/* Dashboard */}
                            <button
                                onClick={() => { setOpen(false); navigate('/dashboard'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-200/70 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <HiOutlineChartBar size={16} />
                                {t('dropdown.dashboard', 'Dashboard')}
                            </button>

                            {/* Histórico */}
                            <button
                                onClick={() => { setOpen(false); navigate('/history'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-200/70 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <HiOutlineClipboardList size={16} />
                                {t('dropdown.history', 'Histórico')}
                            </button>

                            {/* Configurações */}
                            <button
                                onClick={() => { setOpen(false); setIsSettingsOpen(true); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-200/70 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <HiOutlineCog size={16} />
                                {t('dropdown.settings', 'Configurações')}
                            </button>
                        </div>

                        <div className="border-t border-white/5 py-1">
                            <button
                                onClick={() => { setOpen(false); logout(); navigate('/login'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                            >
                                <HiOutlineLogout size={16} />
                                {t('dropdown.logout', 'Sair')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
