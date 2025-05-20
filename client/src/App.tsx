import { Route, Switch } from "wouter";
import { AuthProvider } from './contexts/AuthContext';
import { ClerkLoaded, ClerkLoading, SignIn, SignUp, RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';

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
import ProtectedRoute from "./ProtectedRoute";

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
            {/* Auth routes */}
            <Route path="/sign-in">
              <SignInPage />
            </Route>
            <Route path="/sign-in/*">
              {/* Handle any nested sign-in routes */}
              <SignInPage />
            </Route>
            
            <Route path="/sign-up">
              <SignUpPage />
            </Route>
            <Route path="/sign-up/*">
              {/* Handle any nested sign-up routes */}
              <SignUpPage />
            </Route>
            
            {/* Protected routes */}
            <Route path="/">
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn redirectUrl="/dashboard" />
              </SignedOut>
            </Route>
            
            <Route path="/dashboard">
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn redirectUrl="/dashboard" />
              </SignedOut>
            </Route>
            
            <Route path="/startups">
              <SignedIn>
                <StartupsList />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/startups/new">
              <SignedIn>
                <StartupNew />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/startups/:id">
              <SignedIn>
                <StartupDetail />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/documents">
              <SignedIn>
                <DocumentsList />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/documents/upload">
              <SignedIn>
                <DocumentUpload />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/documents/:id">
              <SignedIn>
                <DocumentDetail />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/memos">
              <SignedIn>
                <MemosList />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/memos/:id">
              <SignedIn>
                <MemoDetail />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </Route>
            
            <Route path="/ai-assistant">
              <SignedIn>
                <AiAssistant />
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