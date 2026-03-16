import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HiOutlineCalendar,
    HiOutlineOfficeBuilding,
    HiOutlineChartBar,
    HiOutlineCurrencyDollar,
    HiOutlineClock,
} from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import UserDropdown from './UserDropdown';
import NotificationCenter from './NotificationCenter';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

const ALL_NAV_ITEMS = [
    { path: '/', icon: HiOutlineCalendar, labelKey: 'nav.agenda', fallback: 'Agenda', adminOnly: false },
    { path: '/workplaces', icon: HiOutlineOfficeBuilding, labelKey: 'nav.workplaces', fallback: 'Locais', adminOnly: false },
    { path: '/dashboard', icon: HiOutlineChartBar, labelKey: 'nav.dashboard', fallback: 'Dashboard', adminOnly: true },
    { path: '/financeiro', icon: HiOutlineCurrencyDollar, labelKey: 'nav.financial', fallback: 'Financeiro', adminOnly: true },
    { path: '/pendentes', icon: HiOutlineClock, labelKey: 'nav.pending', fallback: 'Pendentes', adminOnly: true },
];

export default function HeaderNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const [pendingCount, setPendingCount] = useState(0);

    const isStaff = user?.role === 'staff';

    // Filter nav items based on role
    const NAV_ITEMS = isStaff
        ? ALL_NAV_ITEMS.filter((item) => !item.adminOnly)
        : ALL_NAV_ITEMS;

    useEffect(() => {
        if (isStaff) return; // Staff doesn't see pending count
        const fetchPending = async () => {
            try {
                const res = await api.get('/appointments/pending-count');
                setPendingCount(res.data.count);
            } catch { /* silently ignore */ }
        };
        fetchPending();
    }, [isStaff]);

    return (
        <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <img src="/favicon.png" alt="Velo Icon" className="h-9 w-9 object-contain drop-shadow-sm" />
                    <span className="text-lg font-bold text-gradient hidden sm:inline">Velo</span>
                    {isStaff && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 hidden sm:inline">
                            Staff
                        </span>
                    )}
                </div>

                {/* Nav Links + Notification Center + Dropdown */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        const isPending = item.path === '/pendentes';
                        return (
                            <motion.button
                                key={item.path}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(item.path)}
                                className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 sm:px-3 text-sm transition-all ${isActive
                                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/25'
                                    : 'border border-transparent text-surface-200/60 hover:bg-white/5 hover:text-white'
                                    }`}
                                title={t(item.labelKey, item.fallback)}
                            >
                                <Icon size={16} />
                                <span className="hidden md:inline text-xs font-medium">
                                    {t(item.labelKey, item.fallback)}
                                </span>
                                {isPending && pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white px-1 shadow-sm shadow-amber-600/40">
                                        {pendingCount}
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}

                    <div className="ml-1 sm:ml-2">
                        <UserDropdown />
                    </div>

                    {/* Notification Center (bell icon) */}
                    <NotificationCenter />
                </div>
            </div>
        </nav>
    );
}
