import { Route, Switch } from "wouter";
import { AuthProvider } from './contexts/AuthContext';
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';
import MainLayout from './components/layouts/MainLayout';

// Pages
import Dashboard from './pages/dashboard';
import StartupsList from './pages/startups/index';
import StartupDetail from './pages/startups/[id]';
import StartupNew from './pages/startups/new';
import DocumentsList from './pages/documents/index';
import DocumentDetail from './pages/documents/[id]';
import DocumentUpload from './pages/documents/upload';
import MemosList from './pages/memos/index';
import MemoDetail from './pages/memos/[id]';
import AiAssistant from './pages/ai-assistant/index';
import NotFound from './pages/not-found';

// Auth Pages
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';

function App() {
  return (
    <>
      <ClerkLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        </div>
      </ClerkLoading>
      
      <ClerkLoaded>
        <AuthProvider>
          <Switch>
            {/* Auth routes - no sidebar needed */}
            <Route path="/sign-in">
              <SignInPage />
            </Route>
            <Route path="/sign-in/*">
              <SignInPage />
            </Route>
            
            <Route path="/sign-up">
              <SignUpPage />
            </Route>
            <Route path="/sign-up/*">
              <SignUpPage />
            </Route>
            
            {/* Protected routes with MainLayout wrapper */}
            <Route path="/">
              <SignedIn>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn redirectUrl="/dashboard" />
              </SignedOut>
            </Route>
            
            <Route path="/dashboard">
              <SignedIn>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn redirectUrl="/dashboard" />
              </SignedOut>
            </Route>
            
            <Route path="/startups">
              <SignedIn>
                <MainLayout>
                  <StartupsList />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/startups/new">
              <SignedIn>
                <MainLayout>
                  <StartupNew />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/startups/:id">
              <SignedIn>
                <MainLayout>
                  <StartupDetail />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/documents">
              <SignedIn>
                <MainLayout>
                  <DocumentsList />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/documents/upload">
              <SignedIn>
                <MainLayout>
                  <DocumentUpload />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/documents/:id">
              <SignedIn>
                <MainLayout>
                  <DocumentDetail />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/memos">
              <SignedIn>
                <MainLayout>
                  <MemosList />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/memos/:id">
              <SignedIn>
                <MainLayout>
                  <MemoDetail />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/ai-assistant">
              <SignedIn>
                <MainLayout>
                  <AiAssistant />
                </MainLayout>
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            {/* 404 route */}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </AuthProvider>
      </ClerkLoaded>
    </>
  );
}

export default App;