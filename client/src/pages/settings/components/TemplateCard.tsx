import React from 'react';
import { Settings, Eye, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { DueDiligenceTemplate } from '../../../hooks/useDueDiligence';

interface Props {
  template: DueDiligenceTemplate;
  isActive: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

export default function TemplateCard({ template, isActive, onEdit, onPreview, onActivate, onDelete }: Props) {
  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isActive ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:shadow-md'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isActive ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="font-medium text-gray-900">{template.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPreview}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          {template.categories.length} categories configured
        </p>
        <p className="text-xs text-gray-500">
          Updated {new Date(template.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={onActivate}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Activate
          </button>
        )}
        {isActive && (
          <div className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded text-center">
            Active
          </div>
        )}
      </div>
    </div>
  );
}
