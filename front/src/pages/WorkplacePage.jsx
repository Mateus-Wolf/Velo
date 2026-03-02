import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineUser,
    HiOutlinePhone,
    HiOutlineAnnotation,
    HiOutlineX,
    HiOutlineAdjustments,
    HiOutlineOfficeBuilding,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineExclamation,
    HiOutlineSortAscending,
    HiOutlineClipboardCopy,
    HiOutlineSwitchHorizontal,
    HiOutlineClipboardList,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ */
/*  Confirm Delete Dialog                                              */
/* ------------------------------------------------------------------ */
function ConfirmDeleteDialog({ isOpen, onClose, onConfirm, title, description, loading }) {
    const { t } = useTranslation();
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
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
                        <h3 className="text-center text-lg font-semibold text-surface-50 mb-2">{title}</h3>
                        <p className="text-center text-sm text-surface-200/60 mb-6">{description}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-surface-200/70 hover:bg-white/10 transition-all"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-60 flex items-center justify-center"
                            >
                                {loading ? (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : t('common.delete', 'Excluir')}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Client Card                                                        */
/* ------------------------------------------------------------------ */
function ClientCard({ client, index, onEdit, onDelete, onCopyMove, onHistory }) {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            onClick={() => onHistory(client)}
            className="glass group relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-shadow hover:shadow-lg hover:shadow-brand-600/10"
        >
            <div className="absolute top-0 left-0 h-0.5 w-full gradient-brand opacity-40 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/15 text-brand-400 border border-brand-500/20">
                    <HiOutlineUser size={20} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-surface-50 truncate">
                            {client.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* History */}
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); onHistory(client); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-sky-600/20 hover:text-sky-400 hover:border-sky-500/30 transition-all opacity-0 group-hover:opacity-100"
                                title={t('workplace.card.history', 'Ver histórico do cliente')}
                            >
                                <HiOutlineClipboardList size={12} />
                            </motion.button>

                            {/* Copy / Move */}
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); onCopyMove(client); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-violet-600/20 hover:text-violet-400 hover:border-violet-500/30 transition-all opacity-0 group-hover:opacity-100"
                                title={t('workplace.card.copyMove', 'Copiar / Mover para outro local')}
                            >
                                <HiOutlineClipboardCopy size={12} />
                            </motion.button>

                            {/* Edit */}
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-brand-600/20 hover:text-brand-400 hover:border-brand-500/30 transition-all opacity-0 group-hover:opacity-100"
                                title={t('workplace.card.edit', 'Editar cliente')}
                            >
                                <HiOutlinePencil size={12} />
                            </motion.button>

                            {/* Delete */}
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                                title={t('workplace.card.delete', 'Excluir cliente')}
                            >
                                <HiOutlineTrash size={12} />
                            </motion.button>

                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${client.is_active
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                    }`}
                            >
                                {client.is_active ? t('common.active', 'Ativo') : t('common.inactive', 'Inativo')}
                            </span>
                        </div>
                    </div>

                    {client.contact && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-surface-200/60">
                            <HiOutlinePhone size={13} className="text-brand-400/60 shrink-0" />
                            <span className="truncate">{client.contact}</span>
                        </div>
                    )}

                    {client.notes && (
                        <div className="mt-1 flex items-start gap-1.5 text-sm text-surface-200/45">
                            <HiOutlineAnnotation size={13} className="text-brand-400/50 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{client.notes}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Filter Panel                                                       */
/* ------------------------------------------------------------------ */
function FilterPanel({ isOpen, onClose, filters, onApply }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(filters.status);

    const handleApply = () => {
        onApply({ status });
        onClose();
    };

    const handleClear = () => {
        setStatus('all');
        onApply({ status: 'all' });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                        exit={{ opacity: 0, y: 30, scale: 0.96 }}
                        className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl shadow-brand-950/50"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gradient">{t('common.filters', 'Filtros')}</h3>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="mb-3 block text-sm font-medium text-surface-200/70">{t('workplace.filters.status', 'Status do cliente')}</label>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'all', label: t('common.all', 'Todos') },
                                        { value: 'active', label: t('common.actives', 'Ativos') },
                                        { value: 'inactive', label: t('common.inactives', 'Inativos') },
                                    ].map((opt) => (
                                        <motion.button
                                            key={opt.value}
                                            type="button"
                                            whileTap={{ scale: 0.94 }}
                                            onClick={() => setStatus(opt.value)}
                                            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${status === opt.value
                                                ? 'gradient-brand text-white shadow-lg shadow-brand-600/25'
                                                : 'bg-white/5 text-surface-200/60 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {opt.label}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-surface-200/70 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    {t('common.clear', 'Limpar')}
                                </button>
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleApply}
                                    className="flex-1 rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25"
                                >
                                    {t('common.apply', 'Aplicar')}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Create / Edit Client Modal                                         */
/* ------------------------------------------------------------------ */
function ClientModal({ isOpen, onClose, onCreated, onUpdated, workplaceId, client }) {
    const { t } = useTranslation();
    const isEditing = !!client;
    const [form, setForm] = useState({ name: '', email: '', contact: '', notes: '', is_active: true });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (client) {
            setForm({
                name: client.name || '',
                email: client.email || '',
                contact: client.contact || '',
                notes: client.notes || '',
                is_active: client.is_active !== false,
            });
        } else {
            setForm({ name: '', email: '', contact: '', notes: '', is_active: true });
        }
        setError('');
    }, [client, isOpen]);

    const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) {
            setError(t('workplace.modal.errorName', 'O nome do cliente é obrigatório.'));
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim() || null,
                contact: form.contact.trim() || null,
                notes: form.notes.trim() || null,
            };

            if (isEditing) {
                payload.is_active = form.is_active;
                const { data } = await api.put(`/clients/${client.id}`, payload);
                onUpdated?.(data);
            } else {
                const { data } = await api.post(`/workplaces/${workplaceId}/clients`, payload);
                onCreated?.(data);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || t('workplace.modal.errorSave', 'Erro ao salvar cliente.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong shadow-2xl shadow-brand-950/50"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 bg-surface-950/80 backdrop-blur-xl px-6 py-4 rounded-t-3xl">
                            <h2 className="text-lg font-semibold text-gradient">
                                {isEditing ? t('workplace.modal.editTitle', 'Editar Cliente') : t('workplace.modal.createTitle', 'Novo Cliente')}
                            </h2>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Name */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineUser size={16} className="text-surface-200/40" /> {t('workplace.modal.name', 'Nome *')}
                                </label>
                                <input
                                    value={form.name}
                                    onChange={(e) => update('name', e.target.value)}
                                    placeholder={t('workplace.modal.namePlaceholder', 'Nome do cliente')}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-surface-200/40">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                    {t('workplace.modal.email', 'E-mail')} <span className="text-surface-200/40 font-normal ml-1">{t('common.optional', '(Opcional)')}</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => update('email', e.target.value)}
                                    placeholder="email@exemplo.com"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                                />
                                <p className="mt-1 text-xs text-surface-200/40">{t('workplace.modal.emailHint', 'Se preenchido, enviaremos confirmação de agendamento por e-mail.')}</p>
                            </div>

                            {/* Contact */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlinePhone size={16} className="text-surface-200/40" /> {t('workplace.modal.contact', 'Contato')}
                                </label>
                                <input
                                    value={form.contact}
                                    onChange={(e) => update('contact', e.target.value)}
                                    placeholder={t('workplace.modal.contactPlaceholder', 'Telefone ou e-mail')}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineAnnotation size={16} className="text-surface-200/40" /> {t('workplace.modal.notes', 'Observações')}
                                </label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => update('notes', e.target.value)}
                                    placeholder={t('workplace.modal.notesPlaceholder', 'Notas adicionais...')}
                                    rows={3}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30 resize-none"
                                />
                            </div>

                            {/* Inactivate toggle — edit only */}
                            {isEditing && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-amber-300">{t('workplace.modal.status', 'Status do cliente')}</p>
                                            <p className="text-xs text-surface-200/50 mt-0.5">
                                                {form.is_active ? t('workplace.modal.statusActive', 'Ativo — pode receber agendamentos') : t('workplace.modal.statusInactive', 'Inativo — não aparece na seleção')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => update('is_active', !form.is_active)}
                                            className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${form.is_active ? 'bg-emerald-500' : 'bg-surface-700'
                                                }`}
                                        >
                                            <motion.div
                                                layout
                                                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md"
                                                style={{ left: form.is_active ? 'calc(100% - 1.625rem)' : '0.125rem' }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : isEditing ? t('common.saveChanges', 'Salvar alterações') : t('common.createClient', 'Cadastrar cliente')}
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */
function EmptyClients({ onAdd }) {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600/10 border border-brand-500/20">
                <HiOutlineUser className="text-brand-400" size={36} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-surface-50">
                {t('workplace.empty.title', 'Nenhum cliente cadastrado')}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-surface-200/50">
                {t('workplace.empty.desc', 'Adicione seu primeiro cliente a este local de trabalho.')}
            </p>
            <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onAdd}
                className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25"
            >
                <HiOutlinePlus size={18} />
                {t('workplace.empty.button', 'Cadastrar primeiro cliente')}
            </motion.button>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Copy / Move Client Modal                                           */
/* ------------------------------------------------------------------ */
function CopyMoveModal({ isOpen, onClose, client, currentWorkplaceId, onDone }) {
    const { t } = useTranslation();
    const [workplaces, setWorkplaces] = useState([]);
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTargetId('');
            setError('');
            api.get('/workplaces/')
                .then(({ data }) => setWorkplaces(data.filter((wp) => String(wp.id) !== String(currentWorkplaceId))))
                .catch(() => setWorkplaces([]));
        }
    }, [isOpen, currentWorkplaceId]);

    const handleAction = async (mode) => {
        if (!targetId) { setError(t('workplace.copyMove.errorTarget', 'Selecione um local de destino.')); return; }
        setError('');
        setLoading(true);
        try {
            // Link to new workplace
            await api.post(`/clients/${client.id}/link/${targetId}`);
            // If "move", also unlink from current
            if (mode === 'move') {
                await api.delete(`/clients/${client.id}/link/${currentWorkplaceId}`);
            }
            onDone(mode);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || t('common.errorProcess', 'Erro ao processar.'));
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
                            <h2 className="text-lg font-semibold text-gradient">{t('workplace.copyMove.title', 'Copiar / Mover Cliente')}</h2>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/15 text-brand-400 border border-brand-500/20">
                                        <HiOutlineUser size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-surface-50">{client?.name}</p>
                                        <p className="text-xs text-surface-200/50">{client?.contact || t('common.noContact', 'Sem contato')}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                    <HiOutlineOfficeBuilding size={16} className="text-surface-200/40" /> {t('workplace.copyMove.targetLabel', 'Local de destino *')}
                                </label>
                                <select
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                >
                                    <option value="" className="bg-surface-900">{t('workplace.copyMove.targetPlaceholder', 'Selecione o local')}</option>
                                    {workplaces.map((wp) => (
                                        <option key={wp.id} value={wp.id} className="bg-surface-900">{wp.name}</option>
                                    ))}
                                </select>
                                {workplaces.length === 0 && (
                                    <p className="mt-1.5 text-xs text-surface-200/40">{t('workplace.copyMove.noTarget', 'Nenhum outro local disponível')}</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-1">
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loading || !targetId}
                                    onClick={() => handleAction('copy')}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <>
                                            <HiOutlineClipboardCopy size={16} />
                                            {t('common.copy', 'Copiar')}
                                        </>
                                    )}
                                </motion.button>
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loading || !targetId}
                                    onClick={() => handleAction('move')}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/15 transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <>
                                            <HiOutlineSwitchHorizontal size={16} />
                                            {t('common.move', 'Mover')}
                                        </>
                                    )}
                                </motion.button>
                            </div>

                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                <p className="text-xs text-surface-200/40 leading-relaxed">
                                    <strong className="text-surface-200/60">{t('common.copy', 'Copiar')}</strong> — {t('workplace.copyMove.copyHint', 'o cliente ficará nos dois locais.')}
                                    <br />
                                    <strong className="text-surface-200/60">{t('common.move', 'Mover')}</strong> — {t('workplace.copyMove.moveHint', 'o cliente será retirado deste local e enviado ao destino.')}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  WorkplacePage                                                      */
/* ------------------------------------------------------------------ */
export default function WorkplacePage() {
    const { t } = useTranslation();
    const { workplaceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [workplace, setWorkplace] = useState(null);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState({ status: 'all' });
    const [filterOpen, setFilterOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [sortBy, setSortBy] = useState('name-asc');
    const [copyMoveTarget, setCopyMoveTarget] = useState(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch workplace info
    useEffect(() => {
        api.get(`/workplaces/${workplaceId}`)
            .then(({ data }) => setWorkplace(data))
            .catch(() => navigate('/workplaces', { replace: true }));
    }, [workplaceId, navigate]);

    // Fetch clients
    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (debouncedSearch) params.name = debouncedSearch;
            const { data } = await api.get(`/workplaces/${workplaceId}/clients`, { params });
            setClients(data);
        } catch (err) {
            console.error('Erro ao buscar clientes:', err);
        } finally {
            setLoading(false);
        }
    }, [workplaceId, debouncedSearch]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleCreated = (newClient) => {
        setClients((prev) => [newClient, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleUpdated = (updatedClient) => {
        setClients((prev) =>
            prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
        );
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.put(`/clients/${deleteTarget.id}`, { is_active: false });
            setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            console.error('Erro ao excluir cliente:', err);
        } finally {
            setDeleting(false);
        }
    };

    const openCreate = () => {
        setEditingClient(null);
        setModalOpen(true);
    };

    const openEdit = (client) => {
        setEditingClient(client);
        setModalOpen(true);
    };

    // Apply filters + sorting client-side
    const filteredClients = useMemo(() => {
        let list = clients.filter((c) => {
            if (filters.status === 'active') return c.is_active;
            if (filters.status === 'inactive') return !c.is_active;
            return true;
        });

        // Sorting
        list = [...list].sort((a, b) => {
            switch (sortBy) {
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'newest': return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                default: return a.name.localeCompare(b.name); // name-asc
            }
        });

        return list;
    }, [clients, filters, sortBy]);

    const activeFilterCount = filters.status !== 'all' ? 1 : 0;


    return (
        <div className="min-h-screen gradient-bg">
            {/* Floating orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-600/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-accent-500/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navbar */}
            <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="Velo Icon" className="h-9 w-9 object-contain drop-shadow-sm" />
                        <span className="text-lg font-bold text-gradient">Velo</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <UserDropdown />
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
                {/* Back + Title */}
                <div className="mb-6">
                    <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ x: -3 }}
                        onClick={() => navigate('/workplaces')}
                        className="mb-4 flex items-center gap-2 text-sm text-surface-200/60 hover:text-brand-400 transition-colors"
                    >
                        <HiOutlineArrowLeft size={16} />
                        {t('workplace.back', 'Voltar aos locais')}
                    </motion.button>

                    {workplace && (
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-brand-600/20">
                                {workplace.photo_url ? (
                                    <img src={workplace.photo_url} alt={workplace.name} className="h-full w-full rounded-xl object-cover" />
                                ) : (
                                    <HiOutlineOfficeBuilding className="text-white" size={24} />
                                )}
                            </div>
                            <div>
                                <motion.h1
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-2xl font-bold text-surface-50 sm:text-3xl"
                                >
                                    {workplace.name}
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-sm text-surface-200/50"
                                >
                                    {t('workplace.subtitle', 'Clientes deste local de trabalho')}
                                </motion.p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search + Filter + Add bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200/40" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('workplace.searchPlaceholder', 'Buscar cliente por nome...')}
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                        />
                    </div>

                    <div className="flex gap-2">
                        {/* Sort */}
                        <div className="relative">
                            <HiOutlineSortAscending className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200/40" size={16} />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="h-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-sm text-surface-200/60 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                            >
                                <option value="name-asc" className="bg-surface-900">{t('workplace.sort.az', 'A → Z')}</option>
                                <option value="name-desc" className="bg-surface-900">{t('workplace.sort.za', 'Z → A')}</option>
                                <option value="newest" className="bg-surface-900">{t('workplace.sort.newest', 'Mais recente')}</option>
                                <option value="oldest" className="bg-surface-900">{t('workplace.sort.oldest', 'Mais antigo')}</option>
                            </select>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setFilterOpen(true)}
                            className={`relative flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${activeFilterCount > 0
                                ? 'border-brand-500/30 bg-brand-600/10 text-brand-400'
                                : 'border-white/10 bg-white/5 text-surface-200/60 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <HiOutlineAdjustments size={18} />
                            {t('common.filters', 'Filtros')}
                            {activeFilterCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full gradient-brand text-xs text-white font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={openCreate}
                            className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25"
                        >
                            <HiOutlinePlus size={18} />
                            <span className="hidden sm:inline">{t('common.newClient', 'Novo cliente')}</span>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Results count */}
                {!loading && filteredClients.length > 0 && (
                    <p className="mb-4 text-sm text-surface-200/40">
                        {t('workplace.resultsCount', '{{count}} clientes encontrados', { count: filteredClients.length })}
                    </p>
                )}

                {/* Loading */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                                <div className="flex items-start gap-4">
                                    <div className="h-11 w-11 rounded-xl bg-white/10" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/3 rounded bg-white/10" />
                                        <div className="h-3 w-1/4 rounded bg-white/5" />
                                    </div>
                                    <div className="h-5 w-14 rounded-full bg-white/10" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && clients.length === 0 && !debouncedSearch && (
                    <EmptyClients onAdd={openCreate} />
                )}

                {/* No results */}
                {!loading && filteredClients.length === 0 && (clients.length > 0 || debouncedSearch) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                        <HiOutlineSearch className="mx-auto mb-3 text-surface-200/30" size={40} />
                        <p className="text-base text-surface-200/50">{t('workplace.noResults.title', 'Nenhum cliente encontrado')}</p>
                        <p className="mt-1 text-sm text-surface-200/30">{t('workplace.noResults.desc', 'Tente outro termo de busca ou ajuste os filtros')}</p>
                    </motion.div>
                )}

                {/* Client list */}
                {!loading && filteredClients.length > 0 && (
                    <div className="space-y-3">
                        {filteredClients.map((client, i) => (
                            <ClientCard
                                key={client.id}
                                client={client}
                                index={i}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                                onCopyMove={setCopyMoveTarget}
                                onHistory={(c) => navigate(`/client/${c.id}/history`)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* FAB mobile */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={openCreate}
                className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-xl shadow-brand-600/30 sm:hidden"
            >
                <HiOutlinePlus className="text-white" size={24} />
            </motion.button>

            {/* Modals */}
            <FilterPanel
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                filters={filters}
                onApply={setFilters}
            />
            <ClientModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingClient(null); }}
                onCreated={handleCreated}
                onUpdated={handleUpdated}
                workplaceId={workplaceId}
                client={editingClient}
            />
            <ConfirmDeleteDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title={t('workplace.delete.title', 'Excluir cliente?')}
                description={t('workplace.delete.desc', 'O cliente "{{name}}" será removido deste local. Essa ação não pode ser desfeita.', { name: deleteTarget?.name })}
            />
            <CopyMoveModal
                isOpen={!!copyMoveTarget}
                onClose={() => setCopyMoveTarget(null)}
                client={copyMoveTarget}
                currentWorkplaceId={workplaceId}
                onDone={(mode) => {
                    if (mode === 'move') {
                        setClients((prev) => prev.filter((c) => c.id !== copyMoveTarget.id));
                    }
                    setCopyMoveTarget(null);
                }}
            />
        </div>
    );
}
