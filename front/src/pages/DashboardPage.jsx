import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlinePlus,
    HiOutlineOfficeBuilding,
    HiOutlineClock,
    HiOutlineLocationMarker,
    HiOutlineCalendar,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineArrowLeft,
    HiOutlineExclamation,
    HiOutlineSearch,
    HiOutlineSortAscending,
    HiOutlineClipboardList,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import HeaderNav from '../components/HeaderNav';
import WorkplaceModal from '../components/WorkplaceModal';

const DAY_NAMES = {
    '0': 'Dom',
    '1': 'Seg',
    '2': 'Ter',
    '3': 'Qua',
    '4': 'Qui',
    '5': 'Sex',
    '6': 'Sáb',
};

/* ------------------------------------------------------------------ */
/*  Confirm Delete Dialog                                              */
/* ------------------------------------------------------------------ */
function ConfirmDeleteDialog({ isOpen, onClose, onConfirm, title, description, loading }) {
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
                                {t('workplaces.deleteModal.cancel', 'Cancelar')}
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : t('workplaces.deleteModal.confirm', 'Excluir')}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/*  Workplace Card                                                     */
/* ------------------------------------------------------------------ */
function WorkplaceCard({ workplace, index, onEdit, onDelete }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const days = workplace.work_days
        .split(',')
        .map((d) => DAY_NAMES[d.trim()] || d)
        .join(' · ');

    const formatTime = (t) => {
        if (!t) return '';
        return t.substring(0, 5);
    };

    const handleCardClick = () => {
        navigate(`/workplace/${workplace.id}`);
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit(workplace);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete(workplace);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={handleCardClick}
            className={`group relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-shadow hover:shadow-xl hover:shadow-brand-600/10 ${!workplace.photo_url ? 'glass' : 'bg-surface-900 border border-white/5'}`}
        >
            {/* Background Layer */}
            {workplace.photo_url && (
                <>
                    <div
                        className="absolute inset-0 z-0 opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                        style={{
                            backgroundImage: `url(${workplace.photo_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    />
                    <div className="absolute inset-0 z-0 bg-gradient-to-t from-surface-950 via-surface-950/80 to-transparent" />
                </>
            )}

            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 z-10 h-1 w-full gradient-brand opacity-60 group-hover:opacity-100 transition-opacity" />

            {/* Main Content */}
            <div className="relative z-10">
                {/* Header with icon, action btns, status */}
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-brand-600/20">
                        <HiOutlineOfficeBuilding className="text-white" size={22} />
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* History */}
                        <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/workplace/${workplace.id}/history`); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-sky-600/20 hover:text-sky-400 hover:border-sky-500/30 transition-all opacity-0 group-hover:opacity-100"
                            title={t('workplaces.card.history', 'Ver histórico do local')}
                        >
                            <HiOutlineClipboardList size={14} />
                        </motion.button>

                        {/* Admin-only actions */}
                        {user?.role === 'admin' && (
                            <>
                                {/* Edit */}
                                <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEditClick}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-brand-600/20 hover:text-brand-400 hover:border-brand-500/30 transition-all opacity-0 group-hover:opacity-100"
                                    title={t('workplaces.card.edit', 'Editar local')}
                                >
                                    <HiOutlinePencil size={14} />
                                </motion.button>

                                {/* Delete */}
                                <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDeleteClick}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-surface-200/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                                    title={t('workplaces.card.delete', 'Excluir local')}
                                >
                                    <HiOutlineTrash size={14} />
                                </motion.button>
                            </>
                        )}

                        <span
                            className={`ml-1 rounded-full px-3 py-1 text-xs font-medium ${workplace.is_active
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                }`}
                        >
                            {workplace.is_active ? t('workplaces.status.active', 'Ativo') : t('workplaces.status.inactive', 'Inativo')}
                        </span>
                    </div>
                </div>

                <h3 className="mb-1 text-lg font-semibold text-surface-50 group-hover:text-gradient transition-colors">
                    {workplace.name}
                </h3>

                {workplace.description && (
                    <p className="mb-3 text-sm text-surface-200/50 line-clamp-2">
                        {workplace.description}
                    </p>
                )}

                <div className="mt-4 space-y-2">
                    {workplace.address && (
                        <div className="flex items-center gap-2 text-sm text-surface-200/60">
                            <HiOutlineLocationMarker size={15} className="text-brand-400/70 shrink-0" />
                            <span className="truncate">{workplace.address}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-surface-200/60">
                        <HiOutlineClock size={15} className="text-brand-400/70 shrink-0" />
                        <span>
                            {formatTime(workplace.start_time)} – {formatTime(workplace.end_time)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-surface-200/60">
                        <HiOutlineCalendar size={15} className="text-brand-400/70 shrink-0" />
                        <span>{days}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({ onAdd }) {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600/10 border border-brand-500/20">
                <HiOutlineOfficeBuilding className="text-brand-400" size={36} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-surface-50">
                {t('workplaces.empty.title')}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-surface-200/50">
                {t('workplaces.empty.description')}
            </p>
            <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onAdd}
                className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25"
            >
                <HiOutlinePlus size={18} />
                {t('workplaces.empty.button')}
            </motion.button>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [workplaces, setWorkplaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingWorkplace, setEditingWorkplace] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name-asc');

    useEffect(() => {
        fetchWorkplaces();
    }, []);

    const fetchWorkplaces = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/workplaces/');
            setWorkplaces(data);
        } catch (err) {
            console.error('Erro ao buscar locais:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreated = (newWorkplace) => {
        setWorkplaces((prev) => [newWorkplace, ...prev]);
    };

    const handleUpdated = (updatedWorkplace) => {
        setWorkplaces((prev) =>
            prev.map((wp) => (wp.id === updatedWorkplace.id ? updatedWorkplace : wp))
        );
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/workplaces/${deleteTarget.id}`);
            setWorkplaces((prev) => prev.filter((wp) => wp.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            console.error('Erro ao excluir:', err);
        } finally {
            setDeleting(false);
        }
    };

    const openCreate = () => {
        // Prevent creation if user has multiple_workplaces disabled and already has one
        if (user && !user.multiple_workplaces && workplaces.length > 0) {
            import('react-hot-toast').then(toast => {
                toast.default.error(t('workplaces.creationDisabled', 'Você já possui um local de trabalho ativo. Ative "Trabalho em múltiplos locais" nas configurações.'));
            });
            return;
        }

        setEditingWorkplace(null);
        setModalOpen(true);
    };

    const openEdit = (workplace) => {
        setEditingWorkplace(workplace);
        setModalOpen(true);
    };



    // Client-side search + sort
    const filteredWorkplaces = useMemo(() => {
        let list = workplaces;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((wp) => wp.name.toLowerCase().includes(q));
        }
        list = [...list].sort((a, b) => {
            switch (sortBy) {
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'newest': return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                default: return a.name.localeCompare(b.name);
            }
        });
        return list;
    }, [workplaces, search, sortBy]);

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
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-2xl font-bold text-surface-50 sm:text-3xl"
                        >
                            {t('workplaces.title', 'Locais de Trabalho')}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mt-1 text-sm text-surface-200/50"
                        >
                            {t('workplaces.description', 'Gerencie seus locais e organize sua agenda')}
                        </motion.p>
                    </div>

                    {workplaces.length > 0 && user?.role === 'admin' && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={openCreate}
                            className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 self-start sm:self-auto"
                        >
                            <HiOutlinePlus size={18} />
                            {t('workplaces.newWorkplace', 'Novo local')}
                        </motion.button>
                    )}
                </div>

                {/* Loading skeleton */}
                {loading && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="h-11 w-11 rounded-xl bg-white/10" />
                                    <div className="h-6 w-16 rounded-full bg-white/10" />
                                </div>
                                <div className="mb-2 h-5 w-3/4 rounded bg-white/10" />
                                <div className="mb-4 h-3 w-1/2 rounded bg-white/5" />
                                <div className="space-y-2">
                                    <div className="h-3 w-2/3 rounded bg-white/5" />
                                    <div className="h-3 w-1/2 rounded bg-white/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && workplaces.length === 0 && (
                    <EmptyState onAdd={openCreate} />
                )}

                {/* Search + Sort Bar */}
                {!loading && workplaces.length > 0 && (
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
                                placeholder={t('workplaces.searchPlaceholder', 'Buscar local por nome...')}
                                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30"
                            />
                        </div>
                        <div className="relative">
                            <HiOutlineSortAscending className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-200/40" size={16} />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="h-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-sm text-surface-200/60 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                            >
                                <option value="name-asc" className="bg-surface-900">{t('workplaces.sortItems.nameAsc', 'A → Z')}</option>
                                <option value="name-desc" className="bg-surface-900">{t('workplaces.sortItems.nameDesc', 'Z → A')}</option>
                                <option value="newest" className="bg-surface-900">{t('workplaces.sortItems.newest', 'Mais recente')}</option>
                                <option value="oldest" className="bg-surface-900">{t('workplaces.sortItems.oldest', 'Mais antigo')}</option>
                            </select>
                        </div>
                    </motion.div>
                )}

                {/* No results */}
                {!loading && workplaces.length > 0 && filteredWorkplaces.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                        <HiOutlineSearch className="mx-auto mb-3 text-surface-200/30" size={40} />
                        <p className="text-base text-surface-200/50">{t('workplaces.noResults.title', 'Nenhum local encontrado')}</p>
                        <p className="mt-1 text-sm text-surface-200/30">{t('workplaces.noResults.subtitle', 'Tente outro termo de busca')}</p>
                    </motion.div>
                )}

                {/* Cards grid */}
                {!loading && filteredWorkplaces.length > 0 && (
                    <motion.div initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredWorkplaces.map((wp, i) => (
                            <WorkplaceCard
                                key={wp.id}
                                workplace={wp}
                                index={i}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </motion.div>
                )}
            </main>

            {/* FAB (mobile) - Admin only */}
            {workplaces.length > 0 && user?.role === 'admin' && (
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
            )}

            {/* Create / Edit Modal */}
            <WorkplaceModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingWorkplace(null); }}
                onCreated={handleCreated}
                onUpdated={handleUpdated}
                workplace={editingWorkplace}
            />

            {/* Delete Confirmation */}
            <ConfirmDeleteDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title={t('workplaces.deleteModal.title')}
                description={t('workplaces.deleteModal.warn', `O local "{{name}}" será removido permanentemente. Essa ação não pode ser desfeita.`, { name: deleteTarget?.name })}
            />
        </div>
    );
}
