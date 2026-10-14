/**
 * Hooks de leitura com cache (TanStack Query).
 * Todas as leituras são `silent`: o overlay global bloqueante não aparece para elas —
 * cada tela mostra seu próprio skeleton/estado de carregamento, e dados em cache
 * aparecem instantaneamente.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from './api';
import { queryClient } from './queryClient';
import { keys } from './cache';

const get = (url, params) => api.get(url, { params, silent: true }).then((r) => r.data);

/* ------------------------------- Locais ------------------------------- */
export const useWorkplaces = () =>
    useQuery({ queryKey: keys.workplaces.list, queryFn: () => get('/workplaces/') });

export const useWorkplace = (id) =>
    useQuery({
        queryKey: keys.workplaces.detail(id),
        queryFn: () => get(`/workplaces/${id}`),
        enabled: id != null,
        // Abre instantaneamente a partir da listagem, se ela já estiver em cache.
        initialData: () => queryClient.getQueryData(keys.workplaces.list)?.find((w) => String(w.id) === String(id)),
        initialDataUpdatedAt: () => queryClient.getQueryState(keys.workplaces.list)?.dataUpdatedAt,
    });

export const useWorkplaceClients = (workplaceId, search = '') =>
    useQuery({
        queryKey: keys.workplaces.clients(workplaceId, search),
        queryFn: () => get(`/workplaces/${workplaceId}/clients`, search ? { name: search } : undefined),
        enabled: workplaceId != null,
        placeholderData: keepPreviousData,
    });

/* ----------------------------- Agendamentos ---------------------------- */
export const useAppointments = (params = {}) =>
    useQuery({
        queryKey: keys.appointments.list(params),
        queryFn: () => get('/appointments/', Object.keys(params).length ? params : undefined),
    });

export const usePendingCount = (enabled = true) =>
    useQuery({
        queryKey: keys.appointments.pendingCount,
        queryFn: () => get('/appointments/pending-count').then((d) => d.count),
        enabled,
    });

/* ------------------------- Dashboard / Financeiro ----------------------- */
export const useDashboardMetrics = () =>
    useQuery({ queryKey: keys.dashboard.metrics, queryFn: () => get('/dashboard/metrics') });

export const useGoalHistory = () =>
    useQuery({
        queryKey: keys.financial.goalHistory,
        queryFn: () => get('/financial/goal-history').then((d) => d.history || []),
    });

/* ------------------------------ Notificações ---------------------------- */
export const useUnreadCount = (enabled = true) =>
    useQuery({
        queryKey: keys.notifications.unreadCount,
        queryFn: () => get('/notifications/unread-count').then((d) => d.count),
        enabled,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

export const useNotificationHistory = (enabled = true) =>
    useQuery({
        queryKey: keys.notifications.history,
        queryFn: () => get('/notifications/history'),
        enabled,
        staleTime: 30_000,
    });
