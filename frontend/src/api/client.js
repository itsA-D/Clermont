import axios from 'axios';

// Resolve API base URL with sensible defaults:
// 1) Vite env override: VITE_API_BASE_URL (e.g., http://localhost:3001/api or https://api.example.com/v1)
// 2) If running on Vite dev (5173), default to backend at 3000
// 3) Otherwise, assume same-origin "/api" (useful in production behind a reverse proxy)
const envBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? String(import.meta.env.VITE_API_BASE_URL) : '';
const fallbackSameOrigin = (typeof window !== 'undefined' && window.location) ? `${window.location.origin.replace(/\/$/, '')}/api` : 'http://localhost:3000/api';
const API_BASE_URL = (envBase || fallbackSameOrigin).replace(/\/$/, '');

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Authorization header if token present
apiClient.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (_) {}
    return config;
});

// Error handling interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
    }
);

// Plans API
export const plansAPI = {
    getAll: (includeInactive = false) =>
        apiClient.get('/plans', { params: includeInactive ? { includeInactive: 'true' } : {} }),
    getById: (id) => apiClient.get(`/plans/${id}`),
    create: (planData) => apiClient.post('/plans', planData),
    update: (id, planData) => apiClient.put(`/plans/${id}`, planData),
};

// Subscriptions API
export const subscriptionsAPI = {
    purchase: (customerId, planId) =>
        apiClient.post('/subscriptions', { customerId, planId }),
    cancel: (id) => apiClient.delete(`/subscriptions/${id}`),
    list: (customerId) => apiClient.get('/subscriptions', { params: customerId ? { customerId } : {} }),
    changePlan: (subscriptionId, targetPlanId, idempotencyKey) =>
        apiClient.post(`/subscriptions/${subscriptionId}/change-plan`, { targetPlanId }, {
            headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
        }),
};

// Customers API
export const customersAPI = {
    getAll: () => apiClient.get('/customers'),
    create: (customerData) => apiClient.post('/customers', customerData),
};

// Products API
export const productsAPI = {
    list: (onlyActive = true) => apiClient.get('/products', { params: { active: String(onlyActive) } }),
};

// Prices API
export const pricesAPI = {
    list: (productId) => apiClient.get('/prices', { params: productId ? { productId } : {} }),
};

// Checkout Sessions API
export const checkoutAPI = {
    createSession: (customerId, priceId) => apiClient.post('/checkout-sessions', { customerId, priceId }),
    getSession: (id) => apiClient.get(`/checkout-sessions/${id}`),
    completeSession: (id, idempotencyKey) => apiClient.post(`/checkout-sessions/${id}/complete`, {}, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
    }),
};

// Auth API
export const authAPI = {
    signup: (email, password, name) => apiClient.post('/auth/signup', { email, password, name }),
    login: (email, password) => apiClient.post('/auth/login', { email, password }),
    me: () => apiClient.get('/auth/me'),
};

export default apiClient;
