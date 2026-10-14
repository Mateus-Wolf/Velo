import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useLoadingStore from '../store/useLoadingStore';

// Só exibe o overlay se o carregamento durar mais que isso — requisições rápidas
// não devem piscar uma tela bloqueada.
const SHOW_DELAY_MS = 400;

export default function GlobalLoading() {
    const loadingCount = useLoadingStore((state) => state.loadingCount);
    const isLoading = loadingCount > 0;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setVisible(false);
            return undefined;
        }
        const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        return () => clearTimeout(timer);
    }, [isLoading]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
