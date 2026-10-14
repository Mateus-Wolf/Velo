/**
 * Camada de cache dinâmico (TanStack Query).
 *
 * Princípios:
 *  1. Cada recurso tem uma chave própria (`keys`). Listas e detalhes ficam em chaves distintas.
 *  2. Ao alterar UMA entidade, só aquela entidade é atualizada nas listas já em cache
 *     (`patchEntity` / `addEntity` / `removeEntity`) — nunca refazemos a lista inteira.
 *  3. Dados agregados (dashboard/financeiro, contadores) são derivados de vários registros,
 *     então são apenas marcados como desatualizados (`invalidate*`). Eles só são refeitos
 *     quando alguém os está exibindo (ou na próxima vez que a tela abrir).
 */
import { queryClient } from './queryClient';

/* ---------------------------------- chaves --------------------------------- */
export const keys = {
    workplaces: {
        all: ['workplaces'],
        list: ['workplaces', 'list'],
        detail: (id) => ['workplaces', 'detail', String(id)],
        clients: (id, search = '') => ['workplaces', 'clients', String(id), search],
        clientsOf: (id) => ['workplaces', 'clients', String(id)],
        allClients: ['workplaces', 'clients'],
    },
    clients: {
        detail: (id) => ['clients', 'detail', String(id)],
    },
    appointments: {
        all: ['appointments'],
        list: (params = {}) => ['appointments', 'list', params],
        allLists: ['appointments', 'list'],
        pendingCount: ['appointments', 'pending-count'],
    },
    dashboard: {
        all: ['dashboard'],
        metrics: ['dashboard', 'metrics'],
    },
    financial: {
        goalHistory: ['financial', 'goal-history'],
    },
    notifications: {
        all: ['notifications'],
        unreadCount: ['notifications', 'unread-count'],
        history: ['notifications', 'history'],
    },
    team: {
        all: ['team'],
    },
    profile: ['profile'],
};

/* ------------------------- atualização cirúrgica de listas ------------------------- */

const isArray = Array.isArray;

/** Substitui/mescla apenas a entidade `entity` (por id) em todas as listas cujas chaves começam com `prefix`. */
export function patchEntity(prefix, entity) {
    queryClient.setQueriesData({ queryKey: prefix }, (old) => {
        if (!isArray(old)) return old;
        if (!old.some((e) => e.id === entity.id)) return old;
        return old.map((e) => (e.id === entity.id ? { ...e, ...entity } : e));
    });
}

/** Adiciona a entidade ao início das listas em cache (se ainda não existir). */
export function addEntity(prefix, entity, { append = false, sort } = {}) {
    queryClient.setQueriesData({ queryKey: prefix }, (old) => {
        if (!isArray(old)) return old;
        if (old.some((e) => e.id === entity.id)) return old;
        const next = append ? [...old, entity] : [entity, ...old];
        return sort ? next.sort(sort) : next;
    });
}

/** Remove a entidade (por id) das listas em cache. */
export function removeEntity(prefix, id) {
    queryClient.setQueriesData({ queryKey: prefix }, (old) => {
        if (!isArray(old)) return old;
        if (!old.some((e) => e.id === id)) return old;
        return old.filter((e) => e.id !== id);
    });
}

/* ------------------------------- invalidações -------------------------------- */

/** Dashboard + Financeiro (mesma fonte: /dashboard/metrics). */
export const invalidateDashboard = () =>
    queryClient.invalidateQueries({ queryKey: keys.dashboard.all });

/** Contadores do header (pendentes e notificações). */
export const invalidateCounters = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.appointments.pendingCount }),
    queryClient.invalidateQueries({ queryKey: keys.notifications.all }),
]);

/* ---------------------- efeitos de cada tipo de mutação ---------------------- */

/**
 * Chamar após criar/editar/cancelar/concluir/resolver agendamento(s).
 * `appointments`: um objeto ou array com os agendamentos retornados pela API.
 */
export function onAppointmentsChanged(appointments) {
    const list = isArray(appointments) ? appointments : [appointments];
    list.filter(Boolean).forEach((a) => {
        // Já existe em alguma lista? atualiza só ele; senão, inclui.
        patchEntity(keys.appointments.allLists, a);
        addEntity(keys.appointments.allLists, a, { append: true });
    });
    invalidateDashboard();
    invalidateCounters();
}

/** Agendamento removido de listas filtradas por status (ex.: pendentes resolvidos). */
export function onAppointmentLeftList(listParams, id) {
    removeEntity(keys.appointments.list(listParams), id);
}

/** Cancelamento em série altera vários registros: refaz só as listas de agendamentos. */
export function onAppointmentsBulkChanged() {
    queryClient.invalidateQueries({ queryKey: keys.appointments.allLists });
    invalidateDashboard();
    invalidateCounters();
}

export function onClientCreated(client, workplaceId) {
    queryClient.setQueryData(keys.clients.detail(client.id), client);
    if (workplaceId != null) {
        addEntity(keys.workplaces.clientsOf(workplaceId), client, {
            sort: (a, b) => a.name.localeCompare(b.name),
        });
    }
    invalidateDashboard(); // top locais / top clientes
}

export function onClientUpdated(client) {
    queryClient.setQueryData(keys.clients.detail(client.id), client);
    patchEntity(keys.workplaces.allClients, client);
    if (client.is_active === false) removeEntity(keys.workplaces.allClients, client.id);
    // Nome do cliente aparece nos agendamentos e no dashboard
    queryClient.setQueriesData({ queryKey: keys.appointments.allLists }, (old) => {
        if (!isArray(old)) return old;
        if (!old.some((a) => a.client_id === client.id)) return old;
        return old.map((a) => (a.client_id === client.id ? { ...a, client_name: client.name } : a));
    });
    invalidateDashboard();
}

export function onClientLinkChanged(workplaceIds) {
    workplaceIds.filter((w) => w != null).forEach((w) =>
        queryClient.invalidateQueries({ queryKey: keys.workplaces.clientsOf(w) }),
    );
    invalidateDashboard();
}

export function onWorkplaceCreated(wp) {
    queryClient.setQueryData(keys.workplaces.detail(wp.id), wp);
    addEntity(keys.workplaces.list, wp);
    invalidateDashboard();
}

export function onWorkplaceUpdated(wp) {
    queryClient.setQueryData(keys.workplaces.detail(wp.id), wp);
    patchEntity(keys.workplaces.list, wp);
    // Nome do local aparece nos agendamentos e no dashboard
    queryClient.setQueriesData({ queryKey: keys.appointments.allLists }, (old) => {
        if (!isArray(old)) return old;
        if (!old.some((a) => a.workplace_id === wp.id)) return old;
        return old.map((a) => (a.workplace_id === wp.id ? { ...a, workplace_name: wp.name } : a));
    });
    invalidateDashboard();
}

export function onWorkplaceDeleted(id) {
    removeEntity(keys.workplaces.list, id);
    queryClient.removeQueries({ queryKey: keys.workplaces.detail(id) });
    queryClient.removeQueries({ queryKey: keys.workplaces.clientsOf(id) });
    queryClient.invalidateQueries({ queryKey: keys.appointments.allLists });
    invalidateDashboard();
}

/** Meta mensal alterada: afeta dashboard e histórico de metas. */
export function onGoalChanged() {
    invalidateDashboard();
    queryClient.invalidateQueries({ queryKey: keys.financial.goalHistory });
}

/** Usado no logout para não vazar dados entre contas. */
export const clearCache = () => queryClient.clear();
