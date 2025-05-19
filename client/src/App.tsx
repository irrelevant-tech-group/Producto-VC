import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import MainLayout from "@/components/layouts/MainLayout";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import StartupsList from "@/pages/startups/index";
import StartupNew from "@/pages/startups/new";
import StartupDetail from "@/pages/startups/[id]";
import DocumentsList from "@/pages/documents/index";
import DocumentUpload from "@/pages/documents/upload";
import MemosList from "@/pages/memos/index";
import MemoDetail from "@/pages/memos/[id]";
import AiAssistant from "@/pages/ai-assistant";
import DocumentDetail from "@/pages/documents/[id]";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/startups" component={StartupsList} />
      <Route path="/startups/new" component={StartupNew} />
      <Route path="/startups/:id" component={StartupDetail} />
      <Route path="/documents/upload" component={DocumentUpload} />
      <Route path="/documents" component={DocumentsList} />
      <Route path="/memos" component={MemosList} />
      <Route path="/documents/:id" component={DocumentDetail} />
      <Route path="/memos/:id" component={MemoDetail} />
      <Route path="/ai-assistant" component={AiAssistant} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <MainLayout>
            <Router />
          </MainLayout>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
