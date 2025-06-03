import { useActiveDDTemplate } from '@/hooks/useDueDiligence';
import { Progress } from '@/components/ui/progress';

export interface CategoryProgress {
  uploaded: number;
  required: number;
  completion: number;
  missingDocs: number;
  importance: 'high' | 'medium' | 'low';
  description?: string;
}

export interface DueDiligenceProgress {
  percentage: number;
  completedItems: number;
  totalItems: number;
  lastUpdated: string;
  categories: Record<string, CategoryProgress>;
}

export default function DueDiligenceProgress({ progress }: { progress: DueDiligenceProgress }) {
  const { data: activeTemplate } = useActiveDDTemplate();

  const getCategoryDisplayName = (key: string) => {
    const cat = activeTemplate?.categories.find(c => c.key === key);
    return cat?.name || key;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-base font-medium">Overall Progress</span>
          <span className="text-sm font-medium">{progress.percentage}%</span>
        </div>
        <Progress value={progress.percentage} className="h-2.5" />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{progress.completedItems} of {progress.totalItems} items completed</span>
          <span>Last updated: {progress.lastUpdated ? new Date(progress.lastUpdated).toLocaleDateString() : '—'}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(progress.categories).map(([key, cat]) => (
          <div key={key} className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <span className="text-sm font-medium">{getCategoryDisplayName(key)}</span>
                {cat.description && <p className="text-xs text-slate-500 mt-1">{cat.description}</p>}
              </div>
              <span className="text-xs font-medium px-2 py-0.5 bg-white rounded-full border border-slate-200">
                {cat.uploaded}/{cat.required}
              </span>
            </div>
            <Progress value={cat.completion} className="h-1.5" />
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">
                {cat.completion === 100 ? 'Complete' : cat.missingDocs > 0 ? `${cat.missingDocs} missing` : 'In progress'}
              </span>
              <span className="font-medium text-slate-700">{cat.completion}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
