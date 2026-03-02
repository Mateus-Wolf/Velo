import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineBell, HiOutlineX, HiOutlineClock, HiOutlineUser, HiOutlineOfficeBuilding, HiOutlineCalendar } from 'react-icons/hi';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';

const POLL_INTERVAL = 60_000; // 60 segundos

/* ------------------------------------------------------------------ */
/*  Som de notificação via Web Audio API                                */
/* ------------------------------------------------------------------ */
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;

        // Primeiro tom (mais alto)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Segundo tom (mais suave)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, now + 0.15);
        gain2.gain.setValueAtTime(0.2, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.5);

        setTimeout(() => ctx.close(), 1000);
    } catch {
        // Silently fail — browser may block audio
    }
}

/* ------------------------------------------------------------------ */
/*  NotificationToast Component                                         */
/* ------------------------------------------------------------------ */
export default function NotificationToast() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [toasts, setToasts] = useState([]);
    const intervalRef = useRef(null);

    const fetchPending = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await api.get('/notifications/pending');
            if (data.length > 0) {
                setToasts((prev) => {
                    // Only add truly new ones
                    const existingKeys = new Set(prev.map((t) => `${t.appointment_id}_${t.notification_type}`));
                    const newOnes = data.filter((n) => !existingKeys.has(`${n.appointment_id}_${n.notification_type}`));
                    if (newOnes.length > 0) {
                        playNotificationSound();
                        return [...prev, ...newOnes];
                    }
                    return prev;
                });

                // Mark as seen on the server
                await api.post('/notifications/mark-seen', data).catch(() => { });
            }
        } catch {
            // Silent — don't crash on network issues
        }
    }, [user]);

    useEffect(() => {
        fetchPending();
        intervalRef.current = setInterval(fetchPending, POLL_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [fetchPending]);

    const dismiss = (index) => {
        setToasts((prev) => prev.filter((_, i) => i !== index));
    };

    const dismissAll = () => setToasts([]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast, idx) => (
                    <motion.div
                        key={`${toast.appointment_id}_${toast.notification_type}_${idx}`}
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="pointer-events-auto rounded-2xl border border-brand-500/30 bg-surface-950/95 backdrop-blur-xl shadow-2xl shadow-brand-600/20 overflow-hidden"
                    >
                        {/* Gradient header bar */}
                        <div className="h-1 w-full gradient-brand" />

                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/15 border border-brand-500/20">
                                        <HiOutlineBell size={20} className="text-brand-400 animate-bounce" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-surface-50">
                                            {t('notification.appointmentNear', '🔔 Agendamento próximo!')}
                                        </h4>
                                        <p className="text-xs text-surface-200/50 mt-0.5">
                                            {toast.notification_type.includes('30min') && t('notification.in30min', 'Em ~30 minutos')}
                                            {toast.notification_type.includes('1day') && t('notification.tomorrow', 'Amanhã')}
                                            {toast.notification_type.includes('2days') && t('notification.in2days', 'Em 2 dias')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismiss(idx)}
                                    className="rounded-lg p-1.5 text-surface-200/40 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <HiOutlineX size={14} />
                                </button>
                            </div>

                            <div className="mt-3 space-y-1.5 rounded-xl bg-white/5 border border-white/5 p-3">
                                <div className="flex items-center gap-2 text-xs text-surface-200/70">
                                    <HiOutlineUser size={13} className="text-surface-200/40 shrink-0" />
                                    <span className="font-medium text-surface-50">{toast.client_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-surface-200/70">
                                    <HiOutlineOfficeBuilding size={13} className="text-surface-200/40 shrink-0" />
                                    <span>{toast.workplace_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-surface-200/70">
                                    <HiOutlineCalendar size={13} className="text-surface-200/40 shrink-0" />
                                    <span>{toast.date}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-surface-200/70">
                                    <HiOutlineClock size={13} className="text-surface-200/40 shrink-0" />
                                    <span className="font-semibold text-brand-300">{toast.time}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {toasts.length > 1 && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={dismissAll}
                        className="pointer-events-auto self-end rounded-xl border border-white/10 bg-surface-900/90 backdrop-blur-xl px-4 py-2 text-xs font-medium text-surface-200/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                        {t('notification.closeAll', 'Fechar todas ({{count}})', { count: toasts.length })}
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
