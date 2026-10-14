import { QueryClient } from '@tanstack/react-query';

/**
 * Cache global da aplicação.
 *
 * - staleTime: por quanto tempo um dado é considerado "fresco" (sem refetch ao reabrir a tela).
 *   Como todas as mutações atualizam/invalidam o cache cirurgicamente (ver services/cache.js),
 *   podemos manter esse tempo alto sem risco de mostrar dado velho.
 * - gcTime: por quanto tempo dados sem uso ficam em memória.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
