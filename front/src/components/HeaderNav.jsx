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
import api from '../services/api';

const NAV_ITEMS = [
    { path: '/', icon: HiOutlineCalendar, labelKey: 'nav.agenda', fallback: 'Agenda' },
    { path: '/workplaces', icon: HiOutlineOfficeBuilding, labelKey: 'nav.workplaces', fallback: 'Locais' },
    { path: '/dashboard', icon: HiOutlineChartBar, labelKey: 'nav.dashboard', fallback: 'Dashboard' },
    { path: '/financeiro', icon: HiOutlineCurrencyDollar, labelKey: 'nav.financial', fallback: 'Financeiro' },
    { path: '/pendentes', icon: HiOutlineClock, labelKey: 'nav.pending', fallback: 'Pendentes' },
];

export default function HeaderNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const res = await api.get('/appointments/pending-count');
                setPendingCount(res.data.count);
            } catch { /* silently ignore */ }
        };
        fetchPending();
    }, []);

    return (
        <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <img src="/favicon.png" alt="Velo Icon" className="h-9 w-9 object-contain drop-shadow-sm" />
                    <span className="text-lg font-bold text-gradient hidden sm:inline">Velo</span>
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

