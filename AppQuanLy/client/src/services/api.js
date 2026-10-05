const PRODUCTION_API = 'https://api.newstartour.vn/quanly';

export const isElectronApp = () => window.navigator.userAgent.toLowerCase().includes('electron');

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const isElectron = isElectronApp();
  const savedServer = isElectron ? localStorage.getItem('travelops_api_server') : null;

  if (savedServer) return `${trimTrailingSlash(savedServer)}/api`;
  if (isElectron) return `${PRODUCTION_API}/api`;
  if (import.meta.env.VITE_API_URL) return trimTrailingSlash(import.meta.env.VITE_API_URL);
  if (import.meta.env.DEV) return `http://${window.location.hostname}:3001/api`;
  return '/api';
};

export const getApiOrigin = () => getApiBaseUrl().replace(/\/api$/, '');

export const getSocketConfig = () => {
  const apiOrigin = getApiOrigin();

  if (apiOrigin.includes('/quanly')) {
    return {
      url: apiOrigin.replace('/quanly', ''),
      options: { path: '/quanly/socket.io' }
    };
  }

  return { url: apiOrigin, options: {} };
};

const API_BASE = getApiBaseUrl();

/**
 * API client wrapper
 * Auto-attaches JWT token và xử lý errors
 */
class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('travelops_token');
  }

  setToken(token) {
    localStorage.setItem('travelops_token', token);
  }

  removeToken() {
    localStorage.removeItem('travelops_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Cache-Control': 'no-cache',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        cache: options.cache || 'no-store',
      });

      const contentType = response.headers.get('content-type') || '';
      const hasBody = response.status !== 204 && response.status !== 205;
      const data = hasBody && contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok) {
        if (response.status === 401) {
          this.removeToken();
          const isElectron = isElectronApp();
          if (isElectron) {
            window.location.hash = '#/login';
          } else {
            window.location.href = '/quanly/login';
          }
          return;
        }
        throw new Error(data?.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối đến server');
      }
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  async getBlob(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
    if (!response.ok) {
      let message = 'Không thể tải file';
      try { message = (await response.json()).error || message; } catch { /* empty */ }
      throw new Error(message);
    }
    return response.blob();
  }
}

const api = new ApiService();
export default api;
