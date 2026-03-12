import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { HiStar, HiCheck, HiX, HiLightningBolt } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

export default function ReviewPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');
    
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage(t('review.invalidLink', 'Link inválido. Nenhum token de avaliação foi fornecido.'));
        }
    }, [token, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (rating === 0) {
            setMessage(t('review.selectRating', 'Por favor, selecione uma nota de 1 a 5 estrelas.'));
            return;
        }

        setStatus('loading');
        try {
            const { data } = await api.post(`/public/appointments/review?token=${token}`, {
                rating,
                comment,
            });
            setStatus('success');
            setMessage(t('review.successMsg', 'Avaliação enviada com sucesso! Obrigado pelo seu feedback.'));
        } catch (err) {
            setStatus('error');
            setMessage(
                err.response?.data?.detail || 
                t('review.errorMsg', 'Ocorreu um erro ao enviar sua avaliação. Talvez o link tenha expirado.')
            );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 font-sans relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-surface-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center relative z-10 shadow-2xl shadow-indigo-900/20"
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
                                <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24">
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
                                className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20"
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
                        {status === 'idle' && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/20"
                            >
                                <HiStar size={40} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <h1 className="text-2xl font-bold text-surface-50 mb-3">
                    {status === 'idle' ? t('review.title', 'Avaliar Atendimento') :
                     status === 'loading' ? t('review.sending', 'Enviando...') : 
                     status === 'success' ? t('review.allGood', 'Muito obrigado!') : 
                     t('review.oops', 'Ops!')}
                </h1>

                <p className={`leading-relaxed mb-6 ${status === 'error' ? 'text-red-400' : 'text-surface-200/70'}`}>
                    {status === 'idle' 
                        ? t('review.subtitle', 'Como foi a sua experiência? Selecione uma nota abaixo.')
                        : message}
                </p>

                {status === 'idle' && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {/* Star Rating */}
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                >
                                    <HiStar 
                                        size={48} 
                                        className={`transition-colors duration-200 ${(hoverRating || rating) >= star ? 'text-amber-400' : 'text-surface-700'}`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Comment Section (Optional) */}
                        <div className="text-left">
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                {t('review.commentLabel', 'Comentário (opcional)')}
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows="3"
                                className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-50 placeholder-surface-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                                placeholder={t('review.commentPlaceholder', 'Conte-nos o que achou...')}
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={rating === 0}
                            className={`w-full py-3 rounded-xl font-medium transition-all ${
                                rating > 0 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                : 'bg-surface-800 text-surface-500 cursor-not-allowed'
                            }`}
                        >
                            {t('review.submitBtn', 'Enviar Avaliação')}
                        </button>
                    </form>
                )}

                {status !== 'loading' && (
                    <div className="pt-6 mt-6 border-t border-white/5">
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
