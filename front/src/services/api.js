import axios from 'axios';
import useLoadingStore from '../store/useLoadingStore';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    useLoadingStore.getState().increment();
    const token = localStorage.getItem('velo_token') || sessionStorage.getItem('velo_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ------- Refresh-token logic -------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        useLoadingStore.getState().decrement();
        return response;
    },
    async (error) => {
        useLoadingStore.getState().decrement();
        const originalRequest = error.config;

        // If 401 and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't try to refresh if the failing request IS the refresh endpoint
            if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
                localStorage.removeItem('velo_token');
                localStorage.removeItem('velo_refresh_token');
                localStorage.removeItem('velo_user');
                sessionStorage.removeItem('velo_token');
                sessionStorage.removeItem('velo_refresh_token');
                sessionStorage.removeItem('velo_user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue this request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;
            useLoadingStore.getState().increment();

            const refreshToken = localStorage.getItem('velo_refresh_token') || sessionStorage.getItem('velo_refresh_token');
            if (!refreshToken) {
                isRefreshing = false;
                useLoadingStore.getState().decrement();
                localStorage.removeItem('velo_token');
                localStorage.removeItem('velo_user');
                sessionStorage.removeItem('velo_token');
                sessionStorage.removeItem('velo_user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post('/api/v1/auth/refresh', {
                    refresh_token: refreshToken,
                });

                const storage = localStorage.getItem('velo_refresh_token') ? localStorage : sessionStorage;
                storage.setItem('velo_token', data.access_token);
                storage.setItem('velo_refresh_token', data.refresh_token);

                api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

                processQueue(null, data.access_token);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('velo_token');
                localStorage.removeItem('velo_refresh_token');
                localStorage.removeItem('velo_user');
                sessionStorage.removeItem('velo_token');
                sessionStorage.removeItem('velo_refresh_token');
                sessionStorage.removeItem('velo_user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                useLoadingStore.getState().decrement();
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
