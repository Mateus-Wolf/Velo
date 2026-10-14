import { motion as Motion, useReducedMotion } from 'framer-motion';

export default function AppointmentReveal({ children, ...props }) {
    const reduceMotion = useReducedMotion();

    return (
        <Motion.div
            {...props}
            layout={reduceMotion ? false : 'position'}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.97 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                boxShadow: reduceMotion ? 'none' : [
                    '0 0 0 0 rgba(129, 140, 248, 0)',
                    '0 0 0 3px rgba(129, 140, 248, 0.18)',
                    '0 0 0 0 rgba(129, 140, 248, 0)',
                ],
            }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            transition={{
                duration: reduceMotion ? 0.12 : 0.4,
                ease: [0.22, 1, 0.36, 1],
                layout: { type: 'spring', stiffness: 350, damping: 32 },
                boxShadow: { duration: 1.1, times: [0, 0.3, 1] },
            }}
        >
            {children}
        </Motion.div>
    );
}
