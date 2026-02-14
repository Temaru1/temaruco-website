import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
// Don't add /api again if it's already in the URL
const API = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

// Debug log to check if env variable is loaded
console.log('API_URL:', API_URL);
console.log('Full API path:', API);

// Configure axios to send cookies
axios.defaults.withCredentials = true;

// Auth helper
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auth APIs
export const register = (userData) => axios.post(`${API}/auth/register`, userData);
export const login = (credentials) => axios.post(`${API}/auth/login`, credentials);
export const getMe = () => axios.get(`${API}/auth/me`, { headers: getAuthHeaders() });
export const verifyEmail = (token) => axios.get(`${API}/auth/verify/${token}`);

export const updateAddress = (address) =>
  axios.patch(`${API}/auth/update-address`, { address }, {
    params: { address },
    withCredentials: true
  });

// Quote API (public - no credentials needed)
export const calculateQuote = (quoteData) => axios.post(`${API}/quote/calculate`, quoteData, { withCredentials: false });

// Order APIs
export const createBulkOrder = (formData) => 
  axios.post(`${API}/orders/bulk`, formData, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
  });

export const createPODOrder = (formData) =>
  axios.post(`${API}/orders/pod`, formData, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
  });

export const getMyOrders = () =>
  axios.get(`${API}/orders/my-orders`, { headers: getAuthHeaders() });

export const getOrder = (orderId) =>
  axios.get(`${API}/orders/${orderId}`, { headers: getAuthHeaders() });

// Boutique APIs (public - no credentials needed)
export const getBoutiqueProducts = (category) => {
  const url = category ? `${API}/boutique/products?category=${category}` : `${API}/boutique/products`;
  return axios.get(url, { withCredentials: false });
};

export const getProduct = (productId) => axios.get(`${API}/boutique/products/${productId}`, { withCredentials: false });

// Payment APIs
export const initializePayment = (paymentData) =>
  axios.post(`${API}/payments/initialize`, paymentData);

export const verifyPayment = (reference) =>
  axios.get(`${API}/payments/verify/${reference}`);

// Admin APIs
export const getAdminDashboard = () =>
  axios.get(`${API}/admin/dashboard`, { headers: getAuthHeaders() });

export const getAllOrders = (params) =>
  axios.get(`${API}/admin/orders`, {
    headers: getAuthHeaders(),
    params
  });

export const updateOrderStatus = (orderId, status, notes) =>
  axios.patch(`${API}/admin/orders/${orderId}/status`, { status, notes }, {
    headers: getAuthHeaders(),
    params: { status, notes }
  });

export const createProduct = (productData) =>
  axios.post(`${API}/admin/products`, productData, { headers: getAuthHeaders() });


// Boutique Orders
export const createBoutiqueOrder = (formData) =>
  axios.post(`${API}/orders/boutique`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' },
    withCredentials: false 
  });

export const getNotifications = () =>
  axios.get(`${API}/admin/notifications`, { headers: getAuthHeaders() });

export const markNotificationRead = (notificationId) =>
  axios.patch(`${API}/admin/notifications/${notificationId}/read`, {}, { headers: getAuthHeaders() });

// CMS APIs
export const getCMSContent = () => axios.get(`${API}/cms/content`);
export const getCMSContentByKey = (key) => axios.get(`${API}/cms/content/${key}`);
export const getPricing = () => axios.get(`${API}/pricing`, { withCredentials: false });
export const updateCMSContent = (contentData) =>
  axios.post(`${API}/admin/cms/content`, contentData, { headers: getAuthHeaders() });

export const getCMSSettings = () =>
  axios.get(`${API}/admin/cms/settings`, { headers: getAuthHeaders() });
export const updateCMSSettings = (settings) =>
  axios.post(`${API}/admin/cms/settings`, settings, { headers: getAuthHeaders() });


// Admin Helper APIs
export const lookupOrderByCode = (code) =>
  axios.get(`${API}/admin/orders/lookup/${code}`, { headers: getAuthHeaders() });

export const createWalkInOrder = (formData) =>
  axios.post(`${API}/admin/orders/walk-in`, formData, { 
    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
  });

// Manual Quotes/Invoices APIs
export const createManualQuote = (quoteData) =>
  axios.post(`${API}/admin/quotes/create`, quoteData, { headers: getAuthHeaders() });

export const getManualQuotes = (quoteType) => {
  const url = quoteType ? `${API}/admin/quotes?quote_type=${quoteType}` : `${API}/admin/quotes`;
  return axios.get(url, { headers: getAuthHeaders() });
};

export const getManualQuote = (quoteId) =>
  axios.get(`${API}/admin/quotes/${quoteId}`, { headers: getAuthHeaders() });

export const updateManualQuote = (quoteId, updateData) =>
  axios.patch(`${API}/admin/quotes/${quoteId}`, updateData, { headers: getAuthHeaders() });

export const deleteManualQuote = (quoteId) =>
  axios.delete(`${API}/admin/quotes/${quoteId}`, { headers: getAuthHeaders() });

export const sendQuoteEmail = (quoteId) =>
  axios.post(`${API}/admin/quotes/${quoteId}/send-email`, {}, { headers: getAuthHeaders() });

// Reminder Settings APIs
export const getReminderSettings = () =>
  axios.get(`${API}/admin/settings/reminders`, { headers: getAuthHeaders() });

export const updateReminderSettings = (settings) =>
  axios.put(`${API}/admin/settings/reminders`, settings, { headers: getAuthHeaders() });

export const getReminderStatus = () =>
  axios.get(`${API}/admin/quotes/reminder-status`, { headers: getAuthHeaders() });

export const getEmailTrackingStats = () =>
  axios.get(`${API}/admin/email-tracking`, { headers: getAuthHeaders() });

// Receipts APIs
export const getReceipts = () =>
  axios.get(`${API}/admin/receipts`, { headers: getAuthHeaders() });

export const getReceipt = (receiptId) =>
  axios.get(`${API}/receipts/${receiptId}`);

// Custom Order Requests APIs
export const createCustomOrderRequest = (formData) =>
  axios.post(`${API}/orders/custom-request`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    withCredentials: true
  });

export const getMyCustomRequests = () =>
  axios.get(`${API}/orders/my-custom-requests`, { withCredentials: true });

export const getAllCustomRequests = (status) => {
  const url = status ? `${API}/admin/custom-requests?status=${status}` : `${API}/admin/custom-requests`;
  return axios.get(url, { withCredentials: true });
};

export const getCustomRequest = (requestId) =>
  axios.get(`${API}/admin/custom-requests/${requestId}`, { withCredentials: true });

export const updateCustomRequestStatus = (requestId, status, adminNotes) =>
  axios.patch(`${API}/admin/custom-requests/${requestId}/status`, 
    { status, admin_notes: adminNotes },
    {
      params: { status, admin_notes: adminNotes },
      withCredentials: true
    }
  );

// Super Admin APIs
export const createAdmin = (adminData) =>
  axios.post(`${API}/super-admin/create-admin`, adminData, { withCredentials: true });

export const getAllAdmins = () =>
  axios.get(`${API}/super-admin/admins`, { withCredentials: true });

export const deleteAdmin = (userId) =>
  axios.delete(`${API}/super-admin/admins/${userId}`, { withCredentials: true });

export const getAdminActions = () =>
  axios.get(`${API}/super-admin/actions`, { withCredentials: true });


// Default axios instance with auth headers for direct API calls
const apiInstance = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: getAuthHeaders()
});

// Add request interceptor to always include fresh auth headers
apiInstance.interceptors.request.use(
  (config) => {
    const authHeaders = getAuthHeaders();
    config.headers = { ...config.headers, ...authHeaders };
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiInstance;

