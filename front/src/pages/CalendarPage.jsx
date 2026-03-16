import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineOfficeBuilding,
    HiOutlinePlus,
    HiOutlineClock,
    HiOutlineUser,
    HiOutlineX,
    HiOutlinePencil,
    HiOutlineBan,
    HiOutlineExclamation,
    HiOutlineBell,
    HiOutlineSearch,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineCalendar,
    HiOutlineFilter,
    HiOutlineCheckCircle,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { requestPushPermission, unsubscribePush, isPushEnabled } from '../services/pushNotifications';
import HeaderNav from '../components/HeaderNav';
import SearchableClientSelect from '../components/SearchableClientSelect';
import CompleteAppointmentModal from '../components/CompleteAppointmentModal';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_MAP = {
    scheduled: { bg: 'bg-brand-500/20', text: 'text-brand-300', border: 'border-brand-500/30', label: 'Agendado', dot: 'bg-brand-400' },
    confirmed: { bg: 'bg-emerald-400/20', text: 'text-emerald-400', border: 'border-emerald-400/30', label: 'Confirmado', dot: 'bg-emerald-400' },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Concluído', dot: 'bg-emerald-400' },
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', label: 'Pendente', dot: 'bg-amber-400' },
    canceled_client: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', label: 'Canc. pelo Cliente', dot: 'bg-red-400' },
    canceled_user: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', label: 'Cancelado', dot: 'bg-red-400' },
    no_show: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30', label: 'Não Compareceu', dot: 'bg-gray-400' },
};

const TERMINAL_STATUSES = ['canceled_client', 'canceled_user', 'no_show', 'completed'];

function fmtTime(t) { return t ? t.substring(0, 5) : ''; }
function pad(n) { return String(n).padStart(2, '0'); }
function dKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fmtPrice(v) {
    if (v == null || v === '' || v === 0) return null;
    return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/*  Confirm Cancel Dialog                                              */
/* ------------------------------------------------------------------ */
function ConfirmCancelDialog({ isOpen, onClose, onConfirm, loading, appointment }) {
    const { t } = useTranslation();
    const [cancelAllFuture, setCancelAllFuture] = useState(false);

    useEffect(() => {
        if (isOpen) setCancelAllFuture(false);
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative z-10 w-full max-w-sm rounded-2xl glass-strong p-6 shadow-2xl"
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20 mx-auto">
                            <HiOutlineExclamation className="text-red-400" size={24} />
                        </div>
                        <h3 className="text-center text-lg font-semibold text-surface-50 mb-2">{t('calendar.modals.cancel.title', 'Cancelar agendamento?')}</h3>
                        <p className="text-center text-sm text-surface-200/60 mb-4">{t('calendar.modals.cancel.description', 'Essa ação não pode ser desfeita.')}</p>

                        {appointment?.recurrence_id && (
                            <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="radio" name="cancelType" checked={!cancelAllFuture}
                                        onChange={() => setCancelAllFuture(false)}
                                        className="mt-0.5 text-brand-500 rounded-full bg-white/10 border-white/20 focus:ring-brand-500/30" />
                                    <span className="text-sm text-surface-50">{t('calendar.modals.cancel.cancelThis', 'Cancelar apenas este atendimento')}</span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="radio" name="cancelType" checked={cancelAllFuture}
                                        onChange={() => setCancelAllFuture(true)}
                                        className="mt-0.5 text-brand-500 rounded-full bg-white/10 border-white/20 focus:ring-brand-500/30" />
                                    <span className="text-sm text-surface-50">{t('calendar.modals.cancel.cancelAllFuture', 'Cancelar este e todos os atendimentos futuros desta recorrência')}</span>
                                </label>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={onClose}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-surface-200/70 hover:bg-white/10 transition-all">
                                {t('calendar.modals.cancel.back', 'Voltar')}
                            </button>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => onConfirm(cancelAllFuture)} disabled={loading}
                                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-60 flex items-center justify-center">
                                {loading ? (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : t('calendar.modals.cancel.confirm', 'Cancelar')}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Notifications Modal                                                 */
/* ------------------------------------------------------------------ */
function ToggleSwitch({ checked, onChange, disabled }) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-brand-500' : 'bg-white/15'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'
                }`} />
        </button>
    );
}

function NotificationsModal({ isOpen, onClose, onSaved }) {
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState({ notify_30_min_before: false, notify_1_day_before: false, notify_2_days_before: false });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/notifications/preferences')
                .then(({ data }) => setPrefs(data))
                .catch(() => { })
                .finally(() => setLoading(false));
            setPushEnabled(isPushEnabled());
        }
    }, [isOpen]);

    const handlePushToggle = async () => {
        setPushLoading(true);
        try {
            if (pushEnabled) {
                await unsubscribePush();
                setPushEnabled(false);
            } else {
                const token = await requestPushPermission();
                setPushEnabled(!!token);
            }
        } catch { /* silent */ }
        finally { setPushLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await api.put('/notifications/preferences', prefs);
            setPrefs(data);
            onSaved();
            onClose();
        } catch (err) {
            console.error('Erro ao salvar preferências:', err);
        } finally { setSaving(false); }
    };

    const toggleOptions = [
        { key: 'notify_30_min_before', label: t('calendar.notifications.30min', '30 minutos antes'), icon: '⏰', desc: t('calendar.notifications.30minDesc', 'Receba um lembrete 30 minutos antes de cada agendamento') },
        { key: 'notify_1_day_before', label: t('calendar.notifications.1day', '1 dia antes'), icon: '📅', desc: t('calendar.notifications.1dayDesc', 'Receba um lembrete no dia anterior ao agendamento') },
        { key: 'notify_2_days_before', label: t('calendar.notifications.2days', '2 dias antes'), icon: '📆', desc: t('calendar.notifications.2daysDesc', 'Receba um lembrete 2 dias antes do agendamento') },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 bg-surface-950/80 backdrop-blur-xl px-6 py-4 rounded-t-3xl">
                            <h2 className="text-lg font-semibold text-gradient flex items-center gap-2">
                                <HiOutlineBell size={20} />
                                {t('calendar.notifications.title', 'Notificações')}
                            </h2>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
                                <p className="text-sm text-surface-200/70 leading-relaxed">
                                    {t('calendar.notifications.descriptionP1', '📧 Configure suas notificações de agendamento. Os lembretes serão enviados automaticamente para o ')}<strong className="text-surface-50">{t('calendar.notifications.descriptionP2', 'email cadastrado na sua conta')}</strong>.
                                </p>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <svg className="h-6 w-6 animate-spin text-brand-400" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {toggleOptions.map((opt) => (
                                        <motion.div key={opt.key}
                                            whileHover={{ scale: 1.01 }}
                                            className={`flex items-center justify-between rounded-xl border p-4 transition-all ${prefs[opt.key]
                                                ? 'border-brand-500/30 bg-brand-500/8'
                                                : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{opt.icon}</span>
                                                <div>
                                                    <p className="text-sm font-medium text-surface-50">{opt.label}</p>
                                                    <p className="text-xs text-surface-200/40 mt-0.5">{opt.desc}</p>
                                                </div>
                                            </div>
                                            <ToggleSwitch
                                                checked={prefs[opt.key]}
                                                onChange={(v) => setPrefs((p) => ({ ...p, [opt.key]: v }))}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Push Notifications Toggle */}
                            <div className="pt-3 border-t border-white/10">
                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    className={`flex items-center justify-between rounded-xl border p-4 transition-all ${pushEnabled
                                        ? 'border-brand-500/30 bg-brand-500/8'
                                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📲</span>
                                        <div>
                                            <p className="text-sm font-medium text-surface-50">{t('calendar.notifications.push', 'Push Notifications')}</p>
                                            <p className="text-xs text-surface-200/40 mt-0.5">{t('calendar.notifications.pushDesc', 'Receba alertas mesmo com o navegador fechado')}</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        checked={pushEnabled}
                                        onChange={handlePushToggle}
                                        disabled={pushLoading}
                                    />
                                </motion.div>
                            </div>

                            <motion.button onClick={handleSave} disabled={saving || loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 flex items-center justify-center gap-2">
                                {saving ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : t('calendar.notifications.save', 'Salvar configurações')}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Edit Appointment Modal                                             */
/* ------------------------------------------------------------------ */
function EditAppointmentModal({ isOpen, onClose, onUpdated, appointment, workplaces, setToast }) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [form, setForm] = useState({ workplace_id: '', client_id: '', date: '', start_time: '', end_time: '', price: '' });
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('weekly');
    const [recurrenceValue, setRecurrenceValue] = useState('1');

    const selectedWorkplace = useMemo(() => workplaces.find(w => String(w.id) === String(form.workplace_id)), [workplaces, form.workplace_id]);
    const allowedDays = useMemo(() => {
        if (!selectedWorkplace || !selectedWorkplace.work_days) return [];
        const daysStr = String(selectedWorkplace.work_days).replace(/[\[\]]/g, '');
        return daysStr.split(',').filter(d => d.trim() !== '').map(d => parseInt(d.trim()));
    }, [selectedWorkplace]);

    useEffect(() => {
        if (appointment && isOpen) {
            setForm({
                workplace_id: String(appointment.workplace_id),
                client_id: String(appointment.client_id),
                date: appointment.date,
                start_time: fmtTime(appointment.start_time),
                end_time: fmtTime(appointment.end_time),
                price: appointment.price != null ? formatCurrencyInput(appointment.price) : '',
            });
            setIsRecurring(!!appointment.is_recurring);
            setRecurrenceType(appointment.recurrence_type || 'weekly');
            setRecurrenceValue(appointment.recurrence_value || '1');
            setError('');
        }
    }, [appointment, isOpen]);

    // Auto-select recurrenceValue based on type
    useEffect(() => {
        if (!isRecurring) return;
        if (recurrenceType === 'monthly') {
            if (form.date && !recurrenceValue) {
                setRecurrenceValue(parseInt(form.date.split('-')[2]).toString());
            }
        } else if (allowedDays.length > 0) {
            if (form.date) {
                const [y, m, d] = form.date.split('-');
                const dayMatch = new Date(y, m - 1, d).getDay();
                if (allowedDays.includes(dayMatch) && !recurrenceValue) {
                    setRecurrenceValue(dayMatch.toString());
                }
            }
        }
    }, [recurrenceType, allowedDays, form.date, isRecurring]);

    useEffect(() => {
        if (!form.workplace_id) { setClients([]); return; }
        api.get(`/workplaces/${form.workplace_id}/clients`)
            .then(({ data }) => setClients(data))
            .catch(() => setClients([]));
    }, [form.workplace_id]);

    const update = (f, v) => setForm((s) => ({ ...s, [f]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.workplace_id || !form.client_id || !form.date || !form.start_time || !form.end_time) {
            setError(t('calendar.modals.edit.errorFields', 'Preencha todos os campos.'));
            return;
        }
        setLoading(true);
        try {
            const payload = {
                workplace_id: parseInt(form.workplace_id),
                client_id: parseInt(form.client_id),
                date: form.date,
                start_time: form.start_time,
                end_time: form.end_time,
                price: form.price ? parseCurrencyInput(form.price) : null,
                is_recurring: isRecurring,
                recurrence_type: isRecurring ? recurrenceType : null,
                recurrence_value: isRecurring ? recurrenceValue : null,
            };
            const { data } = await api.put(`/appointments/${appointment.id}`, payload);
            onUpdated(data);
            onClose();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || t('calendar.modals.edit.errorUpdate', 'Erro ao atualizar.');
            if (setToast) {
                setToast({ type: 'error', message: errorMsg });
                setTimeout(() => setToast(null), 4000);
            } else {
                setError(errorMsg);
            }
        } finally { setLoading(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 bg-surface-950/80 backdrop-blur-xl px-6 py-4 rounded-t-3xl">
                            <h2 className="text-lg font-semibold text-gradient">{t('calendar.modals.edit.title', 'Editar Agendamento')}</h2>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Workplace */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineOfficeBuilding size={16} className="text-surface-200/40" /> {t('calendar.modals.edit.workplace', 'Local *')}
                                </label>
                                <select value={form.workplace_id}
                                    onChange={(e) => { update('workplace_id', e.target.value); update('client_id', ''); }}
                                    disabled={user && !user.multiple_workplaces}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="" className="bg-surface-900">{t('calendar.modals.edit.select', 'Selecione')}</option>
                                    {workplaces.map((wp) => (
                                        <option key={wp.id} value={wp.id} className="bg-surface-900">{wp.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Client */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineUser size={16} className="text-surface-200/40" /> {t('calendar.modals.edit.client', 'Cliente *')}
                                </label>
                                <SearchableClientSelect
                                    value={form.client_id}
                                    onChange={(val) => update('client_id', val)}
                                    clients={clients}
                                    disabled={!form.workplace_id}
                                    placeholder={form.workplace_id ? t('calendar.modals.edit.selectClient', 'Selecione o cliente') : t('calendar.modals.edit.selectWorkplaceFirst', 'Selecione local primeiro')}
                                    emptyMessage={t('calendar.modals.edit.noClients', 'Nenhum cliente cadastrado neste local')}
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineClock size={16} className="text-surface-200/40" /> {t('calendar.modals.edit.date', 'Data *')}
                                </label>
                                <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                {form.date !== appointment?.date && (
                                    <p className="mt-1.5 text-xs text-amber-400/80">{t('calendar.modals.edit.dateWarning', '⚠ Mudar a data altera o status para "Reagendado"')}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 text-sm font-medium text-surface-200/70 block">{t('calendar.modals.edit.start', 'Início *')}</label>
                                    <input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                </div>
                                <div>
                                    <label className="mb-2 text-sm font-medium text-surface-200/70 block">{t('calendar.modals.edit.end', 'Fim *')}</label>
                                    <input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                </div>
                            </div>

                            {/* Preço */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    💰 {t('calendar.modals.edit.price', 'Preço estimado')}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-surface-200/40 font-medium">R$</span>
                                    <input type="text" value={form.price} onChange={(e) => update('price', formatCurrencyInput(e.target.value))}
                                        disabled={appointment?.status === 'confirmed'}
                                        placeholder="0,00"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed" />
                                </div>
                                {appointment?.status === 'confirmed' && (
                                    <p className="mt-1.5 text-xs text-amber-400/80">🔒 {t('calendar.modals.edit.priceLocked', 'O preço não pode ser alterado após confirmação do cliente.')}</p>
                                )}
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                                            <HiOutlineCalendar size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-surface-50">{t('calendar.modals.edit.recurring', 'Agendamento recorrente')}</h4>
                                            <p className="text-xs text-surface-200/60">{t('calendar.modals.edit.recurringDesc', 'Repetir este agendamento')}</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch checked={isRecurring} onChange={setIsRecurring} disabled={loading} />
                                </div>
                                <AnimatePresence>
                                    {isRecurring && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                                            <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-black/10 p-4">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-surface-200/70">{t('calendar.recurrence.frequency', 'Frequência')}</label>
                                                    <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}
                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-50 outline-none transition-all focus:border-brand-500">
                                                        <option value="weekly" className="bg-surface-900">{t('calendar.recurrence.week1', '1 Semana')}</option>
                                                        <option value="biweekly" className="bg-surface-900">{t('calendar.recurrence.week2', '2 Semanas')}</option>
                                                        <option value="triweekly" className="bg-surface-900">{t('calendar.recurrence.week3', '3 Semanas')}</option>
                                                        <option value="monthly" className="bg-surface-900">{t('calendar.recurrence.month1', '1 Mês')}</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-surface-200/70">
                                                        {recurrenceType === 'monthly' ? t('calendar.recurrence.everyDay', 'Todo dia') : t('calendar.recurrence.every', 'Toda')}
                                                    </label>
                                                    <select value={recurrenceValue} onChange={(e) => setRecurrenceValue(e.target.value)}
                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-50 outline-none transition-all focus:border-brand-500">
                                                        {recurrenceType === 'monthly' ? (
                                                            Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                                                <option key={d} value={d} className="bg-surface-900">{t('calendar.recurrence.day', 'Dia')} {d}</option>
                                                            ))
                                                        ) : (
                                                            (allowedDays.length > 0 ? allowedDays : [1, 2, 3, 4, 5]).map((d) => {
                                                                const dayNames = { 0: t('calendar.daysLong.0', 'Domingo'), 1: t('calendar.daysLong.1', 'Segunda'), 2: t('calendar.daysLong.2', 'Terça'), 3: t('calendar.daysLong.3', 'Quarta'), 4: t('calendar.daysLong.4', 'Quinta'), 5: t('calendar.daysLong.5', 'Sexta'), 6: t('calendar.daysLong.6', 'Sábado') };
                                                                return <option key={d} value={d} className="bg-surface-900">{dayNames[d] || `${t('calendar.recurrence.day', 'Dia')} ${d}`}</option>
                                                            })
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 flex items-center justify-center gap-2">
                                {loading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : t('calendar.modals.edit.save', 'Salvar alterações')}
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Create Appointment Modal                                           */
/* ------------------------------------------------------------------ */
function CreateAppointmentModal({ isOpen, onClose, onCreated, workplaces, selectedDate, setToast }) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [form, setForm] = useState({ workplace_id: '', client_id: '', date: '', start_time: '09:00', end_time: '10:00', price: '' });
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('weekly');
    const [recurrenceValue, setRecurrenceValue] = useState('1');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const selectedWorkplace = useMemo(() => workplaces.find(w => String(w.id) === String(form.workplace_id)), [workplaces, form.workplace_id]);
    const allowedDays = useMemo(() => {
        if (!selectedWorkplace || !selectedWorkplace.work_days) return [];
        const daysStr = String(selectedWorkplace.work_days).replace(/[\[\]]/g, '');
        return daysStr.split(',').filter(d => d.trim() !== '').map(d => parseInt(d.trim()));
    }, [selectedWorkplace]);

    // Auto-select recurrenceValue based on type
    useEffect(() => {
        if (recurrenceType === 'monthly') {
            setRecurrenceValue(form.date ? parseInt(form.date.split('-')[2]).toString() : '1');
        } else if (allowedDays.length > 0) {
            // Try to match selected date's weekday, otherwise fallback to first allowed day
            if (form.date) {
                const [y, m, d] = form.date.split('-');
                const dayMatch = new Date(y, m - 1, d).getDay(); // JS 0-6
                if (allowedDays.includes(dayMatch)) {
                    setRecurrenceValue(dayMatch.toString());
                    return;
                }
            }
            setRecurrenceValue(allowedDays[0].toString());
        }
    }, [recurrenceType, allowedDays, form.date]);

    useEffect(() => {
        if (isOpen && selectedDate) {
            setForm((f) => ({ ...f, date: dKey(selectedDate) }));
        }
        
        // Auto-select workplace logic
        if (isOpen && workplaces.length > 0) {
            const shouldAutoSelect = user && !user.multiple_workplaces;
            if (shouldAutoSelect || workplaces.length === 1) {
                setForm((f) => ({ ...f, workplace_id: String(workplaces[0].id) }));
            }
        }
        
        setError('');
    }, [isOpen, selectedDate, workplaces, user]);

    useEffect(() => {
        if (!form.workplace_id) { setClients([]); return; }
        api.get(`/workplaces/${form.workplace_id}/clients`)
            .then(({ data }) => setClients(data))
            .catch(() => setClients([]));
    }, [form.workplace_id]);

    const update = (f, v) => setForm((s) => ({ ...s, [f]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.workplace_id || !form.client_id || !form.date || !form.start_time || !form.end_time) {
            setError(t('calendar.modals.create.errorFields', 'Preencha todos os campos obrigatórios.'));
            return;
        }
        setLoading(true);
        try {
            const payload = {
                workplace_id: parseInt(form.workplace_id),
                client_id: parseInt(form.client_id),
                date: form.date,
                start_time: form.start_time,
                end_time: form.end_time,
                price: form.price ? parseCurrencyInput(form.price) : null,
                is_recurring: isRecurring,
                recurrence_type: isRecurring ? recurrenceType : null,
                recurrence_value: isRecurring ? recurrenceValue : null,
            };
            const { data } = await api.post('/appointments/', payload);
            onCreated(data);
            onClose();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || t('calendar.modals.create.errorCreate', 'Erro ao criar agendamento.');
            if (setToast) {
                setToast({ type: 'error', message: errorMsg });
                setTimeout(() => setToast(null), 4000);
            } else {
                setError(errorMsg);
            }
        } finally { setLoading(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 bg-surface-950/80 backdrop-blur-xl px-6 py-4 rounded-t-3xl">
                            <h2 className="text-lg font-semibold text-gradient">{t('calendar.modals.create.title', 'Novo Agendamento')}</h2>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineOfficeBuilding size={16} className="text-surface-200/40" /> {t('calendar.modals.create.workplace', 'Local *')}
                                </label>
                                <select value={form.workplace_id}
                                    onChange={(e) => { update('workplace_id', e.target.value); update('client_id', ''); }}
                                    disabled={user && !user.multiple_workplaces && form.workplace_id}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="" className="bg-surface-900">{t('calendar.modals.create.selectWorkplace', 'Selecione o local')}</option>
                                    {workplaces.map((wp) => (
                                        <option key={wp.id} value={wp.id} className="bg-surface-900">{wp.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineUser size={16} className="text-surface-200/40" /> {t('calendar.modals.create.client', 'Cliente *')}
                                </label>
                                <SearchableClientSelect
                                    value={form.client_id}
                                    onChange={(val) => update('client_id', val)}
                                    clients={clients}
                                    disabled={!form.workplace_id}
                                    placeholder={form.workplace_id ? t('calendar.modals.create.selectClient', 'Selecione o cliente') : t('calendar.modals.create.selectWorkplaceFirst', 'Selecione um local primeiro')}
                                    emptyMessage={t('calendar.modals.create.noClients', 'Nenhum cliente neste local')}
                                />
                            </div>

                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineClock size={16} className="text-surface-200/40" /> {t('calendar.modals.create.date', 'Data *')}
                                </label>
                                <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 text-sm font-medium text-surface-200/70 block">{t('calendar.modals.create.start', 'Início *')}</label>
                                    <input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                </div>
                                <div>
                                    <label className="mb-2 text-sm font-medium text-surface-200/70 block">{t('calendar.modals.create.end', 'Fim *')}</label>
                                    <input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                </div>
                            </div>

                            {/* Preço */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    💰 {t('calendar.modals.create.price', 'Preço estimado')}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-surface-200/40 font-medium">R$</span>
                                    <input type="text" value={form.price} onChange={(e) => update('price', formatCurrencyInput(e.target.value))}
                                        placeholder="0,00"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
                                            <HiOutlineCalendar size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-surface-50">{t('calendar.modals.create.recurring', 'Cliente recorrente')}</h4>
                                            <p className="text-xs text-surface-200/60">{t('calendar.modals.create.recurringDesc', 'Repete este agendamento')}</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch checked={isRecurring} onChange={setIsRecurring} disabled={loading} />
                                </div>
                                <AnimatePresence>
                                    {isRecurring && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                                            <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-black/10 p-4">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-surface-200/70">{t('calendar.recurrence.frequency', 'Frequência')}</label>
                                                    <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}
                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-50 outline-none transition-all focus:border-brand-500">
                                                        <option value="weekly" className="bg-surface-900">{t('calendar.recurrence.week1', '1 Semana')}</option>
                                                        <option value="biweekly" className="bg-surface-900">{t('calendar.recurrence.week2', '2 Semanas')}</option>
                                                        <option value="triweekly" className="bg-surface-900">{t('calendar.recurrence.week3', '3 Semanas')}</option>
                                                        <option value="monthly" className="bg-surface-900">{t('calendar.recurrence.month1', '1 Mês')}</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-medium text-surface-200/70">
                                                        {recurrenceType === 'monthly' ? t('calendar.recurrence.everyDay', 'Todo dia') : t('calendar.recurrence.every', 'Toda')}
                                                    </label>
                                                    <select value={recurrenceValue} onChange={(e) => setRecurrenceValue(e.target.value)}
                                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-surface-50 outline-none transition-all focus:border-brand-500">
                                                        {recurrenceType === 'monthly' ? (
                                                            Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                                                <option key={d} value={d} className="bg-surface-900">{t('calendar.recurrence.day', 'Dia')} {d}</option>
                                                            ))
                                                        ) : (
                                                            (allowedDays.length > 0 ? allowedDays : [1, 2, 3, 4, 5]).map((d) => {
                                                                const dayNames = { 0: t('calendar.daysLong.0', 'Domingo'), 1: t('calendar.daysLong.1', 'Segunda'), 2: t('calendar.daysLong.2', 'Terça'), 3: t('calendar.daysLong.3', 'Quarta'), 4: t('calendar.daysLong.4', 'Quinta'), 5: t('calendar.daysLong.5', 'Sexta'), 6: t('calendar.daysLong.6', 'Sábado') };
                                                                return <option key={d} value={d} className="bg-surface-900">{dayNames[d] || `${t('calendar.recurrence.day', 'Dia')} ${d}`}</option>
                                                            })
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[11px] text-surface-200/50 mt-1">{t('calendar.modals.create.recurringNote', 'Serão criados agendamentos para os próximos 2 meses.')}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 flex items-center justify-center gap-2">
                                {loading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : t('calendar.modals.create.submit', 'Criar agendamento')}
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Day Panel (sidebar / mobile section)                               */
/* ------------------------------------------------------------------ */
function DayPanel({ date, appointments, onClose, workplaceMap, onEdit, onCancel, onComplete, isMobile }) {
    const { t } = useTranslation();
    const dayAppts = appointments.filter((a) => a.date === dKey(date));
    const label = `${pad(date.getDate())} de ${t(`calendar.months.${date.getMonth()}`)}`;

    const Wrapper = isMobile ? 'div' : motion.div;
    const wrapperProps = isMobile ? {} : {
        initial: { opacity: 0, x: 30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 30 },
    };

    return (
        <Wrapper {...wrapperProps} className="glass rounded-2xl p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-surface-50">{label}</h3>
                {!isMobile && (
                    <button onClick={onClose} className="rounded-lg p-1.5 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                        <HiOutlineX size={16} />
                    </button>
                )}
            </div>

            {dayAppts.length === 0 ? (
                <p className="text-sm text-surface-200/40 text-center py-6">{t('calendar.dayPanel.empty', 'Nenhum agendamento neste dia')}</p>
            ) : (
                <div className="space-y-3">
                    {dayAppts.map((a) => {
                        const st = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
                        const isTerminal = TERMINAL_STATUSES.includes(a.status);
                        return (
                            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                className={`rounded-xl border ${st.border} ${st.bg} p-3.5`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-surface-200/50">
                                        {fmtTime(a.start_time)} – {fmtTime(a.end_time)}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {a.rescheduled && (
                                            <span className="text-[10px] font-semibold text-amber-300 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                                                ↻ Reagendado
                                            </span>
                                        )}
                                        <span className={`text-xs font-semibold ${st.text} px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-surface-50">
                                    {a.client_name || `${t('calendar.dayPanel.client', 'Cliente')} #${a.client_id}`}
                                </p>
                                <p className="text-sm font-medium text-surface-200/70 mt-0.5">
                                    {workplaceMap[a.workplace_id] || `${t('calendar.dayPanel.workplace', 'Local')} #${a.workplace_id}`}
                                </p>
                                {fmtPrice(a.price) && (
                                    <p className="text-sm font-semibold text-emerald-400 mt-1">
                                        {fmtPrice(a.price)}
                                    </p>
                                )}

                                {/* Action buttons - only for active statuses */}
                                {!isTerminal && (
                                    <div className="flex gap-2 mt-3 pt-2.5 border-t border-white/5">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onEdit(a)}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-surface-200/70 hover:bg-brand-600/15 hover:text-brand-300 hover:border-brand-500/30 transition-all"
                                        >
                                            <HiOutlinePencil size={13} />
                                            {t('calendar.dayPanel.edit', 'Editar')}
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onComplete(a)}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
                                        >
                                            <HiOutlineCheckCircle size={13} />
                                            {t('calendar.dayPanel.complete', 'Concluir')}
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => onCancel(a)}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-surface-200/70 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-all"
                                        >
                                            <HiOutlineBan size={13} />
                                            {t('calendar.dayPanel.cancel', 'Cancelar')}
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </Wrapper>
    );
}

/* ------------------------------------------------------------------ */
/*  Calendar Page                                                      */
/* ------------------------------------------------------------------ */
export default function CalendarPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const today = new Date();
    const todayKey = dKey(today);
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [appointments, setAppointments] = useState([]);
    const [workplaces, setWorkplaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [canceling, setCanceling] = useState(false);
    const [completeTarget, setCompleteTarget] = useState(null);
    const [completing, setCompleting] = useState(false);
    const [searchClient, setSearchClient] = useState('');
    const [filterWorkplace, setFilterWorkplace] = useState('');
    const [jumpDate, setJumpDate] = useState('');
    const [showLegend, setShowLegend] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [notifModalOpen, setNotifModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'

    const workplaceMap = useMemo(() => {
        const m = {};
        workplaces.forEach((wp) => { m[wp.id] = wp.name; });
        return m;
    }, [workplaces]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [apptRes, wpRes] = await Promise.all([
                    api.get('/appointments/'),
                    api.get('/workplaces/'),
                ]);
                setAppointments(apptRes.data);
                setWorkplaces(wpRes.data);
            } catch (err) {
                console.error('Erro:', err);
            } finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const handleCreated = (a) => {
        if (Array.isArray(a)) {
            setAppointments((p) => [...p, ...a]);
        } else {
            setAppointments((p) => [...p, a]);
        }
    };

    const handleUpdated = (updated) => {
        setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    };

    const handleCancel = async (cancelAllFuture = false) => {
        if (!cancelTarget) return;
        setCanceling(true);
        try {
            await api.patch(`/appointments/${cancelTarget.id}/cancel?cancel_all_future=${cancelAllFuture}`);
            const apptRes = await api.get('/appointments/');
            setAppointments(apptRes.data);
            setCancelTarget(null);
        } catch (err) {
            console.error('Erro ao cancelar:', err);
        } finally { setCanceling(false); }
    };

    const handleComplete = async (paymentData) => {
        if (!completeTarget) return;
        setCompleting(true);
        try {
            await api.patch(`/appointments/${completeTarget.id}/complete`, paymentData);
            const apptRes = await api.get('/appointments/');
            setAppointments(apptRes.data);
            setCompleteTarget(null);
        } catch (err) {
            console.error('Erro ao concluir:', err);
        } finally { setCompleting(false); }
    };

    // Calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) days.push(new Date(currentYear, currentMonth, i));
        return days;
    }, [currentMonth, currentYear]);

    // Week view helpers
    const getWeekStart = useCallback((d) => {
        const date = new Date(d);
        const day = date.getDay();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const currentViewDate = useMemo(() => {
        if (selectedDate) return selectedDate;
        return new Date(currentYear, currentMonth, 1);
    }, [selectedDate, currentYear, currentMonth]);

    const weekDays = useMemo(() => {
        const start = getWeekStart(currentViewDate);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [currentViewDate, getWeekStart]);

    // Hours for time grid
    const HOURS = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 6), []); // 06:00 – 22:00

    // Filtered appointments based on search + workplace filter
    const filteredAppointments = useMemo(() => {
        let filtered = appointments;
        if (filterWorkplace) {
            filtered = filtered.filter((a) => String(a.workplace_id) === filterWorkplace);
        }
        if (searchClient.trim()) {
            const q = searchClient.toLowerCase();
            filtered = filtered.filter((a) => {
                const name = a.client_name || `Cliente #${a.client_id}`;
                return name.toLowerCase().includes(q) || String(a.client_id).includes(q);
            });
        }
        return filtered;
    }, [appointments, filterWorkplace, searchClient]);

    const appointmentsByDate = useMemo(() => {
        const map = {};
        filteredAppointments.forEach((a) => {
            if (!map[a.date]) map[a.date] = [];
            map[a.date].push(a);
        });
        return map;
    }, [filteredAppointments]);

    const handleJumpDate = (val) => {
        setJumpDate(val);
        if (val) {
            const [y, m, d] = val.split('-').map(Number);
            setCurrentYear(y);
            setCurrentMonth(m - 1);
            setSelectedDate(new Date(y, m - 1, d));
        }
    };

    const prevPeriod = () => {
        if (viewMode === 'month') {
            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
            else setCurrentMonth((m) => m - 1);
        } else if (viewMode === 'week') {
            const d = new Date(currentViewDate);
            d.setDate(d.getDate() - 7);
            setSelectedDate(d);
            setCurrentMonth(d.getMonth());
            setCurrentYear(d.getFullYear());
        } else {
            const d = new Date(currentViewDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d);
            setCurrentMonth(d.getMonth());
            setCurrentYear(d.getFullYear());
        }
    };
    const nextPeriod = () => {
        if (viewMode === 'month') {
            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
            else setCurrentMonth((m) => m + 1);
        } else if (viewMode === 'week') {
            const d = new Date(currentViewDate);
            d.setDate(d.getDate() + 7);
            setSelectedDate(d);
            setCurrentMonth(d.getMonth());
            setCurrentYear(d.getFullYear());
        } else {
            const d = new Date(currentViewDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d);
            setCurrentMonth(d.getMonth());
            setCurrentYear(d.getFullYear());
        }
    };
    const goToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        setSelectedDate(today);
    };

    const getNavTitle = () => {
        if (viewMode === 'month') return `${t(`calendar.months.${currentMonth}`)} ${currentYear}`;
        if (viewMode === 'week') {
            const ws = weekDays[0];
            const we = weekDays[6];
            const sameMonth = ws.getMonth() === we.getMonth();
            if (sameMonth) return `${pad(ws.getDate())} – ${pad(we.getDate())} de ${t(`calendar.months.${ws.getMonth()}`)} ${ws.getFullYear()}`;
            return `${pad(ws.getDate())} ${t(`calendar.months.${ws.getMonth()}`).substring(0, 3)} – ${pad(we.getDate())} ${t(`calendar.months.${we.getMonth()}`).substring(0, 3)} ${we.getFullYear()}`;
        }
        return `${pad(currentViewDate.getDate())} de ${t(`calendar.months.${currentViewDate.getMonth()}`)} ${currentViewDate.getFullYear()}`;
    };

    const handleNotifSaved = () => {
        setToast({ type: 'success', message: t('calendar.toast.notifSuccess', 'Preferências de notificação salvas com sucesso!') });
        setTimeout(() => setToast(null), 5000);
    };

    /* -- Day Cell Color Logic ---------------------------------------- */
    const getDayCellClasses = (day) => {
        const key = dKey(day);
        const isToday = key === todayKey;
        const isSelected = selectedDate && key === dKey(selectedDate);
        const dayAppts = appointmentsByDate[key] || [];
        const hasAppts = dayAppts.length > 0;
        const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (isSelected) {
            return 'gradient-brand text-white shadow-lg shadow-brand-600/25 ring-2 ring-brand-400/30';
        }
        if (isToday) {
            return 'bg-brand-600/20 text-brand-200 border-2 border-brand-400/40 font-bold';
        }
        if (isPast && hasAppts) {
            // Past with appointments — muted violet
            return 'bg-violet-500/10 text-violet-300/60 border border-violet-500/15';
        }
        if (isPast) {
            // Past without appointments — dimmed
            return 'bg-white/[0.01] text-surface-200/25';
        }
        if (hasAppts) {
            // Future with appointments — brand highlight
            return 'bg-brand-500/12 text-brand-200 border border-brand-500/20';
        }
        // Future without appointments
        return 'bg-white/[0.02] text-surface-200/70 hover:bg-white/10 hover:text-surface-50';
    };

    return (
        <div className="min-h-screen gradient-bg">
            {/* Floating orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-600/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-accent-500/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navbar */}
            <HeaderNav />

            {/* Content */}
            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Calendar section */}
                    <div className="flex-1">
                        {/* View mode switcher + nav */}
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevPeriod}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-surface-200/60 hover:bg-white/10 hover:text-white transition-all">
                                    <HiOutlineChevronLeft size={18} />
                                </motion.button>
                                <h2 className="text-lg sm:text-xl font-bold text-surface-50 min-w-[180px] text-center">
                                    {getNavTitle()}
                                </h2>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextPeriod}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-surface-200/60 hover:bg-white/10 hover:text-white transition-all">
                                    <HiOutlineChevronRight size={18} />
                                </motion.button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* View mode pills */}
                                <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5">
                                    {[{ key: 'month', label: t('calendar.views.month', 'Mês') }, { key: 'week', label: t('calendar.views.week', 'Semana') }, { key: 'day', label: t('calendar.views.day', 'Dia') }].map((v) => (
                                        <button
                                            key={v.key}
                                            onClick={() => { setViewMode(v.key); if (v.key !== 'month' && !selectedDate) setSelectedDate(today); }}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === v.key
                                                ? 'gradient-brand text-white shadow-sm'
                                                : 'text-surface-200/60 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                </div>

                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={goToday}
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-surface-200/60 hover:bg-white/10 hover:text-white transition-all">
                                    Hoje
                                </motion.button>

                                {/* Agendar — hidden on mobile, only visible sm+ */}
                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={() => { setSelectedDate(selectedDate || today); setCreateOpen(true); }}
                                    className="hidden sm:flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/25"
                                >
                                    <HiOutlinePlus size={16} />
                                    Agendar
                                </motion.button>

                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={() => setNotifModalOpen(true)}
                                    className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-surface-200/70 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <HiOutlineBell size={16} />
                                    Notificações
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Search / Filter bar */}
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="mb-4 flex flex-col gap-3"
                        >
                            <div className="flex gap-2">
                                {/* Client search */}
                                <div className="relative flex-1">
                                    <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-200/40" size={16} />
                                    <input
                                        type="text"
                                        value={searchClient}
                                        onChange={(e) => setSearchClient(e.target.value)}
                                        placeholder="Buscar cliente..."
                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                                    />
                                </div>

                                {/* Toggle filters */}
                                <motion.button whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm transition-all ${showFilters || filterWorkplace || jumpDate
                                        ? 'border-brand-500/30 bg-brand-600/10 text-brand-400'
                                        : 'border-white/10 bg-white/5 text-surface-200/60 hover:bg-white/10'
                                        }`}
                                >
                                    <HiOutlineFilter size={16} />
                                    <span className="hidden sm:inline">Filtros</span>
                                </motion.button>
                            </div>

                            {/* Expanded filters */}
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            {/* Workplace filter */}
                                            <div className="flex-1">
                                                <select
                                                    value={filterWorkplace}
                                                    onChange={(e) => setFilterWorkplace(e.target.value)}
                                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                                >
                                                    <option value="" className="bg-surface-900">Todos os locais</option>
                                                    {workplaces.map((wp) => (
                                                        <option key={wp.id} value={wp.id} className="bg-surface-900">{wp.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Jump to date */}
                                            <div className="flex-1">
                                                <div className="relative">
                                                    <HiOutlineCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-200/40" size={16} />
                                                    <input
                                                        type="date"
                                                        value={jumpDate}
                                                        onChange={(e) => handleJumpDate(e.target.value)}
                                                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                                    />
                                                </div>
                                            </div>

                                            {/* Clear all */}
                                            {(filterWorkplace || jumpDate || searchClient) && (
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => { setFilterWorkplace(''); setJumpDate(''); setSearchClient(''); }}
                                                    className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-surface-200/60 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                                                >
                                                    Limpar
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Calendar grid — conditionally render month/week/day */}
                        {viewMode === 'month' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="glass rounded-2xl p-4 sm:p-5"
                            >
                                {/* Day headers */}
                                <div className="grid grid-cols-7 mb-2">
                                    {DAY_LABELS.map((d) => (
                                        <div key={d} className="py-2 text-center text-xs font-semibold text-surface-200/40 uppercase tracking-wider">{d}</div>
                                    ))}
                                </div>

                                {/* Day cells */}
                                {loading ? (
                                    <div className="grid grid-cols-7 gap-1">
                                        {[...Array(35)].map((_, i) => (
                                            <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-7 gap-1">
                                        {calendarDays.map((day, i) => {
                                            if (!day) return <div key={`blank-${i}`} className="aspect-square" />;

                                            const key = dKey(day);
                                            const dayAppts = appointmentsByDate[key] || [];
                                            const hasAppts = dayAppts.length > 0;
                                            const cellClasses = getDayCellClasses(day);
                                            const isSelected = selectedDate && key === dKey(selectedDate);

                                            return (
                                                <motion.button key={key}
                                                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                                                    onClick={() => setSelectedDate(day)}
                                                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${cellClasses}`}
                                                >
                                                    <span className="text-sm font-medium">{day.getDate()}</span>
                                                    {hasAppts && (
                                                        <div className="flex gap-0.5 mt-0.5">
                                                            {dayAppts.slice(0, 3).map((a, idx) => {
                                                                const st = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
                                                                return (
                                                                    <div key={idx}
                                                                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : st.dot}`}
                                                                    />
                                                                );
                                                            })}
                                                            {dayAppts.length > 3 && (
                                                                <span className={`text-[8px] ml-0.5 ${isSelected ? 'text-white/80' : 'text-surface-200/40'}`}>
                                                                    +{dayAppts.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* WEEK VIEW */}
                        {viewMode === 'week' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="glass rounded-2xl overflow-hidden"
                            >
                                {/* Week day headers */}
                                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/5">
                                    <div className="p-2" />
                                    {weekDays.map((wd) => {
                                        const key = dKey(wd);
                                        const isToday = key === todayKey;
                                        const isSel = selectedDate && key === dKey(selectedDate);
                                        return (
                                            <button key={key}
                                                onClick={() => setSelectedDate(wd)}
                                                className={`p-2 text-center transition-all cursor-pointer hover:bg-white/5 ${isSel ? 'bg-brand-500/15' : isToday ? 'bg-brand-500/8' : ''
                                                    }`}
                                            >
                                                <span className="text-[10px] font-semibold uppercase text-surface-200/40 block">{DAY_LABELS[wd.getDay()]}</span>
                                                <span className={`text-lg font-bold ${isToday ? 'text-brand-300' : isSel ? 'text-brand-200' : 'text-surface-50'}`}>{wd.getDate()}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Time grid */}
                                <div className="relative overflow-y-auto max-h-[600px] scrollbar-thin" style={{ scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                    {HOURS.map((hour) => (
                                        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.03] min-h-[52px]">
                                            <div className="p-1 pr-2 text-right">
                                                <span className="text-[10px] font-medium text-surface-200/30">{`${String(hour).padStart(2, '0')}:00`}</span>
                                            </div>
                                            {weekDays.map((wd) => {
                                                const key = dKey(wd);
                                                const dayAppts = (appointmentsByDate[key] || []).filter((a) => {
                                                    const h = parseInt(a.start_time?.substring(0, 2), 10);
                                                    return h === hour;
                                                });
                                                return (
                                                    <div key={`${key}-${hour}`}
                                                        onClick={() => setSelectedDate(wd)}
                                                        className="border-l border-white/[0.03] p-0.5 relative cursor-pointer hover:bg-white/[0.02] transition-colors min-h-[52px]">
                                                        {dayAppts.map((a) => {
                                                            const st = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
                                                            return (
                                                                <motion.div key={a.id}
                                                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                                                    onClick={(e) => { e.stopPropagation(); setEditTarget(a); }}
                                                                    className={`rounded-lg ${st.bg} ${st.border} border px-1.5 py-1 mb-0.5 cursor-pointer hover:brightness-125 transition-all`}
                                                                >
                                                                    <p className="text-[10px] font-semibold text-surface-50 truncate">{a.client_name || `#${a.client_id}`}</p>
                                                                    <p className="text-[9px] text-surface-200/50">{fmtTime(a.start_time)}–{fmtTime(a.end_time)}</p>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* DAY VIEW */}
                        {viewMode === 'day' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="glass rounded-2xl overflow-hidden"
                            >
                                {/* Day header */}
                                <div className="border-b border-white/5 p-4 text-center">
                                    <span className="text-xs font-semibold uppercase text-surface-200/40">{DAY_LABELS[currentViewDate.getDay()]}</span>
                                    <p className="text-2xl font-bold text-surface-50">{currentViewDate.getDate()}</p>
                                    <p className="text-xs text-surface-200/40">{t(`calendar.months.${currentViewDate.getMonth()}`)} {currentViewDate.getFullYear()}</p>
                                </div>

                                {/* Time slots */}
                                <div className="relative overflow-y-auto max-h-[600px]" style={{ scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                    {HOURS.map((hour) => {
                                        const key = dKey(currentViewDate);
                                        const hourAppts = (appointmentsByDate[key] || []).filter((a) => {
                                            const h = parseInt(a.start_time?.substring(0, 2), 10);
                                            return h === hour;
                                        });
                                        return (
                                            <div key={hour} className="flex border-b border-white/[0.03] min-h-[60px]">
                                                <div className="w-16 shrink-0 p-2 text-right">
                                                    <span className="text-xs font-medium text-surface-200/30">{`${String(hour).padStart(2, '0')}:00`}</span>
                                                </div>
                                                <div className="flex-1 border-l border-white/[0.03] p-1.5 space-y-1">
                                                    {hourAppts.map((a) => {
                                                        const st = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
                                                        const isTerminal = TERMINAL_STATUSES.includes(a.status);
                                                        return (
                                                            <motion.div key={a.id}
                                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                                className={`rounded-xl ${st.bg} ${st.border} border p-3 cursor-pointer hover:brightness-125 transition-all`}
                                                                onClick={() => setEditTarget(a)}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-medium text-surface-200/60">{fmtTime(a.start_time)} – {fmtTime(a.end_time)}</span>
                                                                    <span className={`text-[10px] font-semibold ${st.text} px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                                                                </div>
                                                                <p className="text-sm font-semibold text-surface-50">{a.client_name || `Cliente #${a.client_id}`}</p>
                                                                <p className="text-xs text-surface-200/50 mt-0.5">{workplaceMap[a.workplace_id] || `Local #${a.workplace_id}`}</p>
                                                                {fmtPrice(a.price) && (
                                                                    <p className="text-xs font-semibold text-emerald-400 mt-1">{fmtPrice(a.price)}</p>
                                                                )}
                                                                {!isTerminal && (
                                                                    <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setEditTarget(a); }}
                                                                            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[10px] font-medium text-surface-200/70 hover:bg-brand-600/15 hover:text-brand-300 transition-all"
                                                                        >
                                                                            <HiOutlinePencil size={11} /> Editar
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setCompleteTarget(a); }}
                                                                            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-1.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                                        >
                                                                            <HiOutlineCheckCircle size={11} /> Concluir
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setCancelTarget(a); }}
                                                                            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[10px] font-medium text-surface-200/70 hover:bg-red-500/15 hover:text-red-300 transition-all"
                                                                        >
                                                                            <HiOutlineBan size={11} /> Cancelar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        );
                                                    })}
                                                    {hourAppts.length === 0 && (
                                                        <div className="h-full min-h-[44px]" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Color legend with toggle — only for month view */}
                        {viewMode === 'month' && (
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <button
                                    onClick={() => setShowLegend(!showLegend)}
                                    className="flex items-center gap-1.5 text-xs text-surface-200/40 hover:text-surface-200/60 transition-colors"
                                >
                                    {showLegend ? <HiOutlineEyeOff size={14} /> : <HiOutlineEye size={14} />}
                                    {showLegend ? t('calendar.legend.hide', 'Ocultar legenda') : t('calendar.legend.show', 'Mostrar legenda')}
                                </button>
                                <AnimatePresence>
                                    {showLegend && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center text-xs text-surface-200/50">
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-400/50 border border-brand-400/60" /> {t('calendar.legend.today', 'Hoje')}</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500/30" /> {t('calendar.legend.futureAppt', 'Futuro c/ consulta')}</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-400/40" /> {t('calendar.legend.pastAppt', 'Passado c/ consulta')}</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-surface-200/15" /> {t('calendar.legend.pastNoAppt', 'Passado s/ consulta')}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Mobile day panel */}
                        <div className="mt-6 lg:hidden">
                            {selectedDate ? (
                                <DayPanel
                                    date={selectedDate}
                                    appointments={filteredAppointments}
                                    workplaceMap={workplaceMap}
                                    onEdit={setEditTarget}
                                    onCancel={setCancelTarget}
                                    onComplete={setCompleteTarget}
                                    isMobile
                                />
                            ) : (
                                <div className="glass rounded-2xl p-5 text-center">
                                    <p className="text-sm text-surface-200/40">{t('calendar.legend.tapDayMobile', 'Toque em um dia para ver os agendamentos')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar — desktop day panel */}
                    <div className="hidden lg:block w-80 shrink-0">
                        <AnimatePresence mode="wait">
                            {selectedDate && (
                                <DayPanel
                                    key={dKey(selectedDate)}
                                    date={selectedDate}
                                    appointments={filteredAppointments}
                                    onClose={() => setSelectedDate(null)}
                                    workplaceMap={workplaceMap}
                                    onEdit={setEditTarget}
                                    onCancel={setCancelTarget}
                                    onComplete={setCompleteTarget}
                                />
                            )}
                        </AnimatePresence>

                        {!selectedDate && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-5 text-center">
                                <HiOutlineClock className="mx-auto mb-3 text-surface-200/30" size={32} />
                                <p className="text-sm text-surface-200/50">{t('calendar.legend.tapDayDesktop', 'Selecione um dia no calendário para ver os agendamentos')}</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>

            {/* FAB mobile */}
            <motion.button
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.5 }}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => { setSelectedDate(selectedDate || today); setCreateOpen(true); }}
                className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-xl shadow-brand-600/30 sm:hidden"
            >
                <HiOutlinePlus className="text-white" size={24} />
            </motion.button>

            {/* Modals */}
            <CreateAppointmentModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
                workplaces={workplaces}
                selectedDate={selectedDate || today}
                setToast={setToast}
            />
            <EditAppointmentModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onUpdated={handleUpdated}
                appointment={editTarget}
                workplaces={workplaces}
                setToast={setToast}
            />
            <ConfirmCancelDialog
                isOpen={!!cancelTarget}
                onClose={() => setCancelTarget(null)}
                onConfirm={handleCancel}
                loading={canceling}
                appointment={cancelTarget}
            />
            <NotificationsModal
                isOpen={notifModalOpen}
                onClose={() => setNotifModalOpen(false)}
                onSaved={handleNotifSaved}
            />
            <CompleteAppointmentModal
                isOpen={!!completeTarget}
                onClose={() => setCompleteTarget(null)}
                onConfirm={handleComplete}
                loading={completing}
                appointment={completeTarget}
            />

            {/* Toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-6 left-1/2 z-[70] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-xl ${toast.type === 'success'
                            ? 'bg-emerald-500/90 text-white border border-emerald-400/30'
                            : 'bg-red-500/90 text-white border border-red-400/30'
                            }`}
                    >
                        <HiOutlineBell size={18} />
                        <span className="text-sm font-medium">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 rounded-lg p-1 hover:bg-white/20 transition-all">
                            <HiOutlineX size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
