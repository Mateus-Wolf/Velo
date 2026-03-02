import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { HiCheck, HiX, HiLightningBolt } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

export default function CancellationPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage(t('cancellation.invalidLink', 'Link inválido. Nenhum token de cancelamento foi fornecido.'));
            return;
        }

        const cancelAppointment = async () => {
            try {
                const { data } = await api.post(`/public/appointments/cancel?token=${token}`);
                setStatus('success');
                setMessage(data.message || t('cancellation.successMsg', 'Agendamento cancelado com sucesso!'));
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.detail || t('cancellation.errorMsg', 'Ocorreu um erro ao cancelar seu agendamento. Talvez o link tenha expirado.'));
            }
        };

        cancelAppointment();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 font-sans relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-surface-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center relative z-10 shadow-2xl shadow-red-900/20"
            >
                <div className="mb-6 flex justify-center">
                    <AnimatePresence mode="wait">
                        {status === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, rotate: -180 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="w-20 h-20 bg-surface-800 rounded-2xl flex items-center justify-center border border-white/5"
                            >
                                <svg className="h-8 w-8 animate-spin text-red-400" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </motion.div>
                        )}
                        {status === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-20 h-20 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/20"
                            >
                                <HiCheck size={40} />
                            </motion.div>
                        )}
                        {status === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-20 h-20 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/20"
                            >
                                <HiX size={40} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <h1 className="text-2xl font-bold text-surface-50 mb-3">
                    {status === 'loading' ? t('cancellation.processing', 'Processando...') : status === 'success' ? t('cancellation.cancelled', 'Cancelado') : t('cancellation.oops', 'Ops!')}
                </h1>

                <p className="text-surface-200/70 leading-relaxed mb-8">
                    {status === 'loading' ? t('cancellation.loadingDesc', 'Aguarde um momento enquanto cancelamos seu agendamento.') : message}
                </p>

                {status !== 'loading' && (
                    <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-center gap-2 text-surface-200/40 text-sm">
                            <HiLightningBolt />
                            <span>Powered by Velo</span>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
