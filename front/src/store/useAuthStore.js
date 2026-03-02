import { create } from 'zustand';
import api from '../services/api';

function getDeviceId() {
    let id = localStorage.getItem('velo_device_id');
    if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('velo_device_id', id);
    }
    return id;
}

const useAuthStore = create((set) => ({
    user: JSON.parse(localStorage.getItem('velo_user') || sessionStorage.getItem('velo_user') || 'null'),
    token: localStorage.getItem('velo_token') || sessionStorage.getItem('velo_token') || null,
    isLoading: false,
    error: null,

    login: async (email, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            formData.append('device_id', getDeviceId());

            const { data } = await api.post(`/auth/login?remember_me=${rememberMe}`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            if (data.requires_2fa) {
                set({ isLoading: false });
                return { success: false, requires2fa: true, tempToken: data.temp_token };
            }

            const storage = rememberMe ? localStorage : sessionStorage;

            storage.setItem('velo_token', data.access_token);
            storage.setItem('velo_refresh_token', data.refresh_token);

            // Fetch user info
            const userRes = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${data.access_token}` },
            });

            storage.setItem('velo_user', JSON.stringify(userRes.data));

            set({
                token: data.access_token,
                user: userRes.data,
                isLoading: false,
            });

            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.detail || 'Erro ao fazer login. Tente novamente.';
            set({ error: message, isLoading: false });
            return { success: false };
        }
    },

    verify2fa: async (tempToken, code, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/2fa/verify-login', {
                temp_token: tempToken,
                code: code,
                device_id: getDeviceId()
            });

            const storage = rememberMe ? localStorage : sessionStorage;

            storage.setItem('velo_token', data.access_token);
            storage.setItem('velo_refresh_token', data.refresh_token);

            // Fetch user info
            const userRes = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${data.access_token}` },
            });

            storage.setItem('velo_user', JSON.stringify(userRes.data));

            set({
                token: data.access_token,
                user: userRes.data,
                isLoading: false,
            });

            return { success: true };
        } catch (err) {
            const message = err.response?.data?.detail || 'Código inválido ou expirado.';
            set({ error: message, isLoading: false });
            return { success: false };
        }
    },

    register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/auth/register', { name, email, password });

            // Auto-login after register
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const { data } = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            localStorage.setItem('velo_token', data.access_token);
            localStorage.setItem('velo_refresh_token', data.refresh_token);

            const userRes = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${data.access_token}` },
            });

            localStorage.setItem('velo_user', JSON.stringify(userRes.data));

            set({
                token: data.access_token,
                user: userRes.data,
                isLoading: false,
            });

            return { success: true };
        } catch (err) {
            const message =
                err.response?.data?.detail || 'Erro ao criar conta. Tente novamente.';
            set({ error: message, isLoading: false });
            return { success: false };
        }
    },

    logout: () => {
        localStorage.removeItem('velo_token');
        localStorage.removeItem('velo_refresh_token');
        localStorage.removeItem('velo_user');
        sessionStorage.removeItem('velo_token');
        sessionStorage.removeItem('velo_refresh_token');
        sessionStorage.removeItem('velo_user');
        set({ user: null, token: null, error: null });
    },

    clearError: () => set({ error: null }),

    setUser: (user) => {
        localStorage.setItem('velo_user', JSON.stringify(user));
        set({ user });
    },
}));

export default useAuthStore;
