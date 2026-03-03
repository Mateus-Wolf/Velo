import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineOfficeBuilding,
    HiOutlineFilter,
    HiOutlineX,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import { useTranslation } from 'react-i18next';

const getStatusMap = (t) => ({
    scheduled: { label: t('status.scheduled', 'Agendado'), color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    confirmed: { label: t('status.confirmed', 'Confirmado'), color: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20' },
    completed: { label: t('status.completed', 'Concluído'), color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    pending: { label: t('status.pending', 'Pendente'), color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    canceled_client: { label: t('status.canceledClient', 'Canc. Cliente'), color: 'bg-red-500/15 text-red-400 border-red-500/20' },
    canceled_user: { label: t('status.canceledUser', 'Cancelado'), color: 'bg-red-500/15 text-red-400 border-red-500/20' },
    no_show: { label: t('status.noShow', 'Não Compareceu'), color: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
});

function duration(start, end) {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ClientHistoryPage() {
    const { t } = useTranslation();
    const statusMap = getStatusMap(t);
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        api.get(`/clients/${clientId}`)
            .then(({ data }) => setClient(data))
            .catch(() => navigate(-1));
    }, [clientId, navigate]);

    useEffect(() => {
        setLoading(true);
        api.get('/appointments/', { params: { client_id: clientId } })
            .then(({ data }) => setAppointments(data))
            .catch(() => setAppointments([]))
            .finally(() => setLoading(false));
    }, [clientId]);

    const filtered = useMemo(() => {
        let list = appointments;
        if (filterStatus !== 'all') list = list.filter((a) => a.status === filterStatus);
        if (dateFrom) list = list.filter((a) => a.date >= dateFrom);
        if (dateTo) list = list.filter((a) => a.date <= dateTo);
        return list;
    }, [appointments, filterStatus, dateFrom, dateTo]);

    const hasActiveFilters = filterStatus !== 'all' || dateFrom || dateTo;

    return (
        <div className="min-h-screen gradient-bg">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-600/10 blur-[120px] animate-pulse-slow" />
            </div>

            <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="Velo Icon" className="h-9 w-9 object-contain drop-shadow-sm" />
                        <span className="text-lg font-bold text-gradient">Velo</span>
                    </div>
                    <UserDropdown />
                </div>
            </nav>

            <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: -3 }}
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center gap-2 text-sm text-surface-200/60 hover:text-brand-400 transition-colors"
                >
                    <HiOutlineArrowLeft size={16} />
                    {t('common.back', 'Voltar')}
                </motion.button>

                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <h1 className="text-2xl font-bold text-surface-50 sm:text-3xl">
                        {t('history.clientHistoryTitle', 'Histórico de {{name}}', { name: client?.name || t('dropdown.client', 'Cliente') })}
                    </h1>
                    <p className="mt-1 text-sm text-surface-200/50">
                        {t('history.clientHistoryDesc', 'Todos os atendimentos deste cliente')}
                    </p>
                </motion.div>

                {/* Filters */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setShowFilters((v) => !v)}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${hasActiveFilters
                                ? 'border-brand-500/30 bg-brand-600/10 text-brand-400'
                                : 'border-white/10 bg-white/5 text-surface-200/60 hover:bg-white/10'
                                }`}
                        >
                            <HiOutlineFilter size={16} />
                            {t('common.filters', 'Filtros')}
                        </motion.button>
                        {hasActiveFilters && (
                            <button
                                onClick={() => { setFilterStatus('all'); setDateFrom(''); setDateTo(''); }}
                                className="text-xs text-surface-200/40 hover:text-white transition-colors"
                            >
                                {t('common.clear', 'Limpar')}
                            </button>
                        )}
                        <span className="ml-auto text-sm text-surface-200/40">
                            {t('history.recordsCount', '{{count}} registros', { count: filtered.length })}
                        </span>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="glass rounded-xl p-4 space-y-4 mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        {['all', 'scheduled', 'confirmed', 'completed', 'pending', 'canceled_client', 'canceled_user', 'no_show'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setFilterStatus(s)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${filterStatus === s
                                                    ? 'gradient-brand text-white border-brand-500/30'
                                                    : 'bg-white/5 text-surface-200/60 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                {s === 'all' ? t('common.all', 'Todos') : statusMap[s]?.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-surface-200/50 mb-1 block">{t('history.dateFrom', 'Data início')}</label>
                                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-50 outline-none focus:border-brand-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-surface-200/50 mb-1 block">{t('history.dateTo', 'Data fim')}</label>
                                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-50 outline-none focus:border-brand-500" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Loading */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-white/10" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/3 rounded bg-white/10" />
                                        <div className="h-3 w-1/4 rounded bg-white/5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && filtered.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                        <HiOutlineCalendar className="mx-auto mb-3 text-surface-200/20" size={48} />
                        <p className="text-base text-surface-200/50">{t('history.noRecords', 'Nenhum registro encontrado')}</p>
                        <p className="mt-1 text-sm text-surface-200/30">{t('history.noRecordsDesc', 'Ajuste os filtros ou verifique os dados')}</p>
                    </motion.div>
                )}

                {/* List */}
                {!loading && filtered.length > 0 && (
                    <div className="space-y-3">
                        {filtered.map((a, i) => {
                            const st = statusMap[a.status] || statusMap.scheduled;
                            return (
                                <motion.div
                                    key={a.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="glass rounded-2xl p-5 hover:shadow-lg hover:shadow-brand-600/5 transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/15 text-brand-400 border border-brand-500/20">
                                                <HiOutlineOfficeBuilding size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-surface-50">
                                                    {a.workplace_name || `${t('history.workplace', 'Local')} #${a.workplace_id}`}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-surface-200/50">
                                                    <span className="flex items-center gap-1">
                                                        <HiOutlineCalendar size={12} />
                                                        {new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <HiOutlineClock size={12} />
                                                        {a.start_time?.substring(0, 5)} — {a.end_time?.substring(0, 5)}
                                                    </span>
                                                    <span className="text-brand-400/60">
                                                        {duration(a.start_time, a.end_time)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {a.rescheduled && (
                                                <span className="rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/20">
                                                    ↻ Reag.
                                                </span>
                                            )}
                                            <span className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${st.color}`}>
                                                {st.label}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
