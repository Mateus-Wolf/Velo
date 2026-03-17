import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineUser,
    HiOutlineMail,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineCamera,
    HiOutlineTrash,
    HiOutlineShieldCheck,
    HiOutlineCheck,
} from 'react-icons/hi';
import { HiSparkles } from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import ConfirmModal from '../components/ConfirmModal';

/* ------------------------------------------------------------------ */
/*  Floating Orbs                                                      */
/* ------------------------------------------------------------------ */
function FloatingOrbs() {
    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-brand-600/20 blur-[120px] animate-float" />
            <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-accent-500/15 blur-[140px] animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-brand-500/10 blur-[100px] animate-float" style={{ animationDelay: '4s' }} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */
function Toast({ toast, onClose }) {
    if (!toast) return null;
    const colors = {
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        error: 'border-red-500/30 bg-red-500/10 text-red-300',
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${colors[toast.type]}`}
        >
            {toast.type === 'success' ? <HiOutlineCheck size={16} /> : '⚠️'}
            {toast.message}
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section Card                                                       */
/* ------------------------------------------------------------------ */
function Section({ title, icon: Icon, children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6"
        >
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 border border-brand-500/20">
                    <Icon size={18} className="text-brand-400" />
                </div>
                <h2 className="text-lg font-semibold text-surface-50">{title}</h2>
            </div>
            {children}
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Profile Page                                                       */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, setUser } = useAuthStore();
    const fileInputRef = useRef(null);
    const isStaff = user?.role === 'staff';

    const [toast, setToast] = useState(null);
    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    // --- Profile info ---
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [crmNumber, setCrmNumber] = useState(user?.crm?.split('/')[0] || '');
    const [crmUF, setCrmUF] = useState(user?.crm?.split('/')[1] || 'SP');
    const [infoLoading, setInfoLoading] = useState(false);

    // Fetch fresh profile data on mount
    useEffect(() => {
        api.get('/profile/').then(({ data }) => {
            setUser(data);
            setName(data.name || '');
            setEmail(data.email || '');
            const [num, uf] = (data.crm || '').split('/');
            setCrmNumber(num || '');
            setCrmUF(uf || 'SP');
        }).catch(() => { });
    }, []);

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {}, title: '', message: '', variant: 'danger' });

    const handleUpdateProfile = async (updates) => {
        // Se estiver tentando mudar de clínico para geral, faz a verificação de segurança
        if (updates.niche === 'general' && user?.niche === 'clinical') {
            try {
                const { data } = await api.get('/medical-records/check-clinical-data');
                if (data.has_clinical_data) {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Aviso de Privacidade (LGPD)',
                        message: 'Você possui pacientes com prontuários ou documentos anexados. Ao mudar para o nicho "Geral", esses dados clínicos ficarão ocultos e inacessíveis para visualização. Deseja continuar com a alteração?',
                        variant: 'warning',
                        onConfirm: () => executeUpdate(updates)
                    });
                    return;
                }
            } catch (err) {
                console.error("Erro ao verificar dados clínicos", err);
            }
        }
        
        executeUpdate(updates);
    };

    const executeUpdate = async (updates) => {
        try {
            const { data } = await api.put('/profile/', updates);
            setUser(data);
            showToast('success', t('profile.updated', 'Perfil atualizado!'));
        } catch (err) {
            showToast('error', err.response?.data?.detail || t('profile.updateError', 'Erro ao atualizar'));
        }
    };

    // --- Password ---
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    const handleChangePw = async (e) => {
        e.preventDefault();
        if (newPw.length < 6) { showToast('error', 'Mínimo 6 caracteres'); return; }
        if (newPw !== confirmPw) { showToast('error', 'Senhas não coincidem'); return; }
        setPwLoading(true);
        try {
            await api.put('/profile/password', { current_password: currentPw, new_password: newPw });
            showToast('success', 'Senha alterada com sucesso!');
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err) {
            showToast('error', err.response?.data?.detail || 'Erro ao alterar senha');
        } finally {
            setPwLoading(false);
        }
    };

    // --- Avatar ---
    const [avatarLoading, setAvatarLoading] = useState(false);
    const BACKEND_URL = 'http://localhost:8000';
    const avatarSrc = user?.avatar_url
        ? `${BACKEND_URL}${user.avatar_url}`
        : null;

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUser(data);
            showToast('success', 'Foto atualizada!');
        } catch (err) {
            showToast('error', err.response?.data?.detail || 'Erro ao enviar foto');
        } finally {
            setAvatarLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteAvatar = async () => {
        setAvatarLoading(true);
        try {
            const { data } = await api.delete('/profile/avatar');
            setUser(data);
            showToast('success', 'Foto removida!');
        } catch (err) {
            showToast('error', err.response?.data?.detail || 'Erro ao remover foto');
        } finally {
            setAvatarLoading(false);
        }
    };

    // --- Theme (Removed, now in SettingsModal) ---

    // --- 2FA ---
    const [show2FA, setShow2FA] = useState(false);
    const [code2fa, setCode2fa] = useState('');
    const [is2FALoading, setIs2FALoading] = useState(false);

    const handleToggle2FA = async () => {
        setIs2FALoading(true);
        try {
            const { data } = await api.post('/auth/2fa/generate-activation');
            showToast('success', data.message);
            setShow2FA(true);
            setCode2fa('');
        } catch (err) {
            showToast('error', err.response?.data?.detail || 'Erro ao gerar código');
        } finally {
            setIs2FALoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setIs2FALoading(true);
        try {
            const { data } = await api.post('/auth/2fa/activate', { code: code2fa });

            // Update local user state
            const updatedUser = { ...user, two_factor_enabled: !user.two_factor_enabled };
            setUser(updatedUser);

            showToast('success', data.message);
            setShow2FA(false);
            setCode2fa('');
        } catch (err) {
            showToast('error', err.response?.data?.detail || 'Erro ao validar código');
        } finally {
            setIs2FALoading(false);
        }
    };

    const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-surface-200/30";

    return (
        <div className="relative min-h-screen gradient-bg">
            <FloatingOrbs />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-surface-200/70 hover:bg-white/10 hover:text-white transition-all">
                            <HiOutlineArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gradient">{t('profile.title')}</h1>
                            <p className="text-xs text-surface-200/40">
                                {isStaff ? 'Visualização do perfil (somente leitura)' : 'Gerencie suas informações'}
                            </p>
                        </div>
                    </div>
                    <UserDropdown />
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-3xl space-y-6 px-4 py-8">

                {/* ---- Avatar Section ---- */}
                <Section title="Foto de Perfil" icon={HiOutlineCamera}>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <HiOutlineUser size={36} className="text-surface-200/30" />
                                )}
                            </div>
                            {avatarLoading && (
                                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                                    <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                            <motion.button whileTap={{ scale: 0.96 }}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/20">
                                <HiOutlineCamera size={16} /> Alterar foto
                            </motion.button>
                            {avatarSrc && (
                                <button onClick={handleDeleteAvatar}
                                    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors">
                                    <HiOutlineTrash size={16} /> Remover
                                </button>
                            )}
                            <p className="text-xs text-surface-200/40">JPG, PNG ou WebP. Máx 5 MB.</p>
                        </div>
                    </div>
                </Section>

                {/* ---- Info Section ---- */}
                <Section title="Informações Pessoais" icon={HiOutlineUser}>
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        const fullCrm = crmNumber ? `${crmNumber}/${crmUF}` : '';
                        handleUpdateProfile({ name, email, crm: fullCrm }); 
                    }} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-surface-200/70">{t('profile.name', 'Nome')}</label>
                            <div className="relative">
                                <HiOutlineUser size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200/30" />
                                <input value={name} onChange={(e) => setName(e.target.value)}
                                    disabled={isStaff}
                                    className={`${inputClass} pl-10 ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Seu nome" />
                            </div>
                        </div>
                        {user?.niche === 'clinical' && !isStaff && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="mb-2 block text-sm font-medium text-surface-200/70">CRM / Registro Profissional</label>
                                <div className="flex gap-2">
                                    <div className="flex-[2] relative group">
                                        <HiSparkles size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isStaff ? 'text-surface-200/20' : 'text-surface-200/30 group-focus-within:text-brand-400'}`} />
                                        <input 
                                            value={crmNumber} 
                                            onChange={(e) => setCrmNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                           disabled={isStaff}
                                            className={`${inputClass} pl-10 ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} 
                                            placeholder="Número" 
                                        />
                                    </div>
                                    <div className="flex-1 relative group">
                                        <select
                                            value={crmUF}
                                            onChange={(e) => setCrmUF(e.target.value)}
                                            disabled={isStaff}
                                            className={`${inputClass} pr-8 appearance-none ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                                <option key={uf} value={uf} className="bg-surface-900 text-surface-50">{uf}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-surface-200/30 group-focus-within:text-brand-400 transition-colors">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-surface-200/70">{t('profile.email', 'E-mail')}</label>
                            <div className="relative">
                                <HiOutlineMail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200/30" />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    disabled={isStaff}
                                    className={`${inputClass} pl-10 ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="seu@email.com" />
                            </div>
                        </div>
                        {!isStaff && (
                            <motion.button type="submit" disabled={infoLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 flex items-center gap-2">
                                {infoLoading ? (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                ) : <><HiOutlineCheck size={16} /> {t('profile.save', 'Salvar Alterações')}</>}
                            </motion.button>
                        )}
                    </form>
                </Section>

                {/* ---- Niche & Workplaces ---- */}
                {!isStaff && (
                    <Section title={t('profile.preferences', 'Preferências do Sistema')} icon={HiSparkles}>
                        <div className="space-y-6">
                            {/* Niche Selection */}
                            <div>
                                <label className="mb-3 block text-sm font-medium text-surface-200/70">{t('profile.niche', 'Nicho de Atuação')}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'general', label: 'Geral (Barbearia, Estética Simples)', desc: 'Ideal para serviços de agenda comum.' },
                                        { value: 'clinical', label: 'Clínico (Saúde, Fisioterapia)', desc: 'Habilita prontuários e anamnese avançada.' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleUpdateProfile({ niche: opt.value })}
                                            className={`flex flex-col items-start rounded-xl p-4 border transition-all text-left ${
                                                user?.niche === opt.value 
                                                ? 'border-brand-500/50 bg-brand-600/10' 
                                                : 'border-white/5 bg-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            <span className={`text-sm font-semibold ${user?.niche === opt.value ? 'text-brand-400' : 'text-surface-100'}`}>{opt.label}</span>
                                            <span className="text-[10px] text-surface-200/40 mt-1 uppercase tracking-wider">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Multiple Workplaces Toggle */}
                            <div className="flex items-center justify-between py-4 border-t border-white/5">
                                <div>
                                    <h4 className="text-sm font-medium text-surface-50">Múltiplos Locais de Atendimento</h4>
                                    <p className="text-xs text-surface-200/40 mt-1">Habilite se você trabalha em mais de uma clínica ou salão.</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateProfile({ multiple_workplaces: !user?.multiple_workplaces })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user?.multiple_workplaces ? 'bg-brand-600' : 'bg-surface-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user?.multiple_workplaces ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </Section>
                )}

                {/* ---- Password Section (admin only) ---- */}
                {!isStaff && (
                <Section title="Alterar Senha" icon={HiOutlineLockClosed}>
                    <form onSubmit={handleChangePw} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-surface-200/70">Senha atual</label>
                            <div className="relative">
                                <HiOutlineLockClosed size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200/30" />
                                <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                                    className={`${inputClass} pl-10 pr-10`} placeholder="••••••" />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-200/30 hover:text-brand-400 transition-colors">
                                    {showCurrent ? <HiOutlineEyeOff size={16} /> : <HiOutlineEye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-surface-200/70">Nova senha</label>
                                <div className="relative">
                                    <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                                        className={`${inputClass} pr-10`} placeholder="Mínimo 6 caracteres" />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-200/30 hover:text-brand-400 transition-colors">
                                        {showNew ? <HiOutlineEyeOff size={16} /> : <HiOutlineEye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-surface-200/70">Confirmar</label>
                                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                                    className={inputClass} placeholder="Repita a nova senha" />
                            </div>
                        </div>
                        <motion.button type="submit" disabled={pwLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-60 flex items-center gap-2">
                            {pwLoading ? (
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : <><HiOutlineLockClosed size={16} /> Alterar senha</>}
                        </motion.button>
                    </form>
                </Section>
                )}

                {/* ---- 2FA Section (admin only) ---- */}
                {!isStaff && (
                <Section title="Verificação em Duas Etapas" icon={HiOutlineShieldCheck}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-surface-200/70">
                                Adicione uma camada extra de segurança à sua conta
                            </p>
                            <p className="mt-1 text-xs text-surface-200/40">
                                Status: {user?.two_factor_enabled ? (
                                    <span className="text-emerald-400 font-medium">Ativado</span>
                                ) : (
                                    <span className="text-surface-200/60 font-medium">Desativado</span>
                                )}
                            </p>
                        </div>
                        <div className="relative">
                            <motion.button
                                disabled={is2FALoading}
                                whileTap={!is2FALoading ? { scale: 0.9 } : undefined}
                                onClick={!is2FALoading ? handleToggle2FA : undefined}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${user?.two_factor_enabled
                                    ? 'bg-brand-500/30 border-brand-500/40'
                                    : 'bg-white/10 border-white/10'
                                    }`}
                            >
                                <motion.span
                                    layout
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full shadow-sm ${user?.two_factor_enabled
                                        ? 'translate-x-6 bg-brand-400'
                                        : 'translate-x-1 bg-surface-200/50'
                                        }`}
                                />
                            </motion.button>
                        </div>
                    </div>
                </Section>
                )}

            </main>

            <AnimatePresence>
                <Toast toast={toast} onClose={() => setToast(null)} />

                <ConfirmModal 
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                    confirmText="Alterar Nicho"
                    cancelText="Manter Clínico"
                />

                {show2FA && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-surface-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-2">Confirmação de 2 Etapas</h3>
                            <p className="text-sm text-surface-200/70 mb-6">
                                Digite o código de 6 dígitos enviado para o seu email para confirmar a {user?.two_factor_enabled ? 'desativação' : 'ativação'}.
                            </p>

                            <form onSubmit={handleVerify2FA}>
                                <div className="mb-6 relative">
                                    <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-200/50" />
                                    <input
                                        type="text"
                                        placeholder="Código"
                                        value={code2fa}
                                        onChange={(e) => setCode2fa(e.target.value)}
                                        className={`${inputClass} pl-11 text-center font-mono letter-spacing-2`}
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        disabled={is2FALoading}
                                        onClick={() => { setShow2FA(false); setCode2fa(''); }}
                                        className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={is2FALoading || code2fa.length < 5}
                                        className="flex-1 rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                                    >
                                        {is2FALoading ? 'Validando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
