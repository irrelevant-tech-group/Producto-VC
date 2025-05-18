import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Upload,
  Bot,
  Building2,
  ChevronRight,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

const QuickActions: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('essential');
  const [showMore, setShowMore] = useState(false);

  // Define actions based on the screenshot
  const actions = {
    essential: [
      {
        title: "New Memo",
        description: "Create an investment memo from existing data",
        icon: <FileText className="h-6 w-6 text-blue-600" />,
        href: "/memos/new"
      },
      {
        title: "New Document",
        description: "Add files to a startup's profile",
        icon: <Upload className="h-6 w-6 text-blue-600" />,
        href: "/documents"
      },
      {
        title: "AI Assistant",
        description: "Query your startup data with natural language",
        icon: <Bot className="h-6 w-6 text-blue-600" />,
        href: "/ai-assistant",
        badge: "AI"
      },
      {
        title: "Add Startup",
        description: "Create a new startup profile",
        icon: <Building2 className="h-6 w-6 text-blue-600" />,
        href: "/startups/new"
      }
    ],
    analysis: [
      // Análisis actions - simplified to match the screenshot
      {
        title: "View Analytics",
        description: "Track performance and alignment metrics",
        icon: <FileText className="h-6 w-6 text-blue-600" />,
        href: "/analytics"
      },
      {
        title: "Compare Startups",
        description: "Side-by-side comparison of portfolio companies",
        icon: <FileText className="h-6 w-6 text-blue-600" />,
        href: "/analytics/compare"
      }
    ]
  };

  // Current tab actions
  const currentActions = actions[activeCategory as keyof typeof actions] || actions.essential;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-800">
          Quick Actions
        </CardTitle>
        <Tabs defaultValue="essential" className="w-auto" onValueChange={setActiveCategory}>
          <TabsList className="h-7 bg-slate-100 p-0.5">
            <TabsTrigger value="essential" className="text-xs px-2 h-6">
              Essential
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs px-2 h-6">
              Analysis
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-2 h-6">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <a className="block p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all duration-150">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8">
                    {action.icon}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-blue-600">
                        {action.title}
                      </h4>
                      {action.badge && (
                        <Badge className="text-[10px] py-0 px-1.5 bg-emerald-100 text-emerald-800">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-3 flex items-start p-3 border border-slate-200 rounded-lg">
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-slate-800">Pro Tips</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-blue-600 hover:text-blue-800 p-0"
                onClick={() => setShowMore(!showMore)}
              >
                Show {showMore ? 'less' : 'more'}
                <ChevronRight className={`h-4 w-4 ml-1 transition-transform duration-200 ${showMore ? 'rotate-90' : ''}`} />
              </Button>
            </div>
            
            <div className="mt-1 text-xs text-slate-700">
              <p>Upload multiple documents at once for faster processing. The AI will automatically extract relevant information.</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-3 py-2 border-t border-slate-200">
        <Link href="/workflows">
          <a className="w-full">
            <Button variant="ghost" size="sm" className="w-full text-xs justify-between text-slate-600 hover:text-blue-800">
              View all actions
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </a>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default QuickActions;