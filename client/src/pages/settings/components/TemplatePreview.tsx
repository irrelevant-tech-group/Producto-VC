import React from 'react';
import { X } from 'lucide-react';
import { DueDiligenceTemplate } from '../../../hooks/useDueDiligence';

interface Props {
  template: DueDiligenceTemplate;
  onClose: () => void;
}

export default function TemplatePreview({ template, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Template Preview</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          <ul className="space-y-2">
            {template.categories.map(cat => (
              <li key={cat.key} className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-sm text-gray-600">Required: {cat.required}</span>
                </div>
                {cat.description && <p className="text-sm text-gray-500 mt-1">{cat.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
