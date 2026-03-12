import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineX,
    HiOutlineCheckCircle,
    HiOutlineCurrencyDollar,
} from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';

const PAYMENT_METHODS = [
    { value: 'pix', label: 'PIX', icon: '📱' },
    { value: 'credit', label: 'Crédito', icon: '💳' },
    { value: 'debit', label: 'Débito', icon: '💳' },
    { value: 'boleto', label: 'Boleto', icon: '📄' },
    { value: 'cash', label: 'Dinheiro', icon: '💵' },
    { value: 'free', label: 'Grátis', icon: '🎁' },
];

export default function CompleteAppointmentModal({ isOpen, onClose, onConfirm, loading, appointment }) {
    const { t } = useTranslation();
    const [paidValue, setPaidValue] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [installments, setInstallments] = useState(1);

    useEffect(() => {
        if (isOpen && appointment) {
            setPaidValue(appointment.price != null ? formatCurrencyInput(appointment.price) : '');
            setPaymentMethod('');
            setInstallments(1);
        }
    }, [isOpen, appointment]);

    const isFree = paymentMethod === 'free';

    const handleConfirm = () => {
        onConfirm({
            paid_value: isFree ? null : (paidValue ? parseCurrencyInput(paidValue) : null),
            payment_method: paymentMethod || null,
            installments: paymentMethod === 'credit' ? installments : null,
        });
    };

    const fmtPrice = (v) => {
        if (v == null || v === 0) return null;
        return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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
                        className="relative z-10 w-full max-w-md rounded-2xl glass-strong p-6 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                                    <HiOutlineCheckCircle className="text-emerald-400" size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-surface-50">
                                        {t('complete.title', 'Concluir Atendimento')}
                                    </h3>
                                    {appointment?.client_name && (
                                        <p className="text-xs text-surface-200/50">{appointment.client_name}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="rounded-xl p-2 text-surface-200/50 hover:bg-white/10 hover:text-white transition-all">
                                <HiOutlineX size={20} />
                            </button>
                        </div>

                        {/* Valor estimado */}
                        {appointment?.price > 0 && (
                            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
                                <span className="text-xs text-surface-200/60">
                                    {t('complete.estimatedPrice', 'Valor estimado')}
                                </span>
                                <span className="text-sm font-bold text-emerald-400">
                                    {fmtPrice(appointment.price)}
                                </span>
                            </div>
                        )}

                        {/* Forma de Pagamento */}
                        <div className="mb-4">
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                💳 {t('complete.paymentMethod', 'Forma de pagamento')}
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {PAYMENT_METHODS.map((m) => (
                                    <motion.button
                                        key={m.value}
                                        type="button"
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setPaymentMethod(m.value)}
                                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                                            paymentMethod === m.value
                                                ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                                                : 'border-white/10 bg-white/[0.02] text-surface-200/60 hover:bg-white/5'
                                        }`}
                                    >
                                        <span className="text-base">{m.icon}</span>
                                        {m.label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Parcelas (Apenas Crédito) */}
                        <AnimatePresence>
                            {paymentMethod === 'credit' && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }} 
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 overflow-hidden"
                                >
                                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                        ⏱️ {t('complete.installments', 'Número de parcelas')}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="w-1/3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1} className="bg-surface-800 text-surface-50">
                                                    {i + 1}x
                                                </option>
                                            ))}
                                        </select>
                                        
                                        {installments > 1 && paidValue && (
                                            <div className="flex-1 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm flex items-center justify-between">
                                                <span className="text-surface-200/60 text-xs">{installments}x de</span>
                                                <span className="font-bold text-brand-400">{fmtPrice(parseCurrencyInput(paidValue) / installments)}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Valor Pago */}
                        <div className="mb-6">
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-200/70">
                                <HiOutlineCurrencyDollar size={16} className="text-surface-200/40" />
                                {t('complete.paidValue', 'Valor recebido')}
                            </label>
                            <div className="relative">
                                <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium ${isFree ? 'text-surface-200/20' : 'text-surface-200/40'}`}>
                                    R$
                                </span>
                                <input
                                    type="text"
                                    value={isFree ? '' : paidValue}
                                    onChange={(e) => setPaidValue(formatCurrencyInput(e.target.value))}
                                    disabled={isFree}
                                    placeholder={isFree ? 'Grátis' : '0,00'}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-surface-50 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                            </div>
                            {isFree && (
                                <p className="mt-1.5 text-xs text-amber-400/70">
                                    🎁 {t('complete.freeInfo', 'Atendimento gratuito — nenhum valor será registrado.')}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-surface-200/70 hover:bg-white/10 transition-all"
                            >
                                {t('complete.cancel', 'Voltar')}
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={handleConfirm}
                                disabled={loading || !paymentMethod}
                                className="flex-1 rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <>
                                        <HiOutlineCheckCircle size={16} />
                                        {t('complete.confirm', 'Concluir')}
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
