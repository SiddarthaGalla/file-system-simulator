const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getProfile: () => request<any>('/auth/profile'),
  updateProfile: (payload: any) => request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  // Storage
  getDevices: () => request<any>('/storage'),
  getActiveDevice: () => request<any>('/storage/active'),
  createDevice: (payload: any) => request<any>('/storage', { method: 'POST', body: JSON.stringify(payload) }),
  getDevice: (id: number) => request<any>(`/storage/${id}`),
  activateDevice: (id: number) => request<any>(`/storage/${id}/activate`, { method: 'POST' }),
  resetDevice: (id: number) => request<any>(`/storage/${id}/reset`, { method: 'POST' }),
  deleteDevice: (id: number) => request<any>(`/storage/${id}`, { method: 'DELETE' }),
  getDeviceBlocks: (id: number) => request<any>(`/storage/${id}/blocks`),

  // Files
  getFiles: (params?: Record<string, any>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<any>(`/files${q ? `?${q}` : ''}`);
  },
  uploadFiles: (formData: FormData) => request<any>('/files/upload', { method: 'POST', body: formData }),
  getFile: (id: number) => request<any>(`/files/${id}`),
  downloadFileUrl: (id: number) => `${API_BASE}/files/${id}/download`,
  deleteFile: (id: number) => request<any>(`/files/${id}`, { method: 'DELETE' }),
  updateFile: (id: number, payload: any) => request<any>(`/files/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getFolders: (storageId?: number) => request<any>(`/files/folders${storageId ? `?storage_id=${storageId}` : ''}`),
  createFolder: (payload: any) => request<any>('/files/folders', { method: 'POST', body: JSON.stringify(payload) }),

  // Allocation
  getAllocationInfo: (storageId: number) => request<any>(`/allocation/${storageId}`),
  testAllocate: (payload: any) => request<any>('/allocation/allocate', { method: 'POST', body: JSON.stringify(payload) }),
  compareAllocation: (payload: any) => request<any>('/allocation/compare', { method: 'POST', body: JSON.stringify(payload) }),

  // Fragmentation
  scanFragmentation: (storageId?: number) => request<any>('/fragmentation/scan', { method: 'POST', body: JSON.stringify({ storage_id: storageId }) }),
  getFragmentation: (storageId: number) => request<any>(`/fragmentation/${storageId}`),

  // Optimization (GA)
  runGAOptimization: (payload: any) => request<any>('/optimization/run', { method: 'POST', body: JSON.stringify(payload) }),
  getGAOptimization: (id: number) => request<any>(`/optimization/${id}`),
  applyGAOptimization: (id: number) => request<any>(`/optimization/${id}/apply`, { method: 'POST' }),

  // Defragmentation
  runDefragmentation: (payload: any) => request<any>('/defragmentation/run', { method: 'POST', body: JSON.stringify(payload) }),
  getDefragHistory: (storageId?: number) => request<any>(`/defragmentation/history${storageId ? `?storage_id=${storageId}` : ''}`),

  // Analytics
  getDashboard: (storageId?: number) => request<any>(`/analytics/dashboard${storageId ? `?storage_id=${storageId}` : ''}`),
  getPerformance: (storageId?: number) => request<any>(`/analytics/performance${storageId ? `?storage_id=${storageId}` : ''}`),
  getComparison: (storageId?: number) => request<any>(`/analytics/comparison${storageId ? `?storage_id=${storageId}` : ''}`),

  // Reports
  getReports: (params?: Record<string, any>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<any>(`/reports${q ? `?${q}` : ''}`);
  },
  exportPdfUrl: (storageId?: number) => `${API_BASE}/reports/export/pdf${storageId ? `?storage_id=${storageId}` : ''}`,
  exportCsvUrl: (type: 'files' | 'blocks', storageId?: number) => `${API_BASE}/reports/export/csv?type=${type}${storageId ? `&storage_id=${storageId}` : ''}`,

  // Demo
  seedDemo: (storageId?: number) => request<any>('/demo/seed', { method: 'POST', body: JSON.stringify({ storage_id: storageId }) }),
  clearDemo: (storageId?: number) => request<any>('/demo/clear', { method: 'POST', body: JSON.stringify({ storage_id: storageId }) }),

  // Disk Scheduling
  simulateScheduling: (payload: any) => request<any>('/scheduling/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  compareScheduling: (storageId?: number) => request<any>(`/scheduling/compare${storageId ? `?storage_id=${storageId}` : ''}`),

  // Workload Generator
  getWorkloadProfiles: () => request<any>('/workload/profiles'),
  runWorkload: (payload: any) => request<any>('/workload/run', { method: 'POST', body: JSON.stringify(payload) }),
};

