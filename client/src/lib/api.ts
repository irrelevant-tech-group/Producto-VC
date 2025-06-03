import { apiRequest } from './queryClient';

// Dashboard API
export const fetchDashboardMetrics = async (timeRange = '30d') => {
  const res = await fetch(`/api/dashboard/metrics?timeRange=${timeRange}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
  return res.json();
};

export const fetchRecentActivities = async (limit = 10, filter = null) => {
  const url = filter 
    ? `/api/dashboard/activities?limit=${limit}&filter=${filter}` 
    : `/api/dashboard/activities?limit=${limit}`;
  const res = await fetch(url);
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
  console.log("API Client: Creating startup with data:", data);
  
  // Required fields that need to be present
  if (!data.primaryContact) {
    console.error("Missing required primaryContact object");
    throw new Error("Primary contact information is required");
  }
  
  if (!data.firstContactDate) {
    console.error("Missing required firstContactDate");
    throw new Error("First contact date is required");
  }
  
  // Create a filtered copy of the data to only include what's expected by the backend
  const filteredData = {
    name: data.name,
    vertical: data.vertical,
    stage: data.stage,
    location: data.location,
    status: data.status || "active",
    currency: data.currency || "USD",
    firstContactDate: data.firstContactDate,
    primaryContact: data.primaryContact
  };

  // Only include amountSought if it exists and is a number
  if (data.amountSought !== undefined && data.amountSought !== null && !isNaN(Number(data.amountSought))) {
    filteredData.amountSought = Number(data.amountSought);
  }

  // Only include description if it exists and isn't empty
  if (data.description) {
    filteredData.description = data.description;
  }

  try {
    const response = await apiRequest('POST', '/api/startups', filteredData);
    return response.json();
  } catch (error) {
    console.error("Error in createStartup:", error);
    throw error;
  }
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

export const fetchDocument = async (id: string) => {
  const res = await fetch(`/api/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
};

export const regenerateStartupAlignment = async (id: string) => {
  const res = await apiRequest('POST', `/api/startups/${id}/regenerate-alignment`);
  if (!res.ok) throw new Error('Failed to regenerate startup alignment');
  return res.json();
};


// Investment Thesis API
export const fetchActiveThesis = async () => {
  const res = await fetch('/api/investment-thesis/active');
  if (!res.ok) throw new Error('Failed to fetch active thesis');
  return res.json();
};

export const fetchThesisHistory = async () => {
  const res = await fetch('/api/investment-thesis/history');
  if (!res.ok) throw new Error('Failed to fetch thesis history');
  return res.json();
};

export const createThesis = async (data: any) => {
  const response = await apiRequest('POST', '/api/investment-thesis', data);
  return response.json();
};

export const updateThesis = async (id: string, data: any) => {
  const response = await apiRequest('PATCH', `/api/investment-thesis/${id}`, data);
  return response.json();
};

export const activateThesis = async (id: string) => {
  const response = await apiRequest('POST', `/api/investment-thesis/${id}/activate`, {});
  return response.json();
};

export const deleteThesis = async (id: string) => {
  const response = await apiRequest('DELETE', `/api/investment-thesis/${id}`, {});
  return response.json();
};

export const previewThesisContext = async (id: string) => {
  const res = await fetch(`/api/investment-thesis/${id}/context-preview`);
  if (!res.ok) throw new Error('Failed to fetch thesis context preview');
  return res.json();
};