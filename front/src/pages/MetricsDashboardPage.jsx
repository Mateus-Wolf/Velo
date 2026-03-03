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
    HiOutlineTable,
    HiOutlineCurrencyDollar,
    HiOutlineTrendingUp,
    HiOutlineChartBar,
    HiOutlineCheckCircle,
    HiOutlineUserRemove,
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
    const [aiInsight, setAiInsight] = useState(() => {
        try {
            return localStorage.getItem('velo_ai_insight') || null;
        } catch { return null; }
    });
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
            try { localStorage.setItem('velo_ai_insight', data.insight); } catch { }
        } catch (err) {
            console.error('Erro ao buscar insights de IA:', err);
            setAiInsight(null);
            try { localStorage.removeItem('velo_ai_insight'); } catch { }
        } finally {
            setLoadingInsight(false);
        }
    };

    const handleOpenAiModal = () => {
        setIsAiModalOpen(true);
    };

    // Função auxiliar para renderizar markdown do Gemini
    const renderMarkdown = (text) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();

            // Linha vazia
            if (trimmed === '') return <div key={i} className="h-3" />;

            // Header ### (com ou sem emoji)
            if (trimmed.startsWith('### ')) {
                const headerText = trimmed.slice(4);
                return (
                    <h3 key={i} className="text-lg font-bold text-surface-50 mt-5 mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                        {renderInlineMarkdown(headerText)}
                    </h3>
                );
            }

            // Header ##
            if (trimmed.startsWith('## ')) {
                const headerText = trimmed.slice(3);
                return (
                    <h2 key={i} className="text-xl font-bold text-surface-50 mt-6 mb-3">
                        {renderInlineMarkdown(headerText)}
                    </h2>
                );
            }

            // Bullet point (- ou *)
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const bulletText = trimmed.substring(2);
                return (
                    <div key={i} className="ml-4 mb-2 flex items-start gap-2.5">
                        <span className="text-brand-400 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400" />
                        <span className="text-surface-200 text-sm leading-relaxed">
                            {renderInlineMarkdown(bulletText)}
                        </span>
                    </div>
                );
            }

            // Parágrafo normal
            return (
                <p key={i} className="mb-2 text-surface-200 text-sm leading-relaxed">
                    {renderInlineMarkdown(trimmed)}
                </p>
            );
        });
    };

    // Renderiza negrito inline
    const renderInlineMarkdown = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-bold text-surface-50">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
        });
    };

    const exportToPDF = () => {
        if (!metrics) return;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Cores do Projeto (Sleek Modern Palette)
        const brandColor = [79, 70, 229]; // indigo-600
        const accentColor = [139, 92, 246]; // violet-500
        const surfaceColor = [248, 250, 252]; // slate-50
        const textMain = [15, 23, 42]; // slate-900
        const textMuted = [100, 116, 139]; // slate-500
        const successColor = [16, 185, 129]; // emerald-500
        const warningColor = [245, 158, 11]; // amber-500
        const dangerColor = [239, 68, 68]; // red-500

        // Helper para formatação de moeda
        const pdfFmtBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // --- 1. CABEÇALHO MODERNO ---
        // Faixa superior
        doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.rect(0, 0, pageWidth, 55, 'F');

        // Elemento decorativo sutil (círculos sobrepostos)
        // Simulando a transparência de 10% de branco sobre a brandColor (indigo-600)
        // Indigo-600 = [79, 70, 229]. Branco a 10% = aprox [96, 88, 231]
        doc.setFillColor(96, 88, 231);
        doc.circle(pageWidth - 20, 15, 40, 'F');
        doc.circle(pageWidth - 10, 5, 25, 'F');

        // Logo / Título Principal
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text("Velo", 14, 25);

        // Subtítulo
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        // Simulando 90% de opacidade branca
        doc.setTextColor(230, 230, 230);
        doc.text("Dashboard Analytics & Performance", 14, 35);

        // Caixa de Informações do Relatório
        const dateStr = new Date().toLocaleDateString('pt-BR');
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(pageWidth - 75, 12, 60, 30, 3, 3, 'F');

        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(8);
        doc.text(t('metrics.reportOf', 'GERADO POR'), pageWidth - 70, 20);

        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const userName = user?.name || t('dropdown.user', 'Usuário');
        doc.text(userName.length > 20 ? userName.substring(0, 20) + '...' : userName, pageWidth - 70, 26);

        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`${dateStr} - ${timeStr}`, pageWidth - 70, 36);

        let startY = 65;

        // --- 2. KPI CARDS (RESUMO EXECUTIVO) ---
        const kpiWidth = (pageWidth - 28 - 12) / 4; // 14px margin each side, 4px gap

        const drawKPICard = (x, y, title, value, iconColor, bgColor) => {
            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.roundedRect(x, y, kpiWidth, 22, 2, 2, 'F');

            doc.setDrawColor(iconColor[0], iconColor[1], iconColor[2]);
            doc.setLineWidth(1.5);
            doc.line(x + 2, y + 4, x + 2, y + 18); // Accent line left

            doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(title, x + 6, y + 8);

            doc.setTextColor(textMain[0], textMain[1], textMain[2]);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            const valStr = String(value);
            // Auto truncate if very large
            doc.text(valStr.length > 10 ? valStr.substring(0, 10) + '...' : valStr, x + 6, y + 17);
        };

        drawKPICard(14, startY, "Receita Total", pdfFmtBRL(metrics.total_revenue), successColor, surfaceColor);
        drawKPICard(14 + kpiWidth + 4, startY, "Ticket Médio", pdfFmtBRL(metrics.avg_ticket), brandColor, surfaceColor);
        drawKPICard(14 + (kpiWidth + 4) * 2, startY, "Concluídos", metrics.completed_count, accentColor, surfaceColor);
        drawKPICard(14 + (kpiWidth + 4) * 3, startY, "Cancelados", metrics.canceled_client_count + metrics.canceled_user_count, warningColor, [254, 252, 232]);

        startY += 32;

        // --- 3. ESTILOS COMUNS PARA TABELAS ---
        const commonTableStyles = {
            theme: 'plain',
            headStyles: {
                fillColor: surfaceColor,
                textColor: textMuted,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: { top: 6, bottom: 6, left: 4, right: 4 }
            },
            bodyStyles: {
                fontSize: 9,
                textColor: textMain,
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }
            },
            margin: { left: 14, right: 14 },
            didParseCell: (data) => {
                // Linha fina separadora nas tabelas
                if (data.section === 'body' || data.section === 'head') {
                    data.cell.styles.lineWidth = { bottom: 0.1 };
                    data.cell.styles.lineColor = [226, 232, 240];
                }
            }
        };

        const renderSectionTitle = (title, iconText = "") => {
            if (startY > pageHeight - 40) {
                doc.addPage();
                startY = 20;
            }
            doc.setFontSize(14);
            doc.setTextColor(textMain[0], textMain[1], textMain[2]);
            doc.setFont("helvetica", "bold");
            doc.text(`${iconText} ${title}`, 14, startY);
            startY += 6;
        };

        // --- SEÇÕES DE DADOS ---

        // 1. Top Clients
        if (metrics.top_clients.length > 0) {
            renderSectionTitle(t('metrics.topClients', 'Clientes Mais Fiéis'), "⭐");

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY,
                head: [[t('metrics.position', 'Posição'), t('dropdown.client', 'Cliente'), t('metrics.totalAppointments', 'Atendimentos')]],
                body: metrics.top_clients.map((c, i) => [`#${i + 1}`, c.client_name, c.appointment_count]),
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: textMuted, cellWidth: 25 },
                    1: { fontStyle: 'bold', textColor: textMain },
                    2: { halign: 'center', textColor: brandColor, fontStyle: 'bold' }
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        // 2. Resumo de Receita Mensal
        if ((metrics.monthly_revenue || []).length > 0) {
            renderSectionTitle("Evolução Mensal da Receita", "📈");

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY,
                head: [['Mês de Referência', 'Receita Total']],
                body: metrics.monthly_revenue.map(m => [m.month, pdfFmtBRL(m.revenue)]),
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: textMain },
                    1: { halign: 'right', textColor: successColor, fontStyle: 'bold' }
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        // 3. Top Workplaces
        if (metrics.top_workplaces.length > 0) {
            renderSectionTitle(t('metrics.topWorkplacesTitlePdf', 'Locais com Maior Fluxo'), "🏢");

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY,
                head: [[t('metrics.position', 'Posição'), t('history.workplace', 'Local'), t('metrics.clientsCountTitle', 'Qtd. Clientes')]],
                body: metrics.top_workplaces.map((w, i) => [`#${i + 1}`, w.workplace_name, w.client_count]),
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: textMuted, cellWidth: 25 },
                    1: { fontStyle: 'bold', textColor: textMain },
                    2: { halign: 'center', fontStyle: 'bold' }
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        // 4. Longest Appointments
        if (metrics.longest_appointments.length > 0) {
            renderSectionTitle(t('metrics.longestAppointments', 'Atendimentos Mais Longos'), "⏱️");

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY,
                head: [[t('dropdown.client', 'Cliente'), t('metrics.duration', 'Duração'), t('history.date', 'Data')]],
                body: metrics.longest_appointments.map(a => [
                    a.client_name,
                    `${a.duration_minutes} min`,
                    new Date(a.date).toLocaleDateString(t('common.locale', 'pt-BR'))
                ]),
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: textMain },
                    1: { halign: 'center', textColor: warningColor, fontStyle: 'bold' },
                    2: { halign: 'right', textColor: textMuted }
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        // 5. Appointments by Day (Frequência da Semana)
        if (metrics.appointments_by_day.length > 0) {
            renderSectionTitle(t('metrics.weekFrequency', 'Frequência da Semana'), "📅");

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY,
                head: [[t('metrics.dayOfWeek', 'Dia da Semana'), t('metrics.totalAppointments', 'Volume de Atendimentos')]],
                body: metrics.appointments_by_day.map(d => [d.day_name, d.count]),
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: brandColor },
                    1: { halign: 'right' }
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        // 6. Appointments by Time (Picos de Horário)
        if (metrics.appointments_by_time.length > 0) {
            renderSectionTitle(t('metrics.timePeaks', 'Picos de Horário'), "🕐");

            autoTable(doc, {
                ...commonTableStyles,
                startY: startY,
                head: [[t('metrics.timeRange', 'Faixa Horária'), t('metrics.appointmentsQty', 'Agendamentos')]],
                body: metrics.appointments_by_time.map(t => [t.time_range, t.count]),
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: accentColor },
                    1: { halign: 'right' }
                }
            });
            startY = doc.lastAutoTable.finalY + 12;
        }

        // 7. Resumo Detalhado Operacional
        if (startY > pageHeight - 60) {
            doc.addPage();
            startY = 20;
        }

        renderSectionTitle(t('metrics.operationsSummary', 'Detalhamento Operacional'), "📋");

        autoTable(doc, {
            ...commonTableStyles,
            startY: startY,
            head: [[t('metrics.appointmentMetric', 'Status'), t('metrics.accumulatedTotal', 'Total')]],
            body: [
                [t('metrics.completedAppointments', 'Concluídos'), metrics.completed_count],
                [t('metrics.canceledByClient', 'Cancelados pelo Cliente'), metrics.canceled_client_count],
                [t('metrics.canceledByUser', 'Cancelados pelo Usuário'), metrics.canceled_user_count],
                [t('metrics.noShowAppointments', 'Não Compareceram'), metrics.no_show_count],
                [t('metrics.pendingAppointments', 'Pendentes'), metrics.pending_count],
                [t('metrics.rescheduledAppointments', 'Reagendamentos'), metrics.rescheduled_count]
            ],
            didParseCell: (data) => {
                if (data.section === 'body' || data.section === 'head') {
                    data.cell.styles.lineWidth = { bottom: 0.1 };
                    data.cell.styles.lineColor = [226, 232, 240];
                }
                if (data.section === 'body' && data.column.index === 0) {
                    const val = data.cell.raw;
                    if (val.includes('Concluído')) data.cell.styles.textColor = successColor;
                    if (val.includes('Cancelado')) data.cell.styles.textColor = dangerColor;
                    if (val.includes('Pendente')) data.cell.styles.textColor = warningColor;
                }
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right', fontStyle: 'bold', textColor: textMain }
            }
        });

        // --- RODAPÉ ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            doc.setFillColor(surfaceColor[0], surfaceColor[1], surfaceColor[2]);
            doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

            doc.setFontSize(8);
            doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            doc.text(
                t('metrics.confidentialFooter', 'Velo - Documento Confidencial - Página {{page}} de {{total}}', { page: i, total: pageCount }),
                pageWidth / 2,
                pageHeight - 6,
                { align: 'center' }
            );
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
            { [t('metrics.metric', 'Métrica')]: t('metrics.canceledByClient', 'Cancelados pelo Cliente'), [t('metrics.total', 'Total')]: metrics.canceled_client_count },
            { [t('metrics.metric', 'Métrica')]: t('metrics.canceledByUser', 'Cancelados pelo Usuário'), [t('metrics.total', 'Total')]: metrics.canceled_user_count },
            { [t('metrics.metric', 'Métrica')]: t('metrics.noShowAppointments', 'Não Compareceram'), [t('metrics.total', 'Total')]: metrics.no_show_count },
            { [t('metrics.metric', 'Métrica')]: t('metrics.completedAppointments', 'Concluídos'), [t('metrics.total', 'Total')]: metrics.completed_count },
            { [t('metrics.metric', 'Métrica')]: t('metrics.pendingAppointments', 'Pendentes'), [t('metrics.total', 'Total')]: metrics.pending_count },
            { [t('metrics.metric', 'Métrica')]: t('metrics.rescheduledAppointments', 'Reagendamentos'), [t('metrics.total', 'Total')]: metrics.rescheduled_count }
        ]);
        XLSX.utils.book_append_sheet(wb, wsResumo, t('metrics.summary', 'Resumo').substring(0, 31));

        // Sheet 6: Financeiro
        const xlFmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const finRows = [
            { 'Métrica': 'Receita Total', 'Valor': xlFmt(metrics.total_revenue) },
            { 'Métrica': 'Ticket Médio', 'Valor': xlFmt(metrics.avg_ticket) },
            { 'Métrica': 'Agendamentos com Preço', 'Valor': String(metrics.total_priced_appointments || 0) },
        ];
        if ((metrics.monthly_revenue || []).length > 0) {
            finRows.push({ 'Métrica': '', 'Valor': '' });
            finRows.push({ 'Métrica': '--- Receita Mensal ---', 'Valor': '' });
            metrics.monthly_revenue.forEach(m => finRows.push({ 'Métrica': m.month, 'Valor': xlFmt(m.revenue) }));
        }
        if ((metrics.top_clients_revenue || []).length > 0) {
            finRows.push({ 'Métrica': '', 'Valor': '' });
            finRows.push({ 'Métrica': '--- Top Clientes por Receita ---', 'Valor': '' });
            metrics.top_clients_revenue.forEach(c => finRows.push({ 'Métrica': c.client_name, 'Valor': xlFmt(c.total_revenue) }));
        }
        const wsFin = XLSX.utils.json_to_sheet(finRows);
        XLSX.utils.book_append_sheet(wb, wsFin, 'Financeiro');

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
    const maxMonthlyRevenue = Math.max(...(metrics.monthly_revenue || []).map(m => m.revenue), 1);

    const fmtBRL = (v) => {
        if (v == null) return 'R$ 0,00';
        return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h3 className="text-xl font-bold text-surface-50 mb-1">{t('metrics.aiAssistantTitle', 'Assistente Velo IA')}</h3>
                                                    <p className="text-sm text-brand-400">{t('metrics.aiAssistantSubtitle', 'Análise inteligente em tempo real')}</p>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={fetchAiInsight}
                                                    disabled={loadingInsight}
                                                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shrink-0 ${aiInsight
                                                        ? 'border border-white/10 bg-white/5 text-surface-200/70 hover:bg-brand-500/20 hover:text-brand-400 hover:border-brand-500/30'
                                                        : 'gradient-brand text-white shadow-lg shadow-brand-600/25'
                                                        } disabled:opacity-60`}
                                                >
                                                    {loadingInsight ? (
                                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    ) : aiInsight ? (
                                                        <HiOutlineRefresh size={16} />
                                                    ) : (
                                                        <HiSparkles size={16} />
                                                    )}
                                                    {aiInsight
                                                        ? t('metrics.regenerateReport', 'Regenerar Relatório')
                                                        : t('metrics.generateReport', 'Gerar Relatório')
                                                    }
                                                </motion.button>
                                            </div>

                                            {loadingInsight ? (
                                                <div className="space-y-4 mt-2">
                                                    <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
                                                    <div className="h-4 bg-white/10 rounded w-full animate-pulse"></div>
                                                    <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse"></div>
                                                    <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse mt-4"></div>
                                                </div>
                                            ) : aiInsight ? (
                                                <div className="mt-2 leading-relaxed max-w-4xl">
                                                    {renderMarkdown(aiInsight)}
                                                </div>
                                            ) : (
                                                <div className="mt-4 flex flex-col items-center justify-center py-10 text-center">
                                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 border border-brand-500/20">
                                                        <HiSparkles className="text-brand-400" size={28} />
                                                    </div>
                                                    <p className="text-sm text-surface-200/50 max-w-xs">
                                                        {t('metrics.aiEmptyState', 'Clique no botão acima para gerar uma análise inteligente das suas métricas.')}
                                                    </p>
                                                </div>
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

                {/* Seção Financeira */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <HiOutlineCurrencyDollar size={22} />
                        </div>
                        <h2 className="text-xl font-bold text-surface-50">{t('metrics.financialTitle', 'Financeiro')}</h2>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-3 mb-6">
                        {/* Receita Total */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass rounded-2xl p-6 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors"></div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <HiOutlineCurrencyDollar size={22} />
                                </div>
                                <span className="text-sm text-surface-200/60">{t('metrics.totalRevenue', 'Receita Total')}</span>
                            </div>
                            <div className="text-2xl font-bold text-surface-50">{fmtBRL(metrics.total_revenue)}</div>
                        </motion.div>

                        {/* Ticket Médio */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="glass rounded-2xl p-6 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand-500/10 transition-colors"></div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                                    <HiOutlineTrendingUp size={22} />
                                </div>
                                <span className="text-sm text-surface-200/60">{t('metrics.avgTicket', 'Ticket Médio')}</span>
                            </div>
                            <div className="text-2xl font-bold text-surface-50">{fmtBRL(metrics.avg_ticket)}</div>
                        </motion.div>

                        {/* Agendamentos com Preço */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass rounded-2xl p-6 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-accent-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-accent-500/10 transition-colors"></div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center">
                                    <HiOutlineChartBar size={22} />
                                </div>
                                <span className="text-sm text-surface-200/60">{t('metrics.pricedAppointments', 'Agendamentos com Preço')}</span>
                            </div>
                            <div className="text-2xl font-bold text-surface-50">{metrics.total_priced_appointments || 0}</div>
                        </motion.div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Receita Mensal */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.85 }} className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-surface-50 mb-6">{t('metrics.monthlyRevenue', 'Receita Mensal')}</h3>
                            <div className="space-y-4">
                                {(metrics.monthly_revenue || []).map((m, idx) => {
                                    const widthPercentage = m.revenue === 0 ? 0 : (m.revenue / maxMonthlyRevenue) * 100;
                                    return (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-16 text-xs text-surface-200/60 font-medium text-right font-mono">
                                                {m.month}
                                            </div>
                                            <div className="flex-1 h-8 bg-surface-900/50 rounded-lg border border-white/5 overflow-hidden relative flex items-center">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(2, widthPercentage)}%` }}
                                                    transition={{ duration: 1, delay: 0.9 + (idx * 0.1), ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-emerald-600/60 to-emerald-400 border-r border-white/20 absolute left-0 top-0"
                                                    style={{ opacity: m.revenue === 0 ? 0 : 1 }}
                                                />
                                                {m.revenue > 0 && (
                                                    <span className="absolute left-3 text-xs font-bold text-white drop-shadow-md z-10">
                                                        {fmtBRL(m.revenue)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Top Clientes por Receita */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                                    <HiOutlineUsers size={20} />
                                </div>
                                <h3 className="text-lg font-semibold text-surface-50">{t('metrics.topRevenueClients', 'Top Clientes por Receita')}</h3>
                            </div>
                            {(metrics.top_clients_revenue || []).length > 0 ? (
                                <ul className="space-y-4">
                                    {metrics.top_clients_revenue.map((client, idx) => (
                                        <li key={idx} className="flex flex-col gap-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-sm font-bold text-emerald-400 w-4">{idx + 1}º</div>
                                                    <span className="text-surface-100 text-sm font-medium">{client.client_name}</span>
                                                </div>
                                                <div className="text-sm font-semibold text-emerald-400">
                                                    {fmtBRL(client.total_revenue)}
                                                </div>
                                            </div>
                                            <div className="ml-7 text-xs text-surface-200/40">
                                                {client.appointment_count} {t('metrics.appointmentsCount', 'atendimentos')}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-sm text-surface-200/40 text-center py-6">{t('metrics.noFinancialData', 'Nenhum dado financeiro encontrado. Adicione preços aos seus agendamentos.')}</div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Status Distribution Chart */}
                {(() => {
                    const statusData = [
                        { key: 'completed', label: t('metrics.completedAppointments', 'Concluídos'), count: metrics.completed_count, color: '#10b981', bgClass: 'bg-emerald-500' },
                        { key: 'pending', label: t('metrics.pendingAppointments', 'Pendentes'), count: metrics.pending_count, color: '#f59e0b', bgClass: 'bg-amber-500' },
                        { key: 'canceled', label: t('metrics.canceledAppointments', 'Cancelados'), count: metrics.canceled_client_count + metrics.canceled_user_count, color: '#ef4444', bgClass: 'bg-red-500' },
                        { key: 'no_show', label: t('metrics.noShowAppointments', 'Não Compareceram'), count: metrics.no_show_count, color: '#6b7280', bgClass: 'bg-gray-500' },
                        { key: 'canceled_client', label: t('metrics.canceledByClient', 'Canc. pelo Cliente'), count: metrics.canceled_client_count, color: '#1a1a1a', bgClass: 'bg-black' },
                    ].filter(s => s.count > 0);

                    const total = statusData.reduce((sum, s) => sum + s.count, 0);

                    if (total === 0) return null;

                    // SVG donut chart calculations
                    const radius = 80;
                    const circumference = 2 * Math.PI * radius;
                    let cumulativeOffset = 0;

                    const segments = statusData.map((s) => {
                        const pct = s.count / total;
                        const dashLength = pct * circumference;
                        const offset = cumulativeOffset;
                        cumulativeOffset += dashLength;
                        return { ...s, pct, dashLength, offset };
                    });

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                            className="glass rounded-2xl p-6 mt-6"
                        >
                            <h3 className="text-lg font-semibold text-surface-50 mb-6 flex items-center gap-2">
                                <HiOutlineChartBar size={20} className="text-brand-400" />
                                {t('metrics.statusDistribution', 'Distribuição de Status')}
                            </h3>

                            <div className="flex flex-col md:flex-row items-center gap-8">
                                {/* Donut Chart */}
                                <div className="relative shrink-0">
                                    <svg width="200" height="200" viewBox="0 0 200 200">
                                        {segments.map((seg, i) => (
                                            <motion.circle
                                                key={seg.key}
                                                cx="100" cy="100" r={radius}
                                                fill="none"
                                                stroke={seg.color}
                                                strokeWidth="24"
                                                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                                                strokeDashoffset={-seg.offset}
                                                strokeLinecap="round"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
                                                className="cursor-pointer hover:brightness-125 transition-all"
                                                style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }}
                                                onMouseEnter={() => setActiveSlice(seg.key)}
                                                onMouseLeave={() => setActiveSlice(null)}
                                            />
                                        ))}
                                    </svg>
                                    {/* Center text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-surface-50">{total}</span>
                                        <span className="text-xs text-surface-200/50">total</span>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                    {segments.map((seg) => (
                                        <motion.div
                                            key={seg.key}
                                            className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${activeSlice === seg.key
                                                ? 'bg-white/10 border-white/20 scale-[1.02]'
                                                : 'bg-white/[0.02] border-white/5'
                                                }`}
                                            onMouseEnter={() => setActiveSlice(seg.key)}
                                            onMouseLeave={() => setActiveSlice(null)}
                                        >
                                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-surface-200/60 truncate">{seg.label}</div>
                                                <div className="text-sm font-bold text-surface-50">{seg.count}</div>
                                            </div>
                                            <div className="text-xs font-semibold text-surface-200/40">
                                                {(seg.pct * 100).toFixed(0)}%
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}


            </main>
        </div>
    );
}
