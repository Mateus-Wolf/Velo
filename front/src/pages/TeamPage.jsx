import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineUserGroup,
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineMail,
    HiOutlineShieldCheck,
    HiOutlineOfficeBuilding,
    HiOutlineX,
    HiOutlineCheck,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineCamera,
    HiOutlineUser,
} from 'react-icons/hi';
import { useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import HeaderNav from '../components/HeaderNav';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';

export default function TeamPage() {
    const { t } = useTranslation();
    const [staff, setStaff] = useState([]);
    const [workplaces, setWorkplaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: '', email: '', password: '',
        can_change_status: false, can_access_documents: false, workplace_ids: [], is_active: true,
        avatar_url: null,
    });
    const [showConfirmDocs, setShowConfirmDocs] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [filters, setFilters] = useState({ name: '', is_active: 'all' });
    const fileInputRef = useRef(null);
    const BACKEND_URL = 'http://localhost:8000';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.name) params.name = filters.name;
            if (filters.is_active !== 'all') params.is_active = filters.is_active === 'active';

            const [staffRes, wpRes] = await Promise.all([
                api.get('/staff/', { params }),
                api.get('/workplaces/'),
            ]);
            setStaff(staffRes.data);
            setWorkplaces(wpRes.data);
        } catch (err) {
            toast.error('Erro ao carregar dados da equipe');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', email: '', password: '', can_change_status: false, can_access_documents: false, workplace_ids: [], is_active: true });
        setShowPassword(false);
        setModalOpen(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({
            name: s.name,
            email: s.email,
            password: '',
            can_change_status: s.can_change_status,
            can_access_documents: s.can_access_documents || false,
            workplace_ids: s.workplace_ids || [],
            is_active: s.is_active,
            avatar_url: s.avatar_url,
        });
        setShowPassword(false);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                await api.put(`/staff/${editing.id}`, payload);
                toast.success('Funcionário atualizado!');
            } else {
                if (!form.password || form.password.length < 6) {
                    toast.error('A senha deve ter no mínimo 6 caracteres');
                    return;
                }
                await api.post('/staff/', form);
                toast.success('Funcionário criado!');
            }
            setModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erro ao salvar funcionário');
        }
    };

    const handleDelete = async (s) => {
        if (!confirm(`Deseja excluir PERMANENTEMENTE ${s.name}? Esta ação não pode ser desfeita.`)) return;
        try {
            await api.delete(`/staff/${s.id}`);
            toast.success('Funcionário excluído');
            fetchData();
        } catch {
            toast.error('Erro ao excluir funcionário');
        }
    };

    const handleAvatarUpload = async (e) => {
        if (!editing) return;
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post(`/staff/${editing.id}/avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setForm(prev => ({ ...prev, avatar_url: data.avatar_url }));
            toast.success('Foto atualizada!');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erro ao enviar foto');
        } finally {
            setAvatarLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAvatar = async () => {
        if (!editing) return;
        setAvatarLoading(true);
        try {
            const { data } = await api.delete(`/staff/${editing.id}/avatar`);
            setForm(prev => ({ ...prev, avatar_url: null }));
            toast.success('Foto removida!');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erro ao remover foto');
        } finally {
            setAvatarLoading(false);
        }
    };

    const toggleWorkplace = (wpId) => {
        setForm(prev => ({
            ...prev,
            workplace_ids: prev.workplace_ids.includes(wpId)
                ? prev.workplace_ids.filter(id => id !== wpId)
                : [...prev.workplace_ids, wpId],
        }));
    };

    const getWorkplaceName = (id) => workplaces.find(w => w.id === id)?.name || `#${id}`;

    return (
        <div className="min-h-screen bg-surface-950 text-white">
            <HeaderNav />
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                                <HiOutlineUserGroup size={22} />
                            </div>
                            {t('team.title', 'Equipe')}
                        </h1>
                        <p className="text-sm text-surface-200/50 mt-1">
                            {t('team.subtitle', 'Gerencie secretárias e recepcionistas')}
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={openCreate}
                        className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 transition-colors"
                    >
                        <HiOutlinePlus size={18} />
                        <span className="hidden sm:inline">{t('team.add', 'Novo Funcionário')}</span>
                    </motion.button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={filters.name}
                            onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-surface-200/30 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {[
                            { value: 'all', label: 'Todos' },
                            { value: 'active', label: 'Ativos' },
                            { value: 'inactive', label: 'Inativos' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilters(prev => ({ ...prev, is_active: opt.value }))}
                                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                                    filters.is_active === opt.value
                                        ? 'border-brand-500/40 bg-brand-500/10 text-white'
                                        : 'border-white/10 bg-white/5 text-surface-200/60 hover:border-white/20'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-16 text-surface-200/40">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-r-transparent" />
                    </div>
                )}

                {/* Empty state */}
                {!loading && staff.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]"
                    >
                        <HiOutlineUserGroup size={48} className="mx-auto text-surface-200/20 mb-4" />
                        <h3 className="text-lg font-semibold text-surface-200/60 mb-2">
                            {t('team.empty', 'Nenhum funcionário cadastrado')}
                        </h3>
                        <p className="text-sm text-surface-200/30 mb-6">
                            {t('team.empty_desc', 'Adicione secretárias ou recepcionistas para ajudar no gerenciamento.')}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
                        >
                            <HiOutlinePlus size={16} />
                            {t('team.add', 'Novo Funcionário')}
                        </motion.button>
                    </motion.div>
                )}

                {/* Staff cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {staff.map((s, idx) => (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`relative rounded-2xl border p-5 transition-all ${
                                s.is_active
                                    ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                    : 'border-white/5 bg-white/[0.01] opacity-60'
                            }`}
                        >
                            <div className="flex gap-4 mb-4">
                                <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                                    {s.avatar_url ? (
                                        <img src={`${BACKEND_URL}${s.avatar_url}`} alt={s.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <HiOutlineUser size={20} className="text-surface-200/20" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-white truncate">{s.name}</h3>
                                    <p className="text-xs text-surface-200/40 flex items-center gap-1 mt-1 truncate">
                                        <HiOutlineMail size={12} />
                                        {s.email}
                                    </p>
                                </div>
                            </div>

                            {/* Permissions */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 ${
                                    s.can_change_status
                                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                                        : 'bg-white/5 text-surface-200/40 border border-white/5'
                                }`}>
                                    <HiOutlineShieldCheck size={11} />
                                    {s.can_change_status ? 'Pode alterar status' : 'Sem alterar status'}
                                </span>
                                {s.can_access_documents && (
                                    <span className="text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                        <HiOutlineShieldCheck size={11} />
                                        Acesso a documentos
                                    </span>
                                )}
                            </div>

                            {/* Workplaces */}
                            {s.workplace_ids && s.workplace_ids.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {s.workplace_ids.map(id => (
                                        <span key={id} className="text-[10px] font-medium px-2 py-1 rounded-lg bg-white/5 text-surface-200/60 border border-white/5 flex items-center gap-1">
                                            <HiOutlineOfficeBuilding size={10} />
                                            {getWorkplaceName(id)}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => openEdit(s)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 transition-colors"
                                >
                                    <HiOutlinePencil size={13} />
                                    Editar
                                </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDelete(s)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                    >
                                        <HiOutlineTrash size={13} />
                                        Excluir
                                    </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Modal */}
                <AnimatePresence>
                    {modalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                            onClick={() => setModalOpen(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-900 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <form onSubmit={handleSubmit}>
                                    {/* Modal header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <HiOutlineUserGroup size={20} className="text-brand-400" />
                                            {editing ? 'Editar Funcionário' : 'Novo Funcionário'}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => setModalOpen(false)}
                                            className="p-1.5 rounded-lg text-surface-200/40 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <HiOutlineX size={18} />
                                        </button>
                                    </div>

                                    {/* Modal body */}
                                    <div className="px-6 py-5 space-y-5">
                                        {/* Avatar upload (edit only) */}
                                        {editing && (
                                            <div className="flex items-center gap-4 py-2 border-b border-white/5 mb-2">
                                                <div className="relative group h-16 w-16 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                    {form.avatar_url ? (
                                                        <img src={`${BACKEND_URL}${form.avatar_url}`} alt="Avatar" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <HiOutlineUser size={24} className="text-surface-200/20" />
                                                    )}
                                                    {avatarLoading && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 bg-brand-500/10 px-2 py-1 rounded-lg"
                                                            disabled={avatarLoading}
                                                        >
                                                            <HiOutlineCamera size={12} /> Alterar Foto
                                                        </button>
                                                        {form.avatar_url && (
                                                            <button 
                                                                type="button" 
                                                                onClick={handleDeleteAvatar}
                                                                className="text-[11px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg"
                                                                disabled={avatarLoading}
                                                            >
                                                                <HiOutlineTrash size={12} /> Remover
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-surface-200/30">JPG, PNG ou WebP. Máx 5 MB.</p>
                                                </div>
                                            </div>
                                        )}
                                        {/* Name */}
                                        <div>
                                            <label className="block text-xs font-medium text-surface-200/60 mb-1.5">Nome</label>
                                            <input
                                                required
                                                type="text"
                                                value={form.name}
                                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-surface-200/30 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
                                                placeholder="Nome do funcionário"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-xs font-medium text-surface-200/60 mb-1.5">Email</label>
                                            <input
                                                required
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-surface-200/30 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div>
                                            <label className="block text-xs font-medium text-surface-200/60 mb-1.5">
                                                Senha {editing && <span className="text-surface-200/30">(deixe vazio para manter)</span>}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required={!editing}
                                                    minLength={editing ? undefined : 6}
                                                    value={form.password}
                                                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder-surface-200/30 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
                                                    placeholder="Mínimo 6 caracteres"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-200/40 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <HiOutlineEyeOff size={16} /> : <HiOutlineEye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Can change status */}
                                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-white flex items-center gap-2">
                                                    <HiOutlineShieldCheck size={16} className="text-brand-400" />
                                                    Pode alterar status
                                                </p>
                                                <p className="text-[11px] text-surface-200/40 mt-0.5">
                                                    Permite concluir, cancelar e resolver agendamentos
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setForm(prev => ({ ...prev, can_change_status: !prev.can_change_status }))}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                                    form.can_change_status ? 'bg-brand-500' : 'bg-white/10'
                                                }`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                                    form.can_change_status ? 'translate-x-5' : ''
                                                }`} />
                                            </button>
                                        </div>
 
                                        {/* Can access documents */}
                                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-white flex items-center gap-2">
                                                    <HiOutlineShieldCheck size={16} className="text-amber-400" />
                                                    Acesso a documentos de pacientes
                                                </p>
                                                <p className="text-[11px] text-surface-200/40 mt-0.5">
                                                    Permite visualizar documentos anexados aos pacientes
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!form.can_access_documents) {
                                                        setShowConfirmDocs(true);
                                                    } else {
                                                        setForm(prev => ({ ...prev, can_access_documents: false }));
                                                    }
                                                }}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                                    form.can_access_documents ? 'bg-amber-500' : 'bg-white/10'
                                                }`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                                    form.can_access_documents ? 'translate-x-5' : ''
                                                }`} />
                                            </button>
                                        </div>

                                        {/* Active toggle (edit only) */}
                                        {editing && (
                                            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-medium text-white">Status</p>
                                                    <p className="text-[11px] text-surface-200/40 mt-0.5">
                                                        Ativo ou inativo no sistema
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                                                    className={`relative w-11 h-6 rounded-full transition-colors ${
                                                        form.is_active ? 'bg-emerald-500' : 'bg-white/10'
                                                    }`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                                        form.is_active ? 'translate-x-5' : ''
                                                    }`} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Workplace access */}
                                        <div>
                                            <label className="block text-xs font-medium text-surface-200/60 mb-2 flex items-center gap-1.5">
                                                <HiOutlineOfficeBuilding size={14} />
                                                Locais de trabalho com acesso
                                            </label>
                                            {workplaces.length === 0 ? (
                                                <p className="text-xs text-surface-200/30 italic">Nenhum local de trabalho cadastrado</p>
                                            ) : (
                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                    {workplaces.filter(w => w.is_active).map(wp => (
                                                        <button
                                                            key={wp.id}
                                                            type="button"
                                                            onClick={() => toggleWorkplace(wp.id)}
                                                            className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                                                                form.workplace_ids.includes(wp.id)
                                                                    ? 'border-brand-500/40 bg-brand-500/10 text-white'
                                                                    : 'border-white/10 bg-white/[0.02] text-surface-200/60 hover:border-white/20'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <HiOutlineOfficeBuilding size={14} />
                                                                {wp.name}
                                                            </span>
                                                            {form.workplace_ids.includes(wp.id) && (
                                                                <HiOutlineCheck size={16} className="text-brand-400" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modal footer */}
                                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setModalOpen(false)}
                                            className="px-4 py-2 rounded-xl text-sm font-medium text-surface-200/60 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/25 transition-colors"
                                        >
                                            {editing ? 'Salvar Alterações' : 'Criar Funcionário'}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
 
                <ConfirmModal
                    isOpen={showConfirmDocs}
                    onClose={() => setShowConfirmDocs(false)}
                    onConfirm={() => setForm(prev => ({ ...prev, can_access_documents: true }))}
                    title="Alerta de Privacidade"
                    variant="warning"
                    message="Quaisquer responsabilidades da privacidade do paciente são do médico e o Velo não se responsabiliza por vazamentos ocasionados por descuidos de funcionários."
                    confirmText="Estou ciente e autorizo"
                />
            </div>
        </div>
    );
}
