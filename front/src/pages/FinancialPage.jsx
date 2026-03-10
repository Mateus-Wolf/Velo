import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineCurrencyDollar,
    HiOutlineTrendingUp,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import HeaderNav from '../components/HeaderNav';
import { useTranslation } from 'react-i18next';

export default function FinancialPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();

    const [metrics, setMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    const [goalInput, setGoalInput] = useState(() => user?.monthly_goal || 0);
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    const [projection, setProjection] = useState(null);
    const [loadingProjection, setLoadingProjection] = useState(false);

    const [goalHistory, setGoalHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [clearingHistory, setClearingHistory] = useState(false);

    const fmtBRL = (v) => {
        if (v == null) return 'R$ 0,00';
        return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const fetchMetrics = useCallback(async () => {
        setLoadingMetrics(true);
        try {
            const { data } = await api.get('/dashboard/metrics');
            setMetrics(data);
        } catch (err) {
            console.error('Erro ao buscar métricas:', err);
        } finally {
            setLoadingMetrics(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const { data } = await api.get('/financial/goal-history');
            setGoalHistory(data.history || []);
        } catch (err) {
            console.error('Erro ao buscar histórico:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    const fetchProjection = useCallback(async () => {
        setLoadingProjection(true);
        try {
            const { data } = await api.post('/financial/projection');
            setProjection(data.projection);
        } catch (err) {
            console.error('Erro ao gerar projeção:', err);
            setProjection(null);
        } finally {
            setLoadingProjection(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        fetchHistory();
        // Fetch projection if user already has a goal
        if (user?.monthly_goal > 0) {
            fetchProjection();
        }
    }, []);

    const handleSaveGoal = async () => {
        setIsSavingGoal(true);
        try {
            const { data } = await api.put('/financial/goal', { goal_value: parseFloat(goalInput) });
            updateUser({ ...user, monthly_goal: data.monthly_goal });
            // Refresh everything after saving
            await Promise.all([fetchMetrics(), fetchHistory()]);
            // Generate new projection
            if (data.monthly_goal > 0) {
                fetchProjection();
            } else {
                setProjection(null);
            }
        } catch (err) {
            console.error('Erro ao salvar meta:', err);
        } finally {
            setIsSavingGoal(false);
        }
    };

    const handleClearHistory = async () => {
        setClearingHistory(true);
        try {
            await api.delete('/financial/goal-history');
            setGoalHistory([]);
        } catch (err) {
            console.error('Erro ao limpar histórico:', err);
        } finally {
            setClearingHistory(false);
        }
    };

    // Renderiza markdown simples do Gemini
    const renderMarkdown = (text) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (trimmed === '') return <div key={i} className="h-2" />;
            if (trimmed.startsWith('### ')) {
                return (
                    <h3 key={i} className="text-base font-bold text-surface-50 mt-4 mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                        {renderInline(trimmed.slice(4))}
                    </h3>
                );
            }
            if (trimmed.startsWith('## ')) {
                return (
                    <h2 key={i} className="text-lg font-bold text-surface-50 mt-5 mb-2">
                        {renderInline(trimmed.slice(3))}
                    </h2>
                );
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                    <div key={i} className="ml-4 mb-1.5 flex items-start gap-2">
                        <span className="text-brand-400 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400" />
                        <span className="text-surface-200 text-sm leading-relaxed">
                            {renderInline(trimmed.substring(2))}
                        </span>
                    </div>
                );
            }
            return (
                <p key={i} className="mb-1.5 text-surface-200 text-sm leading-relaxed">
                    {renderInline(trimmed)}
                </p>
            );
        });
    };

    const renderInline = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-bold text-surface-50">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
        });
    };

    if (loadingMetrics) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="h-10 w-10 animate-spin text-brand-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-surface-200/60 font-medium">Carregando financeiro...</p>
                </div>
            </div>
        );
    }

    const currentGoal = metrics?.monthly_goal || 0;
    const currentRevenue = metrics?.current_month_revenue || 0;
    const projectedRevenue = metrics?.projected_revenue || 0;
    const goalProgress = currentGoal > 0 ? Math.min((currentRevenue / currentGoal) * 100, 100) : 0;

    return (
        <div className="min-h-screen gradient-bg">
            {/* Background Orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-600/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-brand-500/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navbar */}
            <HeaderNav />

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-bold text-surface-50 sm:text-3xl"
                    >
                        Controle Financeiro
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-1 text-sm text-surface-200/50"
                    >
                        Gerencie suas metas de faturamento e acompanhe projeções inteligentes
                    </motion.p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Meta de Faturamento */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <HiOutlineTrendingUp size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-50">Meta de Faturamento</h3>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-surface-200/50 text-sm font-medium">R$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                className="flex-1 appearance-none rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-base font-semibold text-surface-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 hover:bg-white/10 transition-colors"
                                placeholder="0.00"
                            />
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={isSavingGoal || (user?.monthly_goal == goalInput)}
                                onClick={handleSaveGoal}
                                className="rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40"
                            >
                                {isSavingGoal ? 'Salvando...' : 'Salvar'}
                            </motion.button>
                        </div>

                        {/* Progress Bar */}
                        {currentGoal > 0 && (
                            <div className="mt-2">
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-2xl font-bold tracking-tight text-white">{fmtBRL(currentRevenue)}</span>
                                    <span className="text-sm font-medium text-surface-200/50 mb-0.5">/ {fmtBRL(currentGoal)}</span>
                                </div>

                                <div className="w-full bg-white/5 rounded-full h-3 mb-3 overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${goalProgress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-3 rounded-full ${currentRevenue >= currentGoal ? 'bg-emerald-500' : 'bg-brand-500'} transition-all`}
                                    />
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-medium ${currentRevenue >= currentGoal ? 'text-emerald-400' : 'text-surface-200/50'}`}>
                                        {goalProgress.toFixed(0)}% da meta
                                    </span>
                                    <div className="bg-white/5 rounded-lg px-3 py-1.5 border border-white/5">
                                        <p className="text-[10px] font-medium text-surface-200/60 uppercase tracking-wider">Projeção</p>
                                        <p className="text-base font-bold text-emerald-400">{fmtBRL(projectedRevenue)}</p>
                                        <p className={`text-[10px] mt-0.5 ${projectedRevenue >= currentGoal ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>
                                            {projectedRevenue >= currentGoal ? '✨ Meta será atingida!' : 'Abaixo da meta'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentGoal <= 0 && (
                            <div className="flex flex-col items-center py-6 text-center">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/10 border border-emerald-500/20">
                                    <HiOutlineCurrencyDollar className="text-emerald-400" size={24} />
                                </div>
                                <p className="text-sm text-surface-200/50 max-w-xs">
                                    Defina uma meta acima de zero para visualizar o progresso e gerar projeções inteligentes.
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* Projeção Gemini */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
                                    <HiSparkles size={20} />
                                </div>
                                <h3 className="text-lg font-semibold text-surface-50">Projeção IA</h3>
                            </div>
                            {currentGoal > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    disabled={loadingProjection}
                                    onClick={fetchProjection}
                                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-surface-200/70 hover:bg-brand-500/20 hover:text-brand-400 transition-all disabled:opacity-50"
                                >
                                    <HiSparkles size={14} />
                                    Atualizar
                                </motion.button>
                            )}
                        </div>

                        {loadingProjection ? (
                            <div className="space-y-3">
                                <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
                                <div className="h-4 bg-white/10 rounded w-full animate-pulse" />
                                <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse" />
                                <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse mt-3" />
                            </div>
                        ) : projection ? (
                            <div className="leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {renderMarkdown(projection)}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 border border-brand-500/20">
                                    <HiSparkles className="text-brand-400" size={24} />
                                </div>
                                <p className="text-sm text-surface-200/50 max-w-xs">
                                    {currentGoal > 0
                                        ? 'Clique em "Atualizar" para gerar uma projeção inteligente.'
                                        : 'Defina uma meta para desbloquear as projeções inteligentes.'}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Histórico de Metas */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-2xl p-6 mt-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent-500/20 text-accent-400">
                                <HiOutlineTrendingUp size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-50">Histórico de Metas</h3>
                        </div>
                        {goalHistory.length > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                disabled={clearingHistory}
                                onClick={handleClearHistory}
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-red-400/80 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                            >
                                <HiOutlineTrash size={14} />
                                {clearingHistory ? 'Limpando...' : 'Limpar Histórico'}
                            </motion.button>
                        )}
                    </div>

                    {loadingHistory ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : goalHistory.length > 0 ? (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {goalHistory.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${item.achieved
                                            ? 'bg-emerald-500/5 border-emerald-500/20'
                                            : 'bg-white/[0.02] border-white/5'
                                            }`}
                                    >
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.achieved
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/10 text-red-400/70'
                                            }`}>
                                            {item.achieved
                                                ? <HiOutlineCheckCircle size={22} />
                                                : <HiOutlineXCircle size={22} />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-semibold text-surface-50">{fmtBRL(item.goal_value)}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.achieved
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-red-500/10 text-red-400/70 border border-red-500/20'
                                                    }`}>
                                                    {item.achieved ? 'BATIDA ✓' : 'NÃO BATIDA'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-surface-200/50">
                                                {item.month_ref} · Receita: {fmtBRL(item.revenue_at_close)}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600/10 border border-accent-500/20">
                                <HiOutlineTrendingUp className="text-accent-400" size={24} />
                            </div>
                            <p className="text-sm text-surface-200/50 max-w-xs">
                                Seu histórico de metas aparecerá aqui quando você definir novas metas ao longo do tempo.
                            </p>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
