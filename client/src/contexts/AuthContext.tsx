import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { apiRequest, setAuthToken } from '../lib/queryClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  verifyToken: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerk();
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verify the token with your backend
  const verifyToken = async () => {
    if (!isSignedIn || !clerkUser) {
      setUser(null);
      setIsLoading(false);
      setAuthToken(null);
      return;
    }

    try {
      setIsLoading(true);
      // Get JWT token from Clerk
      const token = await getToken();
      
      // Store token for future API requests
      if (token) {
        setAuthToken(token);
      }
      
      // Verify token with your backend
      const response = await apiRequest('POST', '/api/auth/verify', { token });
      const userData = await response.json();
      
      setUser(userData);
    } catch (error) {
      console.error('Error verifying token:', error);
      // Even if verification fails, we still have a Clerk user
      // so we'll set a minimal user object
      setUser({
        id: 'temp',
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Log out the user
  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setAuthToken(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Update token when needed
  const updateAuthToken = async () => {
    if (isSignedIn && clerkUser) {
      try {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      } catch (error) {
        console.error('Error getting token:', error);
      }
    } else {
      setAuthToken(null);
    }
  };

  // Verify token when Clerk loads or when the user changes
  useEffect(() => {
    if (isClerkLoaded) {
      verifyToken();
    }
  }, [isClerkLoaded, isSignedIn, clerkUser?.id]);

  // Also set up a periodic token refresh
  useEffect(() => {
    if (isSignedIn) {
      // Update token immediately
      updateAuthToken();
      
      // Set a timer to regularly refresh token
      const tokenRefreshInterval = setInterval(updateAuthToken, 15 * 60 * 1000); // 15 minutes
      
      return () => clearInterval(tokenRefreshInterval);
    }
  }, [isSignedIn, clerkUser?.id]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        isLoading,
        verifyToken,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};