import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineExclamation, HiOutlineX } from 'react-icons/hi';

export default function ConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "Confirmar", 
    cancelText = "Cancelar",
    variant = "danger" // danger, warning, info
}) {
    if (!isOpen) return null;

    const colors = {
        danger: "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20",
        warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20",
        info: "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20"
    };

    const iconColors = {
        danger: "text-red-400 bg-red-400/10",
        warning: "text-amber-400 bg-amber-400/10",
        info: "text-brand-400 bg-brand-400/10"
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-surface-900 p-6 shadow-2xl"
                >
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-4 text-surface-400 hover:text-surface-200 transition-colors"
                    >
                        <HiOutlineX size={20} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconColors[variant]}`}>
                            <HiOutlineExclamation size={24} />
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-surface-50">{title}</h3>
                            <p className="mt-2 text-sm text-surface-400 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-surface-200 hover:bg-white/10 transition-all"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg transition-all ${colors[variant]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
