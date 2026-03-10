import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineBell,
    HiOutlineX,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUser,
    HiOutlineOfficeBuilding,
    HiOutlineCalendar,
} from 'react-icons/hi';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';

const POLL_INTERVAL = 60_000;

/* Mapeia tipo de notificação para label e cor */
function getTypeInfo(type, t) {
    if (type?.includes('30min')) return { label: t('notifCenter.in30min', 'Em 30 min'), color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25' };
    if (type?.includes('1day')) return { label: t('notifCenter.in1day', 'Em 1 dia'), color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/25' };
    if (type?.includes('2days')) return { label: t('notifCenter.in2days', 'Em 2 dias'), color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/25' };
    return { label: t('notifCenter.reminder', 'Lembrete'), color: 'text-brand-400', bg: 'bg-brand-500/15 border-brand-500/25' };
}

/* Agrupa notificações por data relativa */
function groupByDate(notifications, t) {
    const groups = {};
    const today = new Date().toLocaleDateString('pt-BR');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');

    for (const n of notifications) {
        const sentDate = n.sent_at ? new Date(n.sent_at).toLocaleDateString('pt-BR') : 'N/A';
        let label;
        if (sentDate === today) label = t('notifCenter.today', 'Hoje');
        else if (sentDate === yesterday) label = t('notifCenter.yesterday', 'Ontem');
        else label = sentDate;

        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    }
    return groups;
}

export default function NotificationCenter() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);
    const intervalRef = useRef(null);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count);
        } catch { /* silent */ }
    }, [user]);

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await api.get('/notifications/history');
            setNotifications(data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [user]);

    // Poll unread count
    useEffect(() => {
        fetchUnreadCount();
        intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [fetchUnreadCount]);

    // Fetch history when panel opens
    useEffect(() => {
        if (isOpen) fetchHistory();
    }, [isOpen, fetchHistory]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch { /* silent */ }
    };

    const togglePanel = () => setIsOpen(prev => !prev);

    const grouped = groupByDate(notifications, t);

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePanel}
                className={`relative flex items-center justify-center rounded-xl p-2 border transition-all ${isOpen
                    ? 'bg-brand-500/15 text-brand-300 border-brand-500/25'
                    : 'border-transparent text-surface-200/60 hover:bg-white/5 hover:text-white'
                    }`}
                title={t('notifCenter.title', 'Notificações')}
            >
                <HiOutlineBell size={18} />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 shadow-sm shadow-red-600/40"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="absolute right-0 top-12 z-50 w-[360px] max-h-[480px] flex flex-col rounded-2xl border border-white/10 bg-surface-950/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <HiOutlineBell size={16} className="text-brand-400" />
                                <h3 className="text-sm font-semibold text-surface-50">
                                    {t('notifCenter.title', 'Notificações')}
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold text-brand-300 bg-brand-500/20 px-1.5 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-[10px] font-medium text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                                    >
                                        {t('notifCenter.markAllRead', 'Marcar lidas')}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-surface-200/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                >
                                    <HiOutlineX size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            {loading && notifications.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-800/50 border border-white/5">
                                        <HiOutlineBell className="text-surface-200/30" size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-surface-200/40">
                                        {t('notifCenter.empty', 'Nenhuma notificação ainda')}
                                    </p>
                                    <p className="text-xs text-surface-200/25 mt-1">
                                        {t('notifCenter.emptyDesc', 'Seus lembretes aparecerão aqui')}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {Object.entries(grouped).map(([dateLabel, items]) => (
                                        <div key={dateLabel}>
                                            {/* Date header */}
                                            <div className="sticky top-0 z-10 bg-surface-950/90 backdrop-blur-sm px-4 py-2 border-b border-white/5">
                                                <span className="text-[10px] font-semibold text-surface-200/40 uppercase tracking-wider">
                                                    {dateLabel}
                                                </span>
                                            </div>

                                            {/* Notification items */}
                                            {items.map((n) => {
                                                const typeInfo = getTypeInfo(n.notification_type, t);
                                                return (
                                                    <div
                                                        key={n.id}
                                                        className={`px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${!n.is_read ? 'bg-brand-500/[0.03]' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {/* Unread dot */}
                                                            <div className="mt-1.5 shrink-0">
                                                                {!n.is_read ? (
                                                                    <div className="h-2 w-2 rounded-full bg-brand-400 shadow-sm shadow-brand-400/50" />
                                                                ) : (
                                                                    <div className="h-2 w-2 rounded-full bg-transparent" />
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                {/* Type badge + time */}
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${typeInfo.bg} ${typeInfo.color}`}>
                                                                        {typeInfo.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-surface-200/30 shrink-0">
                                                                        {n.sent_at ? new Date(n.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                    </span>
                                                                </div>

                                                                {/* Client name */}
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <HiOutlineUser size={11} className="text-surface-200/30 shrink-0" />
                                                                    <span className="text-xs font-medium text-surface-50 truncate">{n.client_name}</span>
                                                                </div>

                                                                {/* Details */}
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-surface-200/40">
                                                                    <span className="flex items-center gap-1">
                                                                        <HiOutlineOfficeBuilding size={10} />
                                                                        {n.workplace_name}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <HiOutlineCalendar size={10} />
                                                                        {n.date}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <HiOutlineClock size={10} />
                                                                        {n.time}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
