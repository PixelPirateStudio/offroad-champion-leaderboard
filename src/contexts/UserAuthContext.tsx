import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { userApi, User, LoginCredentials, AppleLoginCredentials } from '@/services/userApi';

interface UserAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithApple: (credentials: AppleLoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export const UserAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      if (token) {
        // Try to validate the token
        const validatedUser = await userApi.validateToken();
        if (validatedUser) {
          setUser(validatedUser);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('userToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await userApi.login(credentials);

      // Store token
      localStorage.setItem('userToken', response.token);

      // Set user
      setUser(response.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async (credentials: AppleLoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await userApi.loginWithApple(credentials);

      // Store token
      localStorage.setItem('userToken', response.token);

      // Set user
      setUser(response.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Apple login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    userApi.logout();
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await userApi.refreshProfile();
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const value: UserAuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    loginWithApple,
    logout,
    refreshUser,
  };

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};

// Hook to require user authentication on a page
export const useRequireUserAuth = () => {
  const { isAuthenticated, isLoading } = useUserAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
};
