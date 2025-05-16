import { apiRequest } from './queryClient';

// Dashboard API
export const fetchDashboardMetrics = async () => {
  const res = await fetch('/api/dashboard/metrics');
  if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
  return res.json();
};

export const fetchRecentActivities = async (limit = 10) => {
  const res = await fetch(`/api/dashboard/activities?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent activities');
  return res.json();
};

// Startup API
export const fetchStartups = async () => {
  const res = await fetch('/api/startups');
  if (!res.ok) throw new Error('Failed to fetch startups');
  return res.json();
};

export const fetchStartup = async (id: string) => {
  const res = await fetch(`/api/startups/${id}`);
  if (!res.ok) throw new Error('Failed to fetch startup details');
  return res.json();
};

export const createStartup = async (data: any) => {
  return apiRequest('POST', '/api/startups', data);
};

export const fetchDueDiligenceProgress = async (id: string) => {
  const res = await fetch(`/api/startups/${id}/due-diligence`);
  if (!res.ok) throw new Error('Failed to fetch due diligence progress');
  return res.json();
};

export const analyzeStartupAlignment = async (id: string) => {
  const res = await fetch(`/api/startups/${id}/alignment`);
  if (!res.ok) throw new Error('Failed to analyze startup alignment');
  return res.json();
};

// Document API
export const fetchStartupDocuments = async (startupId: string) => {
  const res = await fetch(`/api/startups/${startupId}/documents`);
  if (!res.ok) throw new Error('Failed to fetch startup documents');
  return res.json();
};

export const uploadDocument = async (formData: FormData) => {
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to upload document');
  }
  
  return response.json();
};

// AI Query API
export const askAI = async (data: { startupId?: string, question: string, includeSourceDocuments?: boolean }) => {
  const response = await apiRequest('POST', '/api/ai/query', data);
  return response.json();
};

// Memo API
export const fetchStartupMemos = async (startupId: string) => {
  const res = await fetch(`/api/startups/${startupId}/memos`);
  if (!res.ok) throw new Error('Failed to fetch startup memos');
  return res.json();
};

export const fetchMemo = async (id: string) => {
  const res = await fetch(`/api/memos/${id}`);
  if (!res.ok) throw new Error('Failed to fetch memo details');
  return res.json();
};

export const generateMemo = async (startupId: string, sections?: string[]) => {
  const response = await apiRequest('POST', `/api/startups/${startupId}/memos/generate`, { sections });
  return response.json();
};

export const updateMemo = async (id: string, data: any) => {
  const response = await apiRequest('PATCH', `/api/memos/${id}`, data);
  return response.json();
};

export const exportMemo = async (id: string, format: 'pdf' | 'docx' | 'slides') => {
  const response = await apiRequest('POST', `/api/memos/${id}/export/${format}`, {});
  return response.json();
};
