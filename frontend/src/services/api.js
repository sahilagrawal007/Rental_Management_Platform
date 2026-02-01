import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    signup: (data) => api.post('/auth/signup', data),
    me: () => api.get('/auth/me'),
};

// Products API
export const productAPI = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    checkAvailability: (id, data) => api.post(`/products/${id}/check-availability`, data),
    getMyProducts: () => api.get('/products/vendor/my-products'),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    togglePublish: (id, publish) => api.patch(`/products/${id}/publish`, { isPublished: publish }),
};

// Quotations API (Cart)
export const quotationAPI = {
    getAll: () => api.get('/quotations'),
    getById: (id) => api.get(`/quotations/${id}`),
    create: () => api.post('/quotations'),
    addItem: (id, data) => api.post(`/quotations/${id}/items`, data),
    updateItem: (quotationId, lineId, data) => api.put(`/quotations/${quotationId}/items/${lineId}`, data),
    removeItem: (quotationId, lineId) => api.delete(`/quotations/${quotationId}/items/${lineId}`),
    delete: (id) => api.delete(`/quotations/${id}`),
    // New flow methods
    submit: (id, data) => api.patch(`/quotations/${id}/submit`, data),
    cancel: (id) => api.patch(`/quotations/${id}/cancel`),
    getVendorPending: () => api.get('/quotations/vendor/pending'),
    approve: (id, data) => api.patch(`/quotations/${id}/approve`, data),
    reject: (id, data) => api.patch(`/quotations/${id}/reject`, data),
};

// Orders API
export const orderAPI = {
    getAll: () => api.get('/orders'),
    getById: (id) => api.get(`/orders/${id}`),
    confirmQuotation: (quotationId, data) => api.post(`/orders/confirm-quotation/${quotationId}`, data),
    cancel: (id) => api.patch(`/orders/${id}/cancel`),
};

// Invoices API
export const invoiceAPI = {
    getAll: () => api.get('/invoices'),
    getById: (id) => api.get(`/invoices/${id}`),
    makePayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
    getPayments: (id) => api.get(`/invoices/${id}/payments`),
    send: (id) => api.patch(`/invoices/${id}/send`),
    downloadPdf: (id) => `${API_URL}/invoices/${id}/pdf`,
};

export default api;
