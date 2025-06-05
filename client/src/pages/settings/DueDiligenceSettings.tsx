import React, { useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import {
  useDueDiligenceTemplates,
  useActiveDDTemplate,
  useActivateDDTemplate,
  useDeleteDDTemplate,
  DueDiligenceTemplate
} from '../../hooks/useDueDiligence';
import DueDiligenceTemplateForm from './components/DueDiligenceTemplateForm';
import TemplateCard from './components/TemplateCard';
import TemplatePreview from './components/TemplatePreview';

export default function DueDiligenceSettings() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DueDiligenceTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DueDiligenceTemplate | null>(null);

  const { data: templates } = useDueDiligenceTemplates();
  const { data: activeTemplate } = useActiveDDTemplate();
  const activateMutation = useActivateDDTemplate();
  const deleteMutation = useDeleteDDTemplate();

  const activateTemplate = (id: string) => activateMutation.mutate(id);
  const deleteTemplate = (id: string) => {
    if (templates && templates.length <= 1) {
      alert('Cannot delete the only template. Create another first.');
      return;
    }
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Due Diligence Configuration</h1>
          <p className="text-gray-600 mt-1">Configure the document categories and requirements for your due diligence process.</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {activeTemplate && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Active Template</h3>
          </div>
          <p className="text-green-700">{activeTemplate.name}</p>
          <p className="text-sm text-green-600 mt-1">{activeTemplate.categories.length} categories configured</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isActive={template.id === activeTemplate?.id}
            onEdit={() => setEditingTemplate(template)}
            onPreview={() => setPreviewTemplate(template)}
            onActivate={() => activateTemplate(template.id)}
            onDelete={() => deleteTemplate(template.id)}
          />
        ))}
      </div>

      {(showCreateForm || editingTemplate) && (
        <DueDiligenceTemplateForm
          template={editingTemplate || undefined}
          onClose={() => { setShowCreateForm(false); setEditingTemplate(null); }}
          onSave={() => { setShowCreateForm(false); setEditingTemplate(null); }}
        />
      )}

      {previewTemplate && (
        <TemplatePreview template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}
