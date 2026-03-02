import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineUsers,
    HiOutlineClock,
    HiOutlineOfficeBuilding,
    HiOutlineXCircle,
    HiOutlineRefresh,
    HiOutlineCalendar,
    HiOutlineDocumentDownload,
    HiOutlineTable
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import UserDropdown from '../components/UserDropdown';
import { useTranslation } from 'react-i18next';

export default function MetricsDashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSlice, setActiveSlice] = useState(null); // Para o hint do gráfico de PIZZA
    const [aiInsight, setAiInsight] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/dashboard/metrics');
            setMetrics(data);
        } catch (err) {
            console.error('Erro ao buscar métricas:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAiInsight = async () => {
        setLoadingInsight(true);
        try {
            const { data } = await api.get('/dashboard/ai-insights');
            setAiInsight(data.insight);
        } catch (err) {
            console.error('Erro ao buscar insights de IA:', err);
            setAiInsight(null);
        } finally {
            setLoadingInsight(false);
        }
    };

    const handleOpenAiModal = () => {
        setIsAiModalOpen(true);
        if (!aiInsight && !loadingInsight && !loading) {
            fetchAiInsight();
        }
    };

    const exportToPDF = () => {
        if (!metrics) return;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Cores do Projeto (Brand 600 e Accent 500)
        const brandColor = [79, 70, 229]; // #4f46e5
        const accentColor = [139, 92, 246]; // #8b5cf6
        const textColor = [30, 27, 75]; // #1e1b4b

        // --- Cabeçalho Estilizado ---
        // Retângulo de Fundo do Header
        doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Nome do Sistema
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("Velo", 14, 20);

        // Subtítulo do Header
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Dashboard de Métricas e Performance", 14, 28);

        // Informações do Usuário e Data (Alinhado à Direita)
        const dateStr = new Date().toLocaleDateString('pt-BR');
        const timeStr = new Date().toLocaleTimeString('pt-BR');
        doc.setFontSize(9);
        doc.text(`${t('metrics.reportOf', 'Relatório de:')} ${user?.name || t('dropdown.user', 'Usuário')}`, pageWidth - 14, 20, { align: 'right' });
        doc.text(`${t('metrics.generatedAt', 'Gerado em:')} ${dateStr} ${t('common.at', 'às')} ${timeStr}`, pageWidth - 14, 26, { align: 'right' });

        let startY = 55;

        // Estilo Comum para Tabelas
        const commonTableStyles = {
            theme: 'striped',
            headStyles: {
                fillColor: brandColor,
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [50, 50, 50]
            },
            alternateRowStyles: {
                fillColor: [245, 247, 255]
            },
            margin: { left: 14, right: 14 }
        };

        // --- Seções de Dados ---

        // 1. Top Clients
        if (metrics.top_clients.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            doc.setFont("helvetica", "bold");
            doc.text(t('metrics.topClients', 'Clientes Mais Fiéis'), 14, startY);

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY + 5,
                head: [[t('metrics.position', 'Posição'), t('dropdown.client', 'Cliente'), t('metrics.totalAppointments', 'Total de Atendimentos')]],
                body: metrics.top_clients.map((c, i) => [`${i + 1}º`, c.client_name, c.appointment_count]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 20 },
                    2: { halign: 'center' }
                }
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        // 2. Top Workplaces
        if (metrics.top_workplaces.length > 0) {
            doc.setFontSize(14);
            doc.text(t('metrics.topWorkplacesTitlePdf', 'Locais com Maior Fluxo'), 14, startY);

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY + 5,
                head: [[t('metrics.position', 'Posição'), t('history.workplace', 'Local'), t('metrics.clientsCountTitle', 'Qtd. Clientes')]],
                body: metrics.top_workplaces.map((w, i) => [`${i + 1}º`, w.workplace_name, w.client_count]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 20 },
                    2: { halign: 'center' }
                }
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        // 3. Longest Appointments
        if (metrics.longest_appointments.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.text(t('metrics.longestAppointments', 'Atendimentos Mais Longos'), 14, startY);

            autoTable(doc, {
                ...commonTableStyles,
                headStyles: { ...commonTableStyles.headStyles, fillColor: accentColor },
                startY: startY + 5,
                head: [[t('dropdown.client', 'Cliente'), t('metrics.duration', 'Duração'), t('history.date', 'Data')]],
                body: metrics.longest_appointments.map(a => [
                    a.client_name,
                    `${a.duration_minutes} min`,
                    new Date(a.date).toLocaleDateString(t('common.locale', 'pt-BR'))
                ]),
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'center' }
                }
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        // 4. Appointments by Day (Frequência da Semana)
        if (metrics.appointments_by_day.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            doc.text(t('metrics.weekFrequency', 'Frequência da Semana'), 14, startY);

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY + 5,
                head: [[t('metrics.dayOfWeek', 'Dia da Semana'), t('metrics.totalAppointments', 'Total de Atendimentos')]],
                body: metrics.appointments_by_day.map(d => [d.day_name, d.count]),
                columnStyles: {
                    1: { halign: 'center' }
                }
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        // 5. Appointments by Time (Picos de Horário)
        if (metrics.appointments_by_time.length > 0) {
            // Verifica se cabe na página atual, senão adiciona nova página
            if (startY > 240) {
                doc.addPage();
                startY = 20;
            }

            doc.setFontSize(14);
            doc.text(t('metrics.timePeaks', 'Picos de Horário'), 14, startY);

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY + 5,
                head: [[t('metrics.timeRange', 'Faixa Horária'), t('metrics.appointmentsQty', 'Qtd. Agendamentos')]],
                body: metrics.appointments_by_time.map(t => [t.time_range, t.count]),
                columnStyles: {
                    1: { halign: 'center' }
                }
            });
            startY = doc.lastAutoTable.finalY + 15;
        }

        // 6. Resumo de Status (Grid Compacto)
        if (startY > 250) {
            doc.addPage();
            startY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(t('metrics.operationsSummary', 'Resumo de Operações'), 14, startY);

        autoTable(doc, {
            startY: startY + 5,
            head: [[t('metrics.appointmentMetric', 'Métrica de Agendamento'), t('metrics.accumulatedTotal', 'Total Acumulado')]],
            body: [
                [t('metrics.canceledAppointments', 'Atendimentos Cancelados'), metrics.canceled_count],
                [t('metrics.rescheduledAppointments', 'Atendimentos Reagendados'), metrics.rescheduled_count]
            ],
            theme: 'grid',
            headStyles: { fillColor: brandColor, halign: 'center' },
            bodyStyles: { halign: 'center', fontStyle: 'bold' },
            margin: { left: 14, right: 14 }
        });

        // Rodapé Simples
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(t('metrics.confidentialFooter', 'Velo - Documento Confidencial - Página {{page}} de {{total}}', { page: i, total: pageCount }), pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        doc.save(`Relatorio_Velo_${dateStr.replace(/\//g, '-')}.pdf`);
    };

    const exportToExcel = () => {
        if (!metrics) return;

        const wb = XLSX.utils.book_new();

        // Sheet 1: Top Clientes
        if (metrics.top_clients.length > 0) {
            const wsClients = XLSX.utils.json_to_sheet(
                metrics.top_clients.map(c => ({
                    [t('dropdown.client', 'Cliente')]: c.client_name,
                    [t('metrics.appointmentsCount', 'Qtd. de Atendimentos')]: c.appointment_count
                }))
            );
            XLSX.utils.book_append_sheet(wb, wsClients, t('metrics.topClients', 'Top Clientes').substring(0, 31)); // Excel tab limit
        }

        // Sheet 2: Top Locais
        if (metrics.top_workplaces.length > 0) {
            const wsWorkplaces = XLSX.utils.json_to_sheet(
                metrics.top_workplaces.map(w => ({
                    [t('history.workplace', 'Local')]: w.workplace_name,
                    [t('metrics.clientsCountTitle', 'Qtd. de Clientes')]: w.client_count
                }))
            );
            XLSX.utils.book_append_sheet(wb, wsWorkplaces, t('metrics.topWorkplacesTitlePdf', 'Locais Mais Cheios').substring(0, 31));
        }

        // Sheet 3: Atendimentos Mais Longos
        if (metrics.longest_appointments.length > 0) {
            const wsLongest = XLSX.utils.json_to_sheet(
                metrics.longest_appointments.map(a => ({
                    [t('dropdown.client', 'Cliente')]: a.client_name,
                    [t('metrics.durationMin', 'Duração (min)')]: a.duration_minutes,
                    [t('history.date', 'Data')]: new Date(a.date).toLocaleDateString(t('common.locale', 'pt-BR'))
                }))
            );
            XLSX.utils.book_append_sheet(wb, wsLongest, t('metrics.longestAppointments', 'Atendimentos Longos').substring(0, 31));
        }

        // Sheet 4: Por Dia da Semana
        if (metrics.appointments_by_day.length > 0) {
            const wsDays = XLSX.utils.json_to_sheet(
                metrics.appointments_by_day.map(d => ({
                    [t('metrics.dayOfWeek', 'Dia da Semana')]: d.day_name,
                    [t('metrics.appointmentsCount', 'Atendimentos')]: d.count
                }))
            );
            XLSX.utils.book_append_sheet(wb, wsDays, t('metrics.weekFrequency', 'Por Dia da Semana').substring(0, 31));
        }

        // Sheet 5: Resumo Geral
        const wsResumo = XLSX.utils.json_to_sheet([
            { [t('metrics.metric', 'Métrica')]: t('metrics.canceledAppointments', 'Atendimentos Cancelados'), [t('metrics.total', 'Total')]: metrics.canceled_count },
            { [t('metrics.metric', 'Métrica')]: t('metrics.rescheduledAppointments', 'Atendimentos Reagendados'), [t('metrics.total', 'Total')]: metrics.rescheduled_count }
        ]);
        XLSX.utils.book_append_sheet(wb, wsResumo, t('metrics.summary', 'Resumo').substring(0, 31));

        XLSX.writeFile(wb, "dashboard_metricas.xlsx");
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="h-10 w-10 animate-spin text-brand-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-surface-200/60 font-medium">{t('metrics.loading', 'Carregando dashboard...')}</p>
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{t('metrics.error', 'Falha ao carregar métricas.')}</p>
                    <button
                        onClick={fetchMetrics}
                        className="rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition-all"
                    >
                        {t('common.tryAgain', 'Tentar novamente')}
                    </button>
                </div>
            </div>
        );
    }

    // Helper to find the maximum count for bars proportional sizing
    const maxDayCount = Math.max(...metrics.appointments_by_day.map(d => d.count), 1);
    const maxTimeCount = Math.max(...metrics.appointments_by_time.map(t => t.count), 1);

    return (
        <div className="min-h-screen gradient-bg">
            {/* Background Orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-600/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-accent-500/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navbar */}
            <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(-1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-surface-200/70 hover:bg-white/10 hover:text-white transition-all mr-2"
                        >
                            <HiOutlineArrowLeft size={16} />
                        </motion.button>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-md shadow-brand-600/20">
                            <HiSparkles className="text-white" size={18} />
                        </div>
                        <span className="text-lg font-bold text-gradient">{t('dropdown.dashboard', 'Dashboard')}</span>
                    </div>
                    <UserDropdown />
                </div>
            </nav>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-2xl font-bold text-surface-50 sm:text-3xl"
                        >
                            {t('metrics.overview', 'Visão Geral')}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mt-1 text-sm text-surface-200/50"
                        >
                            {t('metrics.overviewDesc', 'Métricas consolidadas da sua conta')}
                        </motion.p>
                    </div>
                    {metrics && (
                        <div className="flex flex-wrap items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleOpenAiModal}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-r from-brand-600/80 to-accent-600/80 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all"
                            >
                                <HiSparkles size={18} />
                                <span>{t('metrics.aiAssistantTitle', 'Assistente Velo IA')}</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={exportToPDF}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-surface-200/70 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all shadow-sm"
                            >
                                <HiOutlineDocumentDownload size={18} />
                                <span>{t('metrics.exportPdf', 'Exportar PDF')}</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={exportToExcel}
                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-surface-200/70 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-sm"
                            >
                                <HiOutlineTable size={18} />
                                <span>{t('metrics.exportExcel', 'Exportar Planilha')}</span>
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* AI Insight Modal */}
                <AnimatePresence>
                    {isAiModalOpen && (
                        <motion.div
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div onClick={() => setIsAiModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl p-[1px] group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/40 via-accent-500/40 to-brand-500/40 opacity-100" />
                                <div className="relative glass-strong h-full w-full rounded-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                    <div className="absolute top-4 right-4 z-20">
                                        <button onClick={() => setIsAiModalOpen(false)} className="rounded-lg bg-white/5 p-2 text-surface-200/60 hover:bg-white/10 hover:text-white transition-all">
                                            <HiOutlineXCircle size={24} />
                                        </button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-600 shadow-xl shadow-brand-500/30">
                                            <HiSparkles className="text-white" size={28} />
                                        </div>
                                        <div className="flex-1 w-full mt-1 sm:mt-0 pr-6">
                                            <h3 className="text-xl font-bold text-surface-50 mb-1">{t('metrics.aiAssistantTitle', 'Assistente Velo IA')}</h3>
                                            <p className="text-sm text-brand-400 mb-6">{t('metrics.aiAssistantSubtitle', 'Análise inteligente em tempo real')}</p>

                                            {loadingInsight ? (
                                                <div className="space-y-4 mt-2">
                                                    <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
                                                    <div className="h-4 bg-white/10 rounded w-full animate-pulse"></div>
                                                    <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse"></div>
                                                    <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse mt-4"></div>
                                                </div>
                                            ) : aiInsight ? (
                                                <div className="mt-2 text-base leading-relaxed max-w-4xl text-surface-200">
                                                    {aiInsight.split('\\n').map((line, i) => {
                                                        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
                                                        const rawText = isBullet ? line.trim().substring(2) : line;
                                                        const parts = rawText.split(/(\*\*.*?\*\*)/g);

                                                        if (line.trim() === '') return <div key={i} className="h-3"></div>;

                                                        return (
                                                            <div key={i} className={`mb-2 ${isBullet ? 'ml-4 flex items-start gap-2.5' : ''}`}>
                                                                {isBullet && <span className="text-brand-400 mt-0.5 shrink-0 text-lg">•</span>}
                                                                <span className="text-surface-200">
                                                                    {parts.map((p, j) => {
                                                                        if (p.startsWith('**') && p.endsWith('**')) {
                                                                            return <strong key={j} className="font-bold text-surface-50">{p.slice(2, -2)}</strong>;
                                                                        }
                                                                        if (p.startsWith('### ')) {
                                                                            return <strong key={j} className="font-bold text-lg text-surface-50 block mt-4 mb-2">{p.slice(4)}</strong>;
                                                                        }
                                                                        if (p.startsWith('## ')) {
                                                                            return <strong key={j} className="font-bold text-xl text-surface-50 block mt-5 mb-2">{p.slice(3)}</strong>;
                                                                        }
                                                                        return <span key={j}>{p}</span>;
                                                                    })}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="mt-4 text-sm font-medium text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                                    {t('metrics.aiError', 'Não foi possível gerar os insights agora.')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Top 3 Clientes */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <HiOutlineUsers size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-50">{t('metrics.topClients', 'Clientes mais fiéis')}</h3>
                        </div>
                        {metrics.top_clients.length > 0 ? (
                            <ul className="space-y-4">
                                {metrics.top_clients.map((client, idx) => (
                                    <li key={client.client_id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-brand-400 w-4">{idx + 1}º</div>
                                            <span className="text-surface-100 text-sm font-medium">{client.client_name}</span>
                                        </div>
                                        <div className="text-xs text-surface-200/60 bg-white/5 py-1 px-2 rounded-md">
                                            {client.appointment_count} {t('metrics.appointmentsCount', 'atendimentos')}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-surface-200/40 text-center py-6">{t('metrics.noData', 'Nenhum dado encontrado.')}</div>
                        )}
                    </motion.div>

                    {/* Top 3 Locais */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                                <HiOutlineOfficeBuilding size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-50">{t('metrics.topWorkplaces', 'Locais mais cheios')}</h3>
                        </div>
                        {metrics.top_workplaces.length > 0 ? (
                            <ul className="space-y-4">
                                {metrics.top_workplaces.map((wp, idx) => (
                                    <li key={wp.workplace_id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-brand-400 w-4">{idx + 1}º</div>
                                            <span className="text-surface-100 text-sm font-medium">{wp.workplace_name}</span>
                                        </div>
                                        <div className="text-xs text-surface-200/60 bg-white/5 py-1 px-2 rounded-md">
                                            {wp.client_count} {t('metrics.clientsCount', 'clientes')}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-surface-200/40 text-center py-6">{t('metrics.noData', 'Nenhum dado encontrado.')}</div>
                        )}
                    </motion.div>

                    {/* Top 3 Consultas Demoradas */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                                <HiOutlineClock size={20} />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-50">{t('metrics.longestAppointments', 'Atendimentos mais longos')}</h3>
                        </div>
                        {metrics.longest_appointments.length > 0 ? (
                            <ul className="space-y-4">
                                {metrics.longest_appointments.map((appt, idx) => (
                                    <li key={appt.appointment_id} className="flex flex-col gap-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="text-sm font-bold text-brand-400 w-4">{idx + 1}º</div>
                                                <span className="text-surface-100 text-sm font-medium">{appt.client_name}</span>
                                            </div>
                                            <div className="text-xs font-semibold text-amber-400/80 bg-amber-500/10 py-1 px-2 rounded-md">
                                                {appt.duration_minutes} min
                                            </div>
                                        </div>
                                        <div className="ml-7 text-xs text-surface-200/40 flex items-center gap-1">
                                            <HiOutlineCalendar size={12} /> {new Date(appt.date).toLocaleDateString('pt-BR')}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-surface-200/40 text-center py-6">{t('metrics.noData', 'Nenhum dado encontrado.')}</div>
                        )}
                    </motion.div>
                </div>

                <div className="grid gap-6 mt-6 md:grid-cols-2">
                    {/* Gráficos em barra/pizza */}

                    {/* Day of Week Pie Chart */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-6 flex flex-col items-center">
                        <div className="flex justify-between items-center w-full mb-6">
                            <h3 className="text-lg font-semibold text-surface-50">{t('metrics.weekFrequency', 'Frequência da semana')}</h3>
                            {metrics.appointments_by_day.reduce((acc, curr) => acc + curr.count, 0) > 0 && (
                                <div className="text-xs font-semibold bg-white/5 border border-white/10 px-2 py-1 rounded-md text-surface-200/70">
                                    {t('metrics.total', 'Total: ')}{metrics.appointments_by_day.reduce((acc, curr) => acc + curr.count, 0)}
                                </div>
                            )}
                        </div>
                        {metrics.appointments_by_day.reduce((acc, curr) => acc + curr.count, 0) === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-surface-200/40">{t('metrics.noData', 'Nenhum dado encontrado.')}</div>
                        ) : (
                            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {(() => {
                                        const radius = 40;
                                        const circumference = 2 * Math.PI * radius;
                                        let currentOffset = 0;
                                        const total = metrics.appointments_by_day.reduce((acc, curr) => acc + curr.count, 0);
                                        // Colors inspired by brand/accent
                                        const colors = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'];

                                        return metrics.appointments_by_day.map((day, idx) => {
                                            if (day.count === 0) return null;
                                            const percentage = day.count / total;
                                            const sliceLength = percentage * circumference;

                                            // Ensure the rest of the array transparently fills out the circle math so SVGs don't overlap events.
                                            const strokeDasharray = `${sliceLength} ${circumference - sliceLength}`;
                                            const strokeDashoffset = -currentOffset;
                                            currentOffset += sliceLength;

                                            return (
                                                <g
                                                    key={idx}
                                                    className="group cursor-pointer outline-none"
                                                    onMouseEnter={() => setActiveSlice(day)}
                                                    onMouseLeave={() => setActiveSlice(null)}
                                                    onClick={() => setActiveSlice(activeSlice?.day_name === day.day_name ? null : day)}
                                                >
                                                    <circle
                                                        cx="50" cy="50" r={radius}
                                                        fill="none"
                                                        stroke={colors[idx % colors.length]}
                                                        strokeWidth="20"
                                                        strokeDasharray={strokeDasharray}
                                                        strokeDashoffset={strokeDashoffset}
                                                        className="transition-all duration-300 hover:stroke-[22px] hover:opacity-80 drop-shadow-md"
                                                        style={{ pointerEvents: 'stroke' }}
                                                    />
                                                </g>
                                            );
                                        });
                                    })()}
                                </svg>

                                {/* Hole center for donut style showing the hint */}
                                <div className="absolute inset-0 m-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface-950/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-center">
                                    {activeSlice ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center pointer-events-none"
                                        >
                                            <div className="text-2xl font-bold text-surface-50">
                                                {activeSlice.count}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-brand-400 font-medium uppercase tracking-wide">
                                                {activeSlice.day_name}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="text-center text-[10px] sm:text-xs text-surface-200/40 pointer-events-none px-2 uppercase tracking-wide">
                                            {t('metrics.selectSlice', 'Selecione uma fatia').split(' ').map((word, i) => (
                                                <span key={i}>{word}{(i === 0) ? <br /> : ' '}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Legend */}
                        {metrics.appointments_by_day.reduce((acc, curr) => acc + curr.count, 0) > 0 && (
                            <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2">
                                {metrics.appointments_by_day.map((day, idx) => {
                                    if (day.count === 0) return null;
                                    const colors = ['bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-rose-500'];
                                    return (
                                        <div key={idx} className="flex items-center gap-1.5 text-xs text-surface-200/70">
                                            <span className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`}></span>
                                            {day.day_name} ({day.count})
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </motion.div>

                    {/* Time of Day Chart */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="glass rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-surface-50 mb-6">{t('metrics.timePeaks', 'Picos de horário')}</h3>
                        <div className="space-y-4">
                            {metrics.appointments_by_time.map((timeRange, idx) => {
                                const widthPercentage = timeRange.count === 0 ? 0 : (timeRange.count / maxTimeCount) * 100;
                                return (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-16 text-xs text-surface-200/60 font-medium text-right font-mono">
                                            {timeRange.time_range}
                                        </div>
                                        <div className="flex-1 h-8 bg-surface-900/50 rounded-lg border border-white/5 overflow-hidden relative flex items-center">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max(2, widthPercentage)}%` }}
                                                transition={{ duration: 1, delay: 0.8 + (idx * 0.1), ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-accent-600/60 to-accent-400 border-r border-white/20 absolute left-0 top-0"
                                                style={{ opacity: timeRange.count === 0 ? 0 : 1 }}
                                            />
                                            {timeRange.count > 0 && (
                                                <span className="absolute left-3 text-xs font-bold text-white drop-shadow-md z-10">
                                                    {timeRange.count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>

                <div className="grid gap-6 mt-6 md:grid-cols-2">
                    {/* Status Counters grouped at the bottom */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass rounded-2xl p-6 flex items-center gap-6 overflow-hidden relative group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-red-500/10 transition-colors"></div>
                        <div className="h-16 w-16 shrink-0 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                            <HiOutlineXCircle size={32} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-surface-50">{metrics.canceled_count}</div>
                            <div className="text-sm text-surface-200/60 mt-1">{t('metrics.canceledAppointments', 'Atendimentos Cancelados')}</div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass rounded-2xl p-6 flex items-center gap-6 overflow-hidden relative group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/10 transition-colors"></div>
                        <div className="h-16 w-16 shrink-0 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                            <HiOutlineRefresh size={32} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-surface-50">{metrics.rescheduled_count}</div>
                            <div className="text-sm text-surface-200/60 mt-1">{t('metrics.rescheduledAppointments', 'Atendimentos Reagendados')}</div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
