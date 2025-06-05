import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

export interface DueDiligenceCategory {
  key: string;
  name: string;
  required: number;
  importance: 'high' | 'medium' | 'low';
  description: string;
  order: number;
  documentTypes?: string[];
  isDefault: boolean;
}

export interface DueDiligenceTemplate {
  id: string;
  fundId: string;
  name: string;
  isActive: boolean;
  categories: DueDiligenceCategory[];
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

// Fetch all templates
export function useDueDiligenceTemplates() {
  return useQuery({
    queryKey: ['due-diligence', 'templates'],
    queryFn: async (): Promise<DueDiligenceTemplate[]> => {
      const res = await apiRequest('GET', '/api/due-diligence/templates');
      return res.json();
    }
  });
}

// Fetch active template
export function useActiveDDTemplate() {
  return useQuery({
    queryKey: ['due-diligence', 'active-template'],
    queryFn: async (): Promise<DueDiligenceTemplate> => {
      const res = await apiRequest('GET', '/api/due-diligence/template/active');
      return res.json();
    }
  });
}

// Fetch default categories
export function useDefaultDDCategories() {
  return useQuery({
    queryKey: ['due-diligence', 'default-categories'],
    queryFn: async (): Promise<DueDiligenceCategory[]> => {
      const res = await apiRequest('GET', '/api/due-diligence/default-categories');
      return res.json();
    }
  });
}

// Create template
export function useCreateDDTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: { name: string; categories: DueDiligenceCategory[] }) => {
      const res = await apiRequest('POST', '/api/due-diligence/templates', template);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-diligence'] });
    }
  });
}

// Update template
export function useUpdateDDTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...template }: { id: string; name?: string; categories?: DueDiligenceCategory[] }) => {
      const res = await apiRequest('PATCH', `/api/due-diligence/templates/${id}`, template);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-diligence'] });
    }
  });
}

// Activate template
export function useActivateDDTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest('POST', `/api/due-diligence/templates/${templateId}/activate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-diligence'] });
    }
  });
}

// Delete template
export function useDeleteDDTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest('DELETE', `/api/due-diligence/templates/${templateId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-diligence'] });
    }
  });
}
