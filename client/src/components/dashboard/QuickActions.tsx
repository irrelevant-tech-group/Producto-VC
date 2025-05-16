import { Link } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  FileText,
  Upload,
  MessageCircle,
  BarChart2,
  Info
} from 'lucide-react';

const QuickActions: React.FC = () => {
  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-secondary-200">
        <CardTitle className="text-lg font-medium leading-6 text-secondary-900">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="space-y-4">
          <Link href="/memos/new">
            <a className="block p-3 rounded-lg border border-secondary-300 hover:border-primary-500 hover:bg-primary-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-secondary-900">Generate New Memo</h4>
                  <p className="text-xs text-secondary-500">Create an investment memo from existing data</p>
                </div>
              </div>
            </a>
          </Link>

          <Link href="/documents">
            <a className="block p-3 rounded-lg border border-secondary-300 hover:border-primary-500 hover:bg-primary-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Upload className="h-6 w-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-secondary-900">Upload Documents</h4>
                  <p className="text-xs text-secondary-500">Add files to a startup's profile</p>
                </div>
              </div>
            </a>
          </Link>

          <Link href="/ai-assistant">
            <a className="block p-3 rounded-lg border border-secondary-300 hover:border-primary-500 hover:bg-primary-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-secondary-900">Ask AI Assistant</h4>
                  <p className="text-xs text-secondary-500">Query your startup data with natural language</p>
                </div>
              </div>
            </a>
          </Link>

          <Link href="/analytics">
            <a className="block p-3 rounded-lg border border-secondary-300 hover:border-primary-500 hover:bg-primary-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart2 className="h-6 w-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-secondary-900">View Analytics</h4>
                  <p className="text-xs text-secondary-500">Track performance and alignment metrics</p>
                </div>
              </div>
            </a>
          </Link>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-primary-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary-800">Pro tip</h3>
              <div className="mt-2 text-xs text-primary-700">
                <p>Try uploading multiple documents at once for faster processing. The AI will automatically extract relevant information.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
