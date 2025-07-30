import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import pb from '../lib/pocketbase';
import type { User, AuthState } from '../lib/types';
import { UserSchema } from '../lib/schemas';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if there's a valid auth token
        if (pb.authStore.isValid) {
          // Refresh the auth token to ensure it's still valid
          await pb.collection('users').authRefresh();
          
          // Validate and set user data
          const userData = pb.authStore.model;
          if (userData) {
            const validatedUser = UserSchema.parse(userData);
            setUser(validatedUser);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Clear invalid auth data
        pb.authStore.clear();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for auth store changes
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (token && model) {
        try {
          const validatedUser = UserSchema.parse(model);
          setUser(validatedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Invalid user data:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Authenticate with Pocketbase
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      if (authData.record) {
        const validatedUser = UserSchema.parse(authData.record);
        setUser(validatedUser);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Sign in failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Create new user account
      const userData = {
        name,
        email,
        password,
        passwordConfirm: password,
      };
      
      await pb.collection('users').create(userData);
      
      // Automatically sign in the new user
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      if (authData.record) {
        const validatedUser = UserSchema.parse(authData.record);
        setUser(validatedUser);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Sign up failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Clear auth store
      pb.authStore.clear();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      if (pb.authStore.isValid) {
        await pb.collection('users').authRefresh();
        
        const userData = pb.authStore.model;
        if (userData) {
          const validatedUser = UserSchema.parse(userData);
          setUser(validatedUser);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      pb.authStore.clear();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
