// ProtectedRoute.tsx corregido
import { ReactNode, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useLocation } from 'wouter';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useUser();
  const { isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Función para redirigir al inicio de sesión
  const redirectToSignIn = () => {
    setLocation('/sign-in');
  };

  // Efecto para redirigir si no está autenticado
  useEffect(() => {
    if (isLoaded && !isLoading && !isSignedIn) {
      redirectToSignIn();
    }
  }, [isLoaded, isLoading, isSignedIn]);

  // Show loading spinner when checking auth state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-600">Loading...</span>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return null;
  }

  // Also check our backend verification
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Authentication Failed</h1>
          <p className="text-slate-600 mb-4">
            You are signed in with Clerk, but we couldn't verify your account with our system.
          </p>
          <button
            onClick={redirectToSignIn}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  // If all checks pass, render the children
  return <>{children}</>;
}