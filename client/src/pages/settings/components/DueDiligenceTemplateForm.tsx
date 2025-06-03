import React, { useState } from 'react';
import { X, Plus, GripVertical, Trash2, AlertCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  useDefaultDDCategories,
  useCreateDDTemplate,
  useUpdateDDTemplate,
  DueDiligenceTemplate,
  DueDiligenceCategory,
} from '../../../hooks/useDueDiligence';

interface Props {
  template?: DueDiligenceTemplate;
  onClose: () => void;
  onSave: () => void;
}

export default function DueDiligenceTemplateForm({ template, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    categories: (template?.categories || []) as DueDiligenceCategory[],
  });

  const { data: defaultCategories } = useDefaultDDCategories();
  const createMutation = useCreateDDTemplate();
  const updateMutation = useUpdateDDTemplate();

  const handleAddCategory = () => {
    const newCategory: DueDiligenceCategory = {
      key: `category_${Date.now()}`,
      name: '',
      required: 1,
      importance: 'medium',
      description: '',
      order: formData.categories.length + 1,
      documentTypes: [],
      isDefault: false,
    };
    setFormData(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
  };

  const handleRemoveCategory = (index: number) => {
    const categoryToRemove = formData.categories[index];
    if (categoryToRemove.key === 'other') {
      alert('Cannot remove the "Other" category. It is required by the system.');
      return;
    }
    setFormData(prev => ({ ...prev, categories: prev.categories.filter((_, i) => i !== index) }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(formData.categories);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    const updated = items.map((cat, idx) => ({ ...cat, order: cat.key === 'other' ? 999 : idx + 1 }));
    setFormData(prev => ({ ...prev, categories: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Template name is required');
      return;
    }
    if (formData.categories.length === 0) {
      alert('At least one category is required');
      return;
    }
    const hasOther = formData.categories.some(c => c.key === 'other');
    let categories = [...formData.categories];
    if (!hasOther) {
      const otherCat = defaultCategories?.find(c => c.key === 'other');
      if (otherCat) categories.push(otherCat);
    }
    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, ...formData, categories });
      } else {
        await createMutation.mutateAsync({ ...formData, categories });
      }
      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{template ? 'Edit Template' : 'Create New Template'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Standard Due Diligence"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Document Categories</h3>
                  <p className="text-sm text-gray-600">Drag to reorder. The \"Other\" category is always required.</p>
                </div>
                <button type="button" onClick={handleAddCategory} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="categories">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {formData.categories.map((category, index) => (
                        <Draggable key={category.key} draggableId={category.key} index={index} isDragDisabled={category.key === 'other'}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border rounded-lg p-4 bg-white ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'} ${category.key === 'other' ? 'bg-gray-50 border-gray-300' : 'border-gray-200'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div {...provided.dragHandleProps} className={`mt-2 ${category.key === 'other' ? 'opacity-30' : 'cursor-grab'}`}> <GripVertical className="w-5 h-5 text-gray-400" /></div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                                    <input
                                      type="text"
                                      value={category.name}
                                      onChange={(e) => {
                                        const updated = [...formData.categories];
                                        updated[index] = { ...category, name: e.target.value };
                                        setFormData(prev => ({ ...prev, categories: updated }));
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="e.g., Financial Documents"
                                      disabled={category.key === 'other'}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Documents</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={category.required}
                                      onChange={(e) => {
                                        const updated = [...formData.categories];
                                        updated[index] = { ...category, required: parseInt(e.target.value) || 0 };
                                        setFormData(prev => ({ ...prev, categories: updated }));
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Importance Level</label>
                                    <select
                                      value={category.importance}
                                      onChange={(e) => {
                                        const updated = [...formData.categories];
                                        updated[index] = { ...category, importance: e.target.value as 'high' | 'medium' | 'low' };
                                        setFormData(prev => ({ ...prev, categories: updated }));
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="high">High Priority</option>
                                      <option value="medium">Medium Priority</option>
                                      <option value="low">Low Priority</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <input
                                      type="text"
                                      value={category.description}
                                      onChange={(e) => {
                                        const updated = [...formData.categories];
                                        updated[index] = { ...category, description: e.target.value };
                                        setFormData(prev => ({ ...prev, categories: updated }));
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Brief description of this category"
                                      disabled={category.key === 'other'}
                                    />
                                  </div>
                                </div>
                                {category.key !== 'other' && (
                                  <button type="button" onClick={() => handleRemoveCategory(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {category.key === 'other' && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                                  <AlertCircle className="w-4 h-4" />
                                  This is the system's default "Other" category and cannot be removed or renamed.
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

