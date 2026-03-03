import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlineCalendar,
    HiOutlineLocationMarker,
    HiOutlineUser,
} from 'react-icons/hi';
import { HiOutlineUserMinus } from 'react-icons/hi2';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import { useTranslation } from 'react-i18next';

function fmtTime(t) { return t ? t.substring(0, 5) : ''; }
function fmtPrice(price) {
    if (price == null || price === 0) return null;
    return `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PendingAppointmentsPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(null); // id being resolved

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await api.get('/appointments/', { params: { appointment_status: 'pending' } });
            setAppointments(res.data);
        } catch (err) {
            console.error('Erro ao buscar pendentes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPending(); }, []);

    const handleResolve = async (appointmentId, newStatus) => {
        setResolving(appointmentId);
        try {
            await api.patch(`/appointments/${appointmentId}/resolve`, null, {
                params: { new_status: newStatus }
            });
            setAppointments(prev => prev.filter(a => a.id !== appointmentId));
        } catch (err) {
            console.error('Erro ao resolver:', err);
        } finally {
            setResolving(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="h-10 w-10 animate-spin text-brand-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-surface-200/60 font-medium">Carregando pendentes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-bg">
            {/* Background Orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-600/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-brand-500/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navbar */}
            <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(-1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-surface-200/70 hover:bg-white/10 hover:text-white transition-all mr-2"
                        >
                            <HiOutlineArrowLeft size={16} />
                        </motion.button>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 shadow-md shadow-amber-600/10">
                            <HiOutlineClock className="text-amber-400" size={18} />
                        </div>
                        <span className="text-lg font-bold text-surface-50">
                            {t('pending.title', 'Agendamentos Pendentes')}
                        </span>
                        {appointments.length > 0 && (
                            <span className="ml-2 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                {appointments.length}
                            </span>
                        )}
                    </div>
                    <UserDropdown />
                </div>
            </nav>

            <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
                {/* Description */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 glass rounded-2xl p-5 border border-amber-500/10"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                            <HiOutlineClock size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-surface-50 mb-1">
                                {t('pending.infoTitle', 'O que são agendamentos pendentes?')}
                            </h2>
                            <p className="text-xs text-surface-200/50 leading-relaxed">
                                {t('pending.infoDesc', 'São agendamentos confirmados cuja data já passou sem terem sido concluídos ou cancelados. Defina o status final de cada um abaixo.')}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Empty State */}
                {appointments.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                            <HiOutlineCheckCircle className="text-emerald-400" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-surface-50 mb-2">
                            {t('pending.emptyTitle', 'Tudo em dia!')}
                        </h3>
                        <p className="text-sm text-surface-200/50 max-w-sm">
                            {t('pending.emptyDesc', 'Não há agendamentos pendentes para resolver. Volte à agenda para continuar seu trabalho.')}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/')}
                            className="mt-6 flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25"
                        >
                            <HiOutlineCalendar size={16} />
                            {t('pending.backToCalendar', 'Voltar à Agenda')}
                        </motion.button>
                    </motion.div>
                )}

                {/* Appointment Cards */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {appointments.map((a, idx) => (
                            <motion.div
                                key={a.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -300, scale: 0.95 }}
                                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                                className="glass rounded-2xl p-5 border border-amber-500/10 hover:border-amber-500/20 transition-colors"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    {/* Left - Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                                                Pendente
                                            </span>
                                            {a.rescheduled && (
                                                <span className="text-[10px] font-semibold text-amber-300/70 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                    ↻ Reagendado
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mb-1.5">
                                            <HiOutlineUser size={14} className="text-surface-200/40 shrink-0" />
                                            <span className="text-sm font-semibold text-surface-50 truncate">
                                                {a.client_name || `Cliente #${a.client_id}`}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-200/50">
                                            <span className="flex items-center gap-1">
                                                <HiOutlineCalendar size={12} />
                                                {new Date(a.date).toLocaleDateString('pt-BR')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <HiOutlineClock size={12} />
                                                {fmtTime(a.start_time)} – {fmtTime(a.end_time)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <HiOutlineLocationMarker size={12} />
                                                {a.workplace_name || `Local #${a.workplace_id}`}
                                            </span>
                                        </div>

                                        {fmtPrice(a.price) && (
                                            <div className="mt-1.5 text-sm font-semibold text-emerald-400">
                                                {fmtPrice(a.price)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right - Actions */}
                                    <div className="flex gap-2 sm:flex-col sm:min-w-[140px]">
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            disabled={resolving === a.id}
                                            onClick={() => handleResolve(a.id, 'completed')}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-40"
                                        >
                                            <HiOutlineCheckCircle size={15} />
                                            {t('pending.completed', 'Concluído')}
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            disabled={resolving === a.id}
                                            onClick={() => handleResolve(a.id, 'no_show')}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-500/30 bg-gray-500/10 px-3 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-500/20 hover:border-gray-500/40 transition-all disabled:opacity-40"
                                        >
                                            <HiOutlineUserMinus size={15} />
                                            {t('pending.noShow', 'Não Veio')}
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            disabled={resolving === a.id}
                                            onClick={() => handleResolve(a.id, 'canceled_user')}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-40"
                                        >
                                            <HiOutlineXCircle size={15} />
                                            {t('pending.cancel', 'Cancelar')}
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
