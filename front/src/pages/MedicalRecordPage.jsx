import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineArrowLeft,
    HiOutlineClipboardList,
    HiOutlinePlus,
    HiOutlineCalendar,
    HiOutlinePhotograph,
    HiOutlineDocumentText,
    HiOutlineClock,
    HiOutlineSave,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineX,
    HiOutlineDownload,
    HiOutlineEye,
} from 'react-icons/hi';
import api from '../services/api';
import UserDropdown from '../components/UserDropdown';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

/* ------------------------------------------------------------------ */
/*  Signature Pad (Canvas based)                                       */
/* ------------------------------------------------------------------ */
function SignaturePad({ onSave, onCancel }) {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#22d3ee'; // Cyan-400
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }, []);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const save = () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL();
        onSave(dataUrl);
    };

    return (
        <div className="space-y-4">
            <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                />
            </div>
            <div className="flex gap-3">
                <button onClick={clear} className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-surface-200">
                    {t('common.clear', 'Limpar')}
                </button>
                <button onClick={save} className="flex-1 rounded-lg gradient-brand py-2 text-sm text-white font-semibold">
                    {t('common.save', 'Salvar Assinatura')}
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  MedicalRecordPage                                                  */
/* ------------------------------------------------------------------ */
export default function MedicalRecordPage() {
    const { t } = useTranslation();
    const { clientId } = useParams();
    const navigate = useNavigate();
    
    const [client, setClient] = useState(null);
    const [records, setRecords] = useState([]);
    const [activeTab, setActiveTab] = useState('evolution'); // evolution, anamnesis, documents
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form states
    const [anamnesisContent, setAnamnesisContent] = useState('');
    const [newEvolution, setNewEvolution] = useState('');
    
    // Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'danger'
    });

    const [editLabelModal, setEditLabelModal] = useState({
        isOpen: false,
        attachmentId: null,
        recordId: null,
        label: ''
    });

    // Upload state
    const [fileLabel, setFileLabel] = useState('');
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        try {
            const [clientRes, recordsRes] = await Promise.all([
                api.get(`/clients/${clientId}`),
                api.get(`/medical-records/client/${clientId}`)
            ]);

            // Double check permission for staff
            if (useAuthStore.getState().user?.role === 'staff' && !useAuthStore.getState().user?.permissions?.can_access_documents) {
                toast.error(t('common.unauthorized', 'Você não tem permissão para acessar este prontuário'));
                navigate(-1);
                return;
            }
            setClient(clientRes.data);
            setRecords(recordsRes.data);
            
            const anamnesis = recordsRes.data.find(r => r.type === 'anamnesis');
            if (anamnesis) setAnamnesisContent(anamnesis.content);
        } catch (err) {
            toast.error(t('common.errorLoad', 'Erro ao carregar dados'));
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId]);

    const handleSaveAnamnesis = async () => {
        setIsSaving(true);
        try {
            await api.post('/medical-records/', {
                client_id: parseInt(clientId),
                type: 'anamnesis',
                content: anamnesisContent
            });
            toast.success(t('medical.anamnesisSaved', 'Ficha de anamnese salva!'));
        } catch (err) {
            toast.error(t('common.errorSave', 'Erro ao salvar'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddEvolution = async () => {
        if (!newEvolution.trim()) return;
        setIsSaving(true);
        try {
            const { data } = await api.post('/medical-records/', {
                client_id: parseInt(clientId),
                type: 'evolution',
                content: newEvolution
            });
            setRecords([data, ...records]);
            setNewEvolution('');
            toast.success(t('medical.evolutionAdded', 'Evolução registrada!'));
        } catch (err) {
            toast.error(t('common.errorSave', 'Erro ao salvar'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecord = (recordId) => {
        setConfirmModal({
            isOpen: true,
            title: t('medical.deleteEvolution', 'Excluir Evolução'),
            message: t('medical.confirmDeleteEvolution', 'Tem certeza que deseja excluir esta evolução? Esta ação não pode ser desfeita.'),
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/medical-records/${recordId}`);
                    setRecords(records.filter(r => r.id !== recordId));
                    toast.success(t('common.deleted', 'Excluído com sucesso'));
                } catch (err) {
                    toast.error(t('common.errorDelete', 'Erro ao excluir'));
                }
            }
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!fileLabel.trim()) {
            toast.error(t('medical.errorLabel', 'Por favor, defina um rótulo para o arquivo'));
            return;
        }

        // Precisamos vincular o anexo a um registro. Vamos usar a anamnese como "raiz" 
        // ou criar um registro oculto? Para simplificar, vou usar o registro tipo anamnesis.
        let rootRecord = records.find(r => r.type === 'anamnesis');
        if (!rootRecord) {
            // Se não houver anamnese, cria uma vazia para segurar os anexos
            const { data } = await api.post('/medical-records/', {
                client_id: parseInt(clientId),
                type: 'anamnesis',
                content: ''
            });
            rootRecord = data;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('label', fileLabel);

        setIsSaving(true);
        try {
            const { data } = await api.post(`/medical-records/${rootRecord.id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Atualizar o registro raiz na lista para mostrar o novo anexo
            setRecords(records.map(r => r.id === rootRecord.id ? data : r));
            setFileLabel('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            toast.success(t('medical.fileUploaded', 'Arquivo enviado com sucesso (criptografado)!'));
        } catch (err) {
            toast.error(t('common.errorUpload', 'Erro no upload'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAttachment = (recordId, attachmentId) => {
        setConfirmModal({
            isOpen: true,
            title: t('medical.deleteDoc', 'Excluir Documento'),
            message: t('medical.confirmDeleteDoc', 'Deseja excluir permanentemente este documento criptografado?'),
            variant: 'danger',
            onConfirm: async () => {
                try {
                    const { data } = await api.delete(`/medical-records/attachments/${attachmentId}`);
                    setRecords(records.map(r => r.id === recordId ? data : r));
                    toast.success(t('common.deleted', 'Documento removido'));
                } catch (err) {
                    toast.error(t('common.errorDelete', 'Erro ao excluir'));
                }
            }
        });
    };

    const handleUpdateAttachmentLabel = (recordId, attachmentId, currentLabel) => {
        setEditLabelModal({
            isOpen: true,
            attachmentId,
            recordId,
            label: currentLabel
        });
    };

    const saveUpdatedLabel = async () => {
        const { attachmentId, recordId, label } = editLabelModal;
        if (!label.trim()) return;
        try {
            const { data } = await api.put(`/medical-records/attachments/${attachmentId}`, { label });
            setRecords(records.map(r => r.id === recordId ? data : r));
            setEditLabelModal({ ...editLabelModal, isOpen: false });
            toast.success(t('common.updated', 'Atualizado!'));
        } catch (err) {
            toast.error(t('common.errorSave', 'Erro ao salvar'));
        }
    };

    const viewFile = async (attachmentId) => {
        try {
            const response = await api.get(`/medical-records/attachments/${attachmentId}/file`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            window.open(url, '_blank');
        } catch (err) {
            toast.error(t('medical.viewError', 'Erro ao descriptografar arquivo para visualização'));
        }
    };

    if (loading) return <div className="min-h-screen gradient-bg flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-500" /></div>;

    const allAttachments = records.reduce((acc, r) => [...acc, ...(r.attachments || []).map(a => ({ ...a, recordId: r.id }))], []);

    return (
        <div className="min-h-screen gradient-bg">
            <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface-950/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="Velo Icon" className="h-9 w-9 object-contain" />
                        <span className="text-lg font-bold text-gradient">Velo</span>
                    </div>
                    <UserDropdown />
                </div>
            </nav>

            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-surface-400 hover:text-brand-400 transition-colors">
                    <HiOutlineArrowLeft /> {t('common.back', 'Voltar')}
                </button>

                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-surface-50">{client?.name}</h1>
                        <p className="text-sm text-surface-400">{t('medical.recordOf', 'Prontuário Médico/Estético Protegido')}</p>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto">
                        {[
                            { id: 'evolution', label: 'Evolução', icon: HiOutlineClock },
                            { id: 'anamnesis', label: 'Anamnese', icon: HiOutlineClipboardList },
                            { id: 'documents', label: 'Docs/Termos', icon: HiOutlineDocumentText }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    activeTab === tab.id ? 'bg-brand-600/20 text-brand-400 shadow-sm' : 'text-surface-400 hover:text-surface-200'
                                }`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'evolution' && (
                        <motion.div key="ev" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="glass rounded-2xl p-6 border-brand-500/20">
                                <h3 className="text-lg font-semibold text-surface-50 mb-4 flex items-center gap-2">
                                    <HiOutlinePlus className="text-brand-400" /> {t('medical.newEvolution', 'Nova Evolução de Sessão')}
                                </h3>
                                <textarea
                                    value={newEvolution}
                                    onChange={(e) => setNewEvolution(e.target.value)}
                                    placeholder={t('medical.evolutionPlaceholder', 'Descreva o procedimento realizado, reações do paciente, etc...')}
                                    rows={4}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-surface-50 outline-none focus:border-brand-500 transition-all resize-none"
                                />
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleAddEvolution}
                                        disabled={isSaving || !newEvolution.trim()}
                                        className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-50"
                                    >
                                        <HiOutlineSave /> {t('common.save', 'Salvar Evolução')}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {records.filter(r => r.type === 'evolution').length === 0 && (
                                    <div className="py-12 text-center text-surface-400">Nenhuma evolução registrada ainda.</div>
                                )}
                                {records.filter(r => r.type === 'evolution').map((record, i) => (
                                    <div key={record.id} className="glass rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-500/30" />
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-brand-600/10 flex items-center justify-center text-brand-400 border border-brand-500/20">
                                                    <HiOutlineClock />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-surface-50">
                                                        {new Date(record.created_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    <p className="text-xs text-surface-500">
                                                        {new Date(record.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteRecord(record.id)}
                                                className="p-2 text-surface-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <HiOutlineTrash size={18} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-surface-200 leading-relaxed whitespace-pre-wrap">{record.content}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'anamnesis' && (
                        <motion.div key="an" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <div className="glass rounded-2xl p-8">
                                <h3 className="text-xl font-semibold text-surface-50 mb-6 flex items-center gap-2">
                                    <HiOutlineClipboardList className="text-brand-400" /> {t('medical.anamnesisTitle', 'Ficha de Anamnese')}
                                </h3>
                                <textarea
                                    value={anamnesisContent}
                                    onChange={(e) => setAnamnesisContent(e.target.value)}
                                    placeholder={t('medical.anamnesisPlaceholder', 'Histórico de saúde, alergias, medicamentos em uso, objetivos do tratamento...')}
                                    rows={15}
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-surface-100 outline-none focus:border-brand-500 transition-all font-mono leading-relaxed"
                                />
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleSaveAnamnesis}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 rounded-xl gradient-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-50"
                                    >
                                        <HiOutlineSave /> {t('common.saveChanges', 'Salvar Alterações')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'documents' && (
                        <motion.div key="doc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass rounded-2xl p-6 flex flex-col border-dashed border-white/20">
                                    <h4 className="text-surface-50 font-medium mb-4 flex items-center gap-2">
                                        <HiOutlinePhotograph className="text-brand-400" /> {t('medical.addDoc', 'Novo Documento / Foto')}
                                    </h4>
                                    <input 
                                        type="text" 
                                        value={fileLabel} 
                                        onChange={(e) => setFileLabel(e.target.value)}
                                        placeholder="Ex: Antes 1, Foto Frontal, Exame Sangue..."
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-surface-50 outline-none focus:border-brand-500 mb-4"
                                    />
                                    <input ref={fileInputRef} type="file" className="hidden" id="file-upload" onChange={handleFileUpload} />
                                    <label htmlFor="file-upload" className="cursor-pointer rounded-xl gradient-brand/10 border border-brand-500/20 py-8 flex flex-col items-center justify-center hover:bg-brand-500/10 transition-all">
                                        <HiOutlinePlus size={24} className="text-brand-400 mb-2" />
                                        <span className="text-xs text-surface-200 font-medium">Selecionar e Enviar</span>
                                    </label>
                                </div>

                                <div className="glass rounded-2xl p-6">
                                    <h4 className="text-surface-50 font-medium mb-4">{t('medical.signature', 'Assinatura Digital')}</h4>
                                    <p className="text-xs text-surface-500 mb-6">{t('medical.signatureDesc', 'O paciente deve assinar dentro da área abaixo')}</p>
                                    <SignaturePad onSave={(data) => toast.success('Assinatura capturada!')} />
                                </div>
                            </div>

                            <div className="glass rounded-2xl p-6 overflow-hidden">
                                <h3 className="text-base font-semibold text-surface-50 mb-6">{t('medical.historyDocs', 'Arquivos Armazenados (Criptografados)')}</h3>
                                {allAttachments.length === 0 && (
                                    <div className="py-8 text-center text-surface-400 border border-white/5 rounded-xl">Nenhum arquivo anexado.</div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {allAttachments.map((att) => (
                                        <div key={att.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-brand-400">
                                                    {att.file_type.includes('image') ? <HiOutlinePhotograph size={20} /> : <HiOutlineDocumentText size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-surface-50">{att.label}</p>
                                                    <p className="text-[10px] text-surface-500 uppercase">{att.file_type.split('/')[1]}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => viewFile(att.id)} className="p-2 text-surface-400 hover:text-brand-400" title="Ver arquivo">
                                                    <HiOutlineEye size={16} />
                                                </button>
                                                <button onClick={() => handleUpdateAttachmentLabel(att.recordId, att.id, att.label)} className="p-2 text-surface-400 hover:text-brand-400" title="Editar rótulo">
                                                    <HiOutlinePencil size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteAttachment(att.recordId, att.id)} className="p-2 text-surface-400 hover:text-red-400" title="Excluir">
                                                    <HiOutlineTrash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modals */}
                <ConfirmModal 
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                />

                <AnimatePresence>
                    {editLabelModal.isOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-900 p-6 shadow-2xl"
                            >
                                <h3 className="text-lg font-bold text-surface-50 mb-4">{t('medical.editLabel', 'Editar Rótulo')}</h3>
                                <input 
                                    type="text"
                                    value={editLabelModal.label}
                                    onChange={(e) => setEditLabelModal({ ...editLabelModal, label: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-surface-50 outline-none focus:border-brand-500 mb-6"
                                    autoFocus
                                />
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setEditLabelModal({ ...editLabelModal, isOpen: false })}
                                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-surface-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={saveUpdatedLabel}
                                        className="flex-1 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-lg"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
